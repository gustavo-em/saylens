package com.margelo.nitro.saylensobjectdetector

import android.app.ActivityManager
import android.content.Context
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.os.Build
import android.os.Process
import android.os.SystemClock
import android.util.Log
import androidx.camera.core.ImageProxy
import com.facebook.proguard.annotations.DoNotStrip
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.ImageProcessingOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetector
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetectorResult
import com.margelo.nitro.NitroModules
import com.margelo.nitro.camera.HybridFrameSpec
import com.margelo.nitro.camera.public.NativeFrame
import java.nio.ByteBuffer
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

@DoNotStrip
class SayLensObjectDetector : HybridSayLensObjectDetectorSpec() {
  @Volatile private var latestBatch: NativeDetectionBatch? = null
  @Volatile private var latestSequence = -1L
  private var lastDeliveredSequence = -1L

  private var compactRgbaBuffer: ByteBuffer? = null
  private var nextWorkerIndex = 0
  private var performanceWindowCompleted = 0
  private var performanceWindowStartedAtNanos = 0L
  private val cpuDetectorCreationLock = Any()
  private val nextSequence = AtomicLong()
  private val performanceCapabilities = resolvePerformanceCapabilities()
  private var cpuWorkerCount = performanceCapabilities.recommendedCpuWorkerCount
  private var gpuWorkerCount = if (performanceCapabilities.supportsGpuDelegate) {
    MAX_GPU_WORKERS
  } else {
    MIN_GPU_WORKERS
  }
  @Volatile private var workers = createWorkers(cpuWorkerCount, gpuWorkerCount)

  override fun getModelName(): String = MODEL_NAME

  override fun getRecommendedPerformanceProfile(): String =
    performanceCapabilities.recommendedProfile

  override fun getSupportedPerformanceProfiles(): Array<String> =
    performanceCapabilities.supportedProfiles

  override fun getRecommendedCpuWorkerCount(): Double =
    performanceCapabilities.recommendedCpuWorkerCount.toDouble()

  override fun getSupportsGpuDelegate(): Boolean =
    performanceCapabilities.supportsGpuDelegate

  @Synchronized
  override fun configureWorkers(
    cpuWorkerCount: Double,
    gpuWorkerCount: Double,
  ) {
    val normalizedCpuCount = cpuWorkerCount.toInt().coerceIn(
      MIN_CPU_WORKERS,
      performanceCapabilities.maxCpuWorkerCount,
    )
    val normalizedGpuCount = if (performanceCapabilities.supportsGpuDelegate) {
      gpuWorkerCount.toInt().coerceIn(MIN_GPU_WORKERS, MAX_GPU_WORKERS)
    } else {
      MIN_GPU_WORKERS
    }
    if (
      normalizedCpuCount == this.cpuWorkerCount &&
      normalizedGpuCount == this.gpuWorkerCount
    ) return

    val previousWorkers = workers
    this.cpuWorkerCount = normalizedCpuCount
    this.gpuWorkerCount = normalizedGpuCount
    workers = createWorkers(normalizedCpuCount, normalizedGpuCount)
    nextWorkerIndex = 0
    performanceWindowCompleted = 0
    performanceWindowStartedAtNanos = 0L
    previousWorkers.forEach(DetectorWorker::close)
    Log.i(
      TAG,
      "Detector reconfigured with $normalizedCpuCount CPU workers and " +
        "$normalizedGpuCount GPU workers.",
    )
  }

  @Synchronized
  override fun detect(frame: HybridFrameSpec): NativeDetectionBatch? {
    val nativeFrame = frame as? NativeFrame
      ?: error("SayLens detector requires a native VisionCamera frame.")
    val imageProxy = nativeFrame.image
    val rotationDegrees = imageProxy.imageInfo.rotationDegrees
    val latestUndeliveredBatch = takeLatestBatch()
    val pendingFrame = PendingFrame(
      sequence = nextSequence.getAndIncrement(),
      width = imageProxy.width,
      height = imageProxy.height,
      rotationDegrees = rotationDegrees,
      startedAtNanos = SystemClock.elapsedRealtimeNanos(),
    )

    val workerCount = workers.size
    repeat(workerCount) { offset ->
      val workerIndex = (nextWorkerIndex + offset) % workerCount
      if (workers[workerIndex].trySubmit(imageProxy, pendingFrame)) {
        nextWorkerIndex = (workerIndex + 1) % workerCount
        return latestUndeliveredBatch
      }
    }

    return latestUndeliveredBatch
  }

  @Synchronized
  override fun close() {
    workers.forEach(DetectorWorker::close)
    workers = emptyArray()
    latestBatch = null
    latestSequence = -1L
    lastDeliveredSequence = -1L
    compactRgbaBuffer = null
  }

  private fun takeLatestBatch(): NativeDetectionBatch? {
    if (latestSequence <= lastDeliveredSequence) return null

    lastDeliveredSequence = latestSequence
    return latestBatch
  }

  @Synchronized
  private fun copyFrameToBitmap(imageProxy: ImageProxy, bitmap: Bitmap) {
    require(imageProxy.format == PixelFormat.RGBA_8888) {
      "SayLens detector requires RGBA_8888 frames."
    }

    val width = imageProxy.width
    val height = imageProxy.height
    val rowSize = width * RGBA_BYTES_PER_PIXEL
    val plane = imageProxy.planes.single()
    require(plane.pixelStride == RGBA_BYTES_PER_PIXEL) {
      "Unexpected RGBA pixel stride: ${plane.pixelStride}."
    }

    val source = plane.buffer
    source.rewind()

    if (plane.rowStride == rowSize) {
      bitmap.copyPixelsFromBuffer(source)
      return
    }

    val compactBuffer = getOrCreateCompactBuffer(rowSize * height)
    compactBuffer.clear()
    val originalLimit = source.limit()

    repeat(height) { row ->
      val rowStart = row * plane.rowStride
      source.position(rowStart)
      source.limit(rowStart + rowSize)
      compactBuffer.put(source)
    }

    source.limit(originalLimit)
    source.rewind()
    compactBuffer.flip()
    bitmap.copyPixelsFromBuffer(compactBuffer)
  }

  private fun getOrCreateCompactBuffer(capacity: Int): ByteBuffer {
    compactRgbaBuffer?.takeIf { it.capacity() == capacity }?.let { return it }

    return ByteBuffer.allocateDirect(capacity).also {
      compactRgbaBuffer = it
    }
  }

  @Synchronized
  private fun publishResult(frame: PendingFrame, batch: NativeDetectionBatch) {
    recordThroughput(batch.inferenceTimeMs)
    if (frame.sequence <= latestSequence) return

    latestSequence = frame.sequence
    latestBatch = batch
  }

  private fun recordThroughput(inferenceTimeMs: Double) {
    val now = SystemClock.elapsedRealtimeNanos()
    if (performanceWindowStartedAtNanos == 0L) {
      performanceWindowStartedAtNanos = now
    }
    performanceWindowCompleted += 1
    val elapsedNanos = now - performanceWindowStartedAtNanos
    if (elapsedNanos < PERFORMANCE_LOG_INTERVAL_NANOS) return

    val inferencesPerSecond =
      performanceWindowCompleted * NANOSECONDS_PER_SECOND / elapsedNanos
    Log.i(
      TAG,
      "Detector throughput: %.1f fps; latest latency: %.0f ms."
        .format(inferencesPerSecond, inferenceTimeMs),
    )
    performanceWindowStartedAtNanos = now
    performanceWindowCompleted = 0
  }

  private fun mapResult(
    result: ObjectDetectorResult,
    frame: PendingFrame,
  ): NativeDetectionBatch {
    val detections = result.detections().mapNotNull { detection ->
      val category = detection.categories().maxByOrNull { it.score() }
        ?: return@mapNotNull null
      val box = detection.boundingBox()

      NativeDetection(
        label = category.categoryName(),
        score = category.score().toDouble(),
        boundingBox = NativeDetectionBox(
          left = box.left.toDouble(),
          top = box.top.toDouble(),
          right = box.right.toDouble(),
          bottom = box.bottom.toDouble(),
        ),
      )
    }.toTypedArray()
    val inferenceTimeMs =
      (SystemClock.elapsedRealtimeNanos() - frame.startedAtNanos) /
        NANOSECONDS_PER_MILLISECOND

    return NativeDetectionBatch(
      detections = detections,
      frameWidth = frame.width.toDouble(),
      frameHeight = frame.height.toDouble(),
      rotationDegrees = frame.rotationDegrees.toDouble(),
      inferenceTimeMs = inferenceTimeMs,
    )
  }

  @Synchronized
  private fun createWorkers(
    cpuWorkerCount: Int,
    gpuWorkerCount: Int,
  ): Array<DetectorWorker> {
    val workers = mutableListOf<DetectorWorker>()
    val cpuThreadPriority = if (
      cpuWorkerCount == POWER_SAVING_CPU_WORKERS &&
      gpuWorkerCount == MIN_GPU_WORKERS
    ) {
      Process.THREAD_PRIORITY_BACKGROUND
    } else {
      Process.THREAD_PRIORITY_MORE_FAVORABLE
    }
    repeat(cpuWorkerCount) {
      workers += DetectorWorker(
        id = workers.size + 1,
        preferredDelegate = Delegate.CPU,
        prewarm = true,
        threadPriority = cpuThreadPriority,
      )
    }
    repeat(gpuWorkerCount) {
      workers += DetectorWorker(
        id = workers.size + 1,
        preferredDelegate = Delegate.GPU,
        prewarm = true,
        threadPriority = Process.THREAD_PRIORITY_MORE_FAVORABLE,
      )
    }
    return workers.toTypedArray()
  }

  private fun resolvePerformanceCapabilities(): DevicePerformanceCapabilities {
    val maximumCpuWorkerCount = resolveMaximumCpuWorkerCount()
    val supportsGpuDelegate = resolveGpuDelegateSupport()

    return DevicePerformanceCapabilities(
      maxCpuWorkerCount = maximumCpuWorkerCount,
      recommendedCpuWorkerCount = maximumCpuWorkerCount,
      recommendedProfile = MAXIMUM_PERFORMANCE_PROFILE,
      supportedProfiles = arrayOf(
        MAXIMUM_PERFORMANCE_PROFILE,
        POWER_SAVING_PROFILE,
      ),
      supportsGpuDelegate = supportsGpuDelegate,
    )
  }

  /**
   * Maximum performance uses every core the device reports, capped at six.
   * On the eight-core Galaxy J6, six workers sustain 10.3-13.3 inferences per
   * second while eight add no throughput and make each result 150-250 ms
   * older, which is what makes a moving overlay feel detached from the image.
   * The remaining cores stay available to the camera and UI pipelines.
   */
  private fun resolveMaximumCpuWorkerCount(): Int {
    val availableProcessors = Runtime.getRuntime().availableProcessors()
    val workerCount = availableProcessors.coerceIn(
      MIN_CPU_WORKERS,
      MAX_CPU_WORKERS,
    )

    Log.i(
      TAG,
      "Maximum CPU workers: $workerCount of $availableProcessors cores.",
    )
    return workerCount
  }

  /**
   * The GPU delegate is only offered when the device can run it without
   * killing the process. A 32-bit process has neither the address space nor
   * the driver headroom for an extra OpenCL context beside the CPU workers,
   * and a delegate that aborts the process cannot be caught in Kotlin. Static
   * compatibility is therefore combined with a persisted probe that survives
   * such a crash and blocks the delegate on the next launch.
   */
  private fun resolveGpuDelegateSupport(): Boolean {
    // MediaPipe's GPU path has aborted the process on every device tested so
    // far: SIGBUS on the J6's 32-bit stack, and SIGBUS on the arm64 SM-M536B
    // inside the drishti GL runner while the delegate is still being built.
    // The CPU pool already saturates both devices, so the delegate stays off
    // until a device is measured running it. Flip this to re-test.
    if (!GPU_DELEGATE_ENABLED) {
      Log.i(TAG, "GPU delegate disabled: no tested device runs it safely.")
      return false
    }

    if (Build.SUPPORTED_64_BIT_ABIS.isEmpty() || !Process.is64Bit()) {
      Log.i(
        TAG,
        "GPU delegate disabled: the process runs 32-bit native code.",
      )
      return false
    }

    val context = NitroModules.applicationContext ?: return false
    val activityManager = context.getSystemService(
      Context.ACTIVITY_SERVICE,
    ) as? ActivityManager
    val openGlEsVersion = activityManager
      ?.deviceConfigurationInfo
      ?.reqGlEsVersion
      ?: 0
    if (openGlEsVersion < MIN_GPU_DELEGATE_GL_ES_VERSION) {
      Log.i(
        TAG,
        "GPU delegate disabled: OpenGL ES support is below 3.1.",
      )
      return false
    }

    val preferences = gpuDelegatePreferences(context) ?: return false
    if (preferences.getBoolean(GPU_DELEGATE_BLOCKED_KEY, false)) {
      Log.i(TAG, "GPU delegate disabled: this device failed a previous probe.")
      return false
    }
    if (preferences.getBoolean(GPU_DELEGATE_VERIFIED_KEY, false)) return true

    val failedProbes = preferences.getInt(GPU_DELEGATE_FAILED_PROBES_KEY, 0)
    if (failedProbes == 0) return true
    if (failedProbes < GPU_DELEGATE_PROBE_ATTEMPT_LIMIT) {
      Log.w(
        TAG,
        "Retrying the GPU delegate after $failedProbes incomplete probe(s).",
      )
      return true
    }

    blockGpuDelegate("$failedProbes GPU probes never completed")
    return false
  }

  private fun gpuDelegatePreferences(
    context: Context? = NitroModules.applicationContext,
  ): SharedPreferences? = context?.getSharedPreferences(
    GPU_DELEGATE_PREFERENCES_NAME,
    Context.MODE_PRIVATE,
  )

  /**
   * Records that a GPU inference is about to run. The write is synchronous
   * because the driver may terminate the process before an asynchronous
   * commit lands, and the counter is what tells the next launch that the
   * previous probe never returned.
   */
  private fun beginGpuDelegateProbe() {
    val preferences = gpuDelegatePreferences() ?: return
    if (preferences.getBoolean(GPU_DELEGATE_VERIFIED_KEY, false)) return

    val failedProbes = preferences.getInt(GPU_DELEGATE_FAILED_PROBES_KEY, 0)
    preferences.edit()
      .putInt(GPU_DELEGATE_FAILED_PROBES_KEY, failedProbes + 1)
      .commit()
  }

  private fun completeGpuDelegateProbe() {
    val preferences = gpuDelegatePreferences() ?: return

    preferences.edit()
      .putBoolean(GPU_DELEGATE_VERIFIED_KEY, true)
      .putInt(GPU_DELEGATE_FAILED_PROBES_KEY, 0)
      .apply()
    Log.i(TAG, "GPU delegate verified on this device.")
  }

  private fun blockGpuDelegate(reason: String) {
    Log.w(TAG, "Blocking the GPU delegate on this device: $reason.")
    gpuDelegatePreferences()
      ?.edit()
      ?.putBoolean(GPU_DELEGATE_BLOCKED_KEY, true)
      ?.apply()
  }

  private fun createDetector(workerId: Int, delegate: Delegate): ObjectDetector {
    return if (delegate == Delegate.CPU) {
      synchronized(cpuDetectorCreationLock) {
        createDetectorWithoutLock(workerId, delegate)
      }
    } else {
      createDetectorWithoutLock(workerId, delegate)
    }
  }

  private fun createDetectorWithoutLock(
    workerId: Int,
    delegate: Delegate,
  ): ObjectDetector {
    Log.i(TAG, "Initializing object detector worker $workerId with $delegate.")
    val context = NitroModules.applicationContext
      ?: error("React Native application context is not available.")
    val baseOptions = BaseOptions.builder()
      .setDelegate(delegate)
      .setModelAssetPath(MODEL_ASSET_PATH)
      .build()
    val options = ObjectDetector.ObjectDetectorOptions.builder()
      .setBaseOptions(baseOptions)
      .setRunningMode(RunningMode.IMAGE)
      .setMaxResults(MAX_RESULTS)
      .setScoreThreshold(DEFAULT_SCORE_THRESHOLD)
      .build()

    return ObjectDetector.createFromOptions(context, options).also {
      Log.i(
        TAG,
        "Object detector worker $workerId initialized with $delegate delegate " +
          "using $MODEL_NAME.",
      )
    }
  }

  private inner class DetectorWorker(
    private val id: Int,
    preferredDelegate: Delegate,
    prewarm: Boolean,
    threadPriority: Int,
  ) {
    private val busy = AtomicBoolean(false)
    private val closed = AtomicBoolean(false)
    private var detector: ObjectDetector? = null
    private var hasLoggedFirstResult = false
    private var hasVerifiedGpuDelegate = false
    private var inputBitmap: Bitmap? = null
    private var activeDelegate = preferredDelegate
    private val executor = Executors.newSingleThreadExecutor { runnable ->
      Thread(
        {
          Process.setThreadPriority(threadPriority)
          runnable.run()
        },
        "$TAG-$id",
      )
    }

    init {
      if (prewarm) {
        executor.execute {
          val startedAtNanos = SystemClock.elapsedRealtimeNanos()
          try {
            getOrCreateDetector()
            val elapsedMs =
              (SystemClock.elapsedRealtimeNanos() - startedAtNanos) /
                NANOSECONDS_PER_MILLISECOND
            Log.i(TAG, "Detector worker $id prewarmed in %.0f ms.".format(elapsedMs))
          } catch (error: RuntimeException) {
            Log.w(TAG, "Could not prewarm detector worker $id.", error)
          }
        }
      }
    }

    fun trySubmit(imageProxy: ImageProxy, frame: PendingFrame): Boolean {
      if (!busy.compareAndSet(false, true)) return false

      return try {
        val bitmap = getOrCreateBitmap(imageProxy.width, imageProxy.height)
        copyFrameToBitmap(imageProxy, bitmap)
        executor.execute { runInference(bitmap, frame) }
        true
      } catch (error: RuntimeException) {
        Log.w(TAG, "Could not submit a frame to detector worker $id.", error)
        busy.set(false)
        false
      }
    }

    fun close() {
      if (!closed.compareAndSet(false, true)) return

      executor.execute {
        closeDetectorSafely()
        detector = null
        inputBitmap?.recycle()
        inputBitmap = null
      }
      executor.shutdown()
    }

    private fun runInference(bitmap: Bitmap, frame: PendingFrame) {
      val image = BitmapImageBuilder(bitmap).build()

      try {
        val processingOptions = ImageProcessingOptions.builder()
          .setRotationDegrees(frame.rotationDegrees)
          .build()
        val activeDetector = getOrCreateDetector()
        val isGpuProbe =
          activeDelegate == Delegate.GPU && !hasVerifiedGpuDelegate
        if (isGpuProbe) {
          beginGpuDelegateProbe()
        }
        val result = activeDetector.detect(image, processingOptions)
        if (isGpuProbe) {
          hasVerifiedGpuDelegate = true
          completeGpuDelegateProbe()
        }
        val batch = mapResult(result, frame)
        publishResult(frame, batch)
        if (!hasLoggedFirstResult) {
          hasLoggedFirstResult = true
          Log.i(
            TAG,
            "Object detector worker $id completed its first inference in " +
              "${batch.inferenceTimeMs.toInt()} ms at ${frame.width}x" +
              "${frame.height}.",
          )
        }
      } catch (error: RuntimeException) {
        if (activeDelegate == Delegate.GPU) {
          fallbackToCpu(error)
        } else {
          Log.w(TAG, "CPU inference failed on worker $id.", error)
        }
      } finally {
        image.close()
        busy.set(false)
      }
    }

    private fun getOrCreateBitmap(width: Int, height: Int): Bitmap {
      inputBitmap?.takeIf {
        !it.isRecycled && it.width == width && it.height == height
      }?.let {
        return it
      }

      inputBitmap?.takeUnless(Bitmap::isRecycled)?.recycle()
      return Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).also {
        inputBitmap = it
      }
    }

    private fun getOrCreateDetector(): ObjectDetector {
      detector?.let { return it }

      val isGpuProbe = activeDelegate == Delegate.GPU && !hasVerifiedGpuDelegate
      if (isGpuProbe) {
        beginGpuDelegateProbe()
      }

      return try {
        createDetector(id, activeDelegate).also {
          detector = it
        }
      } catch (error: RuntimeException) {
        if (activeDelegate != Delegate.GPU) throw error

        fallbackToCpu(error)
        createDetector(id, activeDelegate).also {
          detector = it
        }
      }
    }

    private fun fallbackToCpu(error: RuntimeException) {
      Log.w(
        TAG,
        "GPU unavailable for detector worker $id; falling back to CPU.",
        error,
      )
      activeDelegate = Delegate.CPU
      blockGpuDelegate("worker $id could not use the GPU delegate")
      closeDetectorSafely()
      detector = null
    }

    private fun closeDetectorSafely() {
      try {
        detector?.close()
      } catch (closeError: RuntimeException) {
        Log.w(TAG, "Could not close detector worker $id cleanly.", closeError)
      }
    }
  }

  private companion object {
    const val TAG = "SayLensDetector"
    const val MODEL_NAME = "EfficientDet-Lite0 int8"
    const val MODEL_ASSET_PATH = "efficientdet_lite0_int8.tflite"
    const val MAXIMUM_PERFORMANCE_PROFILE = "maximum-performance"
    const val POWER_SAVING_PROFILE = "power-saving"
    const val MIN_CPU_WORKERS = 1
    const val MAX_CPU_WORKERS = 6
    const val POWER_SAVING_CPU_WORKERS = 1
    const val MIN_GPU_WORKERS = 0
    const val MAX_GPU_WORKERS = 1
    const val MIN_GPU_DELEGATE_GL_ES_VERSION = 0x00030001
    const val GPU_DELEGATE_PREFERENCES_NAME = "saylens-detector"
    const val GPU_DELEGATE_BLOCKED_KEY = "gpu-delegate-blocked"
    const val GPU_DELEGATE_VERIFIED_KEY = "gpu-delegate-verified"
    const val GPU_DELEGATE_FAILED_PROBES_KEY = "gpu-delegate-failed-probes"
    const val GPU_DELEGATE_ENABLED = false
    const val GPU_DELEGATE_PROBE_ATTEMPT_LIMIT = 1
    const val MAX_RESULTS = 5
    /**
     * What the model has to be sure of before a box is reported at all. The
     * interface asks for more than this again before it puts a word on screen:
     * a small model is confidently wrong now and then, and a learner remembers
     * a wrong word far longer than a right one.
     */
    const val DEFAULT_SCORE_THRESHOLD = 0.65f
    const val RGBA_BYTES_PER_PIXEL = 4
    const val NANOSECONDS_PER_MILLISECOND = 1_000_000.0
    const val NANOSECONDS_PER_SECOND = 1_000_000_000.0
    const val PERFORMANCE_LOG_INTERVAL_NANOS = 5_000_000_000L
  }

  private data class PendingFrame(
    val sequence: Long,
    val width: Int,
    val height: Int,
    val rotationDegrees: Int,
    val startedAtNanos: Long,
  )

  private data class DevicePerformanceCapabilities(
    val maxCpuWorkerCount: Int,
    val recommendedCpuWorkerCount: Int,
    val recommendedProfile: String,
    val supportedProfiles: Array<String>,
    val supportsGpuDelegate: Boolean,
  )
}
