package com.margelo.nitro.lesingoobjectdetector

import android.app.ActivityManager
import android.content.Context
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.graphics.Matrix
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
import com.google.mediapipe.tasks.vision.imageclassifier.ImageClassifier
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
class LesingoObjectDetector : HybridLesingoObjectDetectorSpec() {
  @Volatile private var latestBatch: NativeDetectionBatch? = null
  @Volatile private var latestSequence = -1L
  private var lastDeliveredSequence = -1L

  private var compactRgbaBuffer: ByteBuffer? = null
  private var nextWorkerIndex = 0
  private var performanceWindowCompleted = 0
  private var performanceWindowStartedAtNanos = 0L
  private val cpuModelCreationLock = Any()
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
      ?: error("Lesingo detector requires a native VisionCamera frame.")
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
      "Lesingo detector requires RGBA_8888 frames."
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
    names: List<String?>,
    frame: PendingFrame,
  ): NativeDetectionBatch {
    val detections = result.detections().mapIndexedNotNull { index, detection ->
      val category = detection.categories().maxByOrNull { it.score() }
        ?: return@mapIndexedNotNull null
      val box = detection.boundingBox()

      NativeDetection(
        // The detector's own name is the identity, always. It comes from
        // eighty classes and says the same thing about the same object frame
        // after frame, which is what a track is matched on.
        label = category.categoryName(),
        // The classifier's name rides along for display. It is better and it
        // is unstable, and letting it be the identity meant every time it
        // changed its mind the track broke and the card had to be earned
        // again from zero.
        refinedLabel = names.getOrNull(index),
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
   * The detector takes half the cores; the camera pipeline, the tracker and
   * the interface get the other half. A weak device gives up fewer still.
   *
   * This used to take every core the device reported, capped at six, and the
   * cap was paid for with throughput: six workers were measured at 10.3-13.3
   * inferences per second on the eight-core Galaxy J6, and four was tried and
   * reverted because a third fewer readings per second was a third longer
   * before the tracker could earn a card.
   *
   * Both halves of that argument have since moved. The readings a card costs
   * no longer scale with the detector's rate — the tracker's rungs carry a
   * time floor, so a slower detector is no longer a slower word. And the six
   * workers themselves are what heat the phone that then throttles them: on
   * the same J6 they hold 8.6 inferences per second at 504% CPU while the
   * processor climbs from 35.5 °C to 49.0 °C in forty seconds, and at 49 °C
   * the same six deliver 5.7. The configuration cannot hold its own number.
   *
   * So the cap is now what the device can sustain rather than what it can
   * momentarily reach, and a device with little memory — every phone measured
   * here that throttled inside a minute — is held to three.
   */
  private fun resolveMaximumCpuWorkerCount(): Int {
    val availableProcessors = Runtime.getRuntime().availableProcessors()
    val ceiling =
      if (isWeakDevice()) WEAK_DEVICE_MAX_CPU_WORKERS else MAX_CPU_WORKERS
    val workerCount = (availableProcessors / 2).coerceIn(
      MIN_CPU_WORKERS,
      ceiling,
    )

    Log.i(
      TAG,
      "Maximum CPU workers: $workerCount of $availableProcessors cores, " +
        "ceiling $ceiling.",
    )
    return workerCount
  }

  /**
   * A device that cannot carry six workers without throttling. Android's own
   * low-RAM flag is the first authority, because a device that declares itself
   * small has already been told so by its manufacturer; total memory is the
   * fallback for a device that carries the memory of a weak phone without
   * setting the flag, which is what the Galaxy J6 does with its 3 GB.
   */
  private fun isWeakDevice(): Boolean {
    val context = NitroModules.applicationContext ?: return true
    val activityManager = context.getSystemService(
      Context.ACTIVITY_SERVICE,
    ) as? ActivityManager ?: return true

    if (activityManager.isLowRamDevice) return true

    val memoryInfo = ActivityManager.MemoryInfo()
    activityManager.getMemoryInfo(memoryInfo)
    return memoryInfo.totalMem in 1 until WEAK_DEVICE_MEMORY_BYTES
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
      synchronized(cpuModelCreationLock) {
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
    private var labeller: ImageClassifier? = null
    private var hasLoggedFirstResult = false
    private var hasVerifiedGpuDelegate = false
    private var inputBitmap: Bitmap? = null

    /** Set when the worker has no detector to run and no way to build one. */
    @Volatile private var isUnusable = false
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
        executor.execute(::warmUp)
      }
    }

    /**
     * Builds both models before the first frame arrives.
     *
     * Nothing here may be left to the frame loop. Building a MediaPipe graph
     * loads a model and starts a native runner, and when that goes wrong it
     * can take the process down rather than raise, so it happens once, up
     * front, where a failure costs a degraded worker instead of the app.
     *
     * `Throwable` rather than `RuntimeException`: a model that will not load
     * arrives as an `Error` — `UnsatisfiedLinkError`, `OutOfMemoryError` — and
     * the narrower catch let those pass for a crash on a background thread.
     *
     * Reading the models into a shared buffer was tried here too, on the
     * theory that mapping them out of the APK was what took the process down.
     * The J6 disproved it — a 4 KB-page device, crashing the same way — and
     * the buffers cost 65 MB of PSS and a third of the throughput on that
     * phone. The asset path stays; the graph moving off the frame path is the
     * whole fix.
     */
    @Suppress("TooGenericExceptionCaught")
    private fun warmUp() {
      val startedAtNanos = SystemClock.elapsedRealtimeNanos()

      try {
        getOrCreateDetector()
      } catch (error: Throwable) {
        isUnusable = true
        Log.e(
          TAG,
          "Detector worker $id has no detector and will take no frames.",
          error,
        )
        return
      }

      if (!LABELLER_ENABLED) {
        val elapsedMs =
          (SystemClock.elapsedRealtimeNanos() - startedAtNanos) /
            NANOSECONDS_PER_MILLISECOND
        Log.i(
          TAG,
          "Detector worker $id prewarmed in %.0f ms, detector only."
            .format(elapsedMs),
        )
        return
      }

      try {
        getOrCreateLabeller()
      } catch (error: Throwable) {
        // A worker without a classifier still detects. Its boxes keep the
        // detector's own label, which mapResult already falls back to.
        Log.e(
          TAG,
          "Detector worker $id could not build the classifier, so its boxes " +
            "will keep the detector's own labels.",
          error,
        )
      }

      val elapsedMs =
        (SystemClock.elapsedRealtimeNanos() - startedAtNanos) /
          NANOSECONDS_PER_MILLISECOND
      Log.i(TAG, "Detector worker $id prewarmed in %.0f ms.".format(elapsedMs))
    }

    fun trySubmit(imageProxy: ImageProxy, frame: PendingFrame): Boolean {
      if (isUnusable) return false
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
        runCatching { labeller?.close() }
        labeller = null
        inputBitmap?.recycle()
        inputBitmap = null
      }
      executor.shutdown()
    }

    private fun runInference(bitmap: Bitmap, frame: PendingFrame) {
      // The detector is built by warmUp, never here: a frame is the worst
      // possible moment to start a native graph.
      val activeDetector = detector
      if (activeDetector == null) {
        busy.set(false)
        return
      }

      val image = BitmapImageBuilder(bitmap).build()

      try {
        val processingOptions = ImageProcessingOptions.builder()
          .setRotationDegrees(frame.rotationDegrees)
          .build()
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
        val batch = mapResult(result, nameEach(result, bitmap, frame), frame)
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
          rebuildDetectorAfterFallback()
        } else {
          Log.w(TAG, "CPU inference failed on worker $id.", error)
        }
      } finally {
        image.close()
        busy.set(false)
      }
    }

    /**
     * The fallback closes the detector the GPU could not run, and the CPU one
     * is built here rather than left for the next frame to build.
     */
    @Suppress("TooGenericExceptionCaught")
    private fun rebuildDetectorAfterFallback() {
      try {
        getOrCreateDetector()
      } catch (error: Throwable) {
        isUnusable = true
        Log.e(
          TAG,
          "Detector worker $id could not fall back to the CPU.",
          error,
        )
      }
    }

    /**
     * Asks the classifier what each box holds.
     *
     * The detector was handed an upright image through `rotationDegrees`, so
     * its boxes are in upright coordinates while the bitmap is still the way
     * the sensor delivered it. The frame is stood up once here, and only when
     * there is something to crop out of it.
     */
    private fun nameEach(
      result: ObjectDetectorResult,
      bitmap: Bitmap,
      frame: PendingFrame,
    ): List<String?> {
      if (result.detections().isEmpty()) return emptyList()

      if (!LABELLER_ENABLED) return emptyList()

      // Built by warmUp or not at all. Naming is worth a crop and an
      // inference, never the risk of starting a graph mid-frame.
      val activeLabeller = labeller ?: return emptyList()

      // Only the largest box is named by the classifier.
      //
      // Naming all five cost more than half the detector's throughput on the
      // J6: 8.3 inferences per second with nothing in frame, 4.4 with a desk
      // in it, and latency past 1.7 seconds. The largest box is the one the
      // interface gives the card to, and every other box already falls back to
      // the detector's own label, so four of the five inferences were bought
      // for names the learner is not reading.
      val detections = result.detections()
      val namedIndex = detections.indices.maxByOrNull { index ->
        val box = detections[index].boundingBox()
        box.width() * box.height()
      } ?: return emptyList()

      val upright = standUpright(bitmap, frame.rotationDegrees)

      return try {
        val box = detections[namedIndex].boundingBox()
        val left = box.left.toInt().coerceIn(0, upright.width - 1)
        val top = box.top.toInt().coerceIn(0, upright.height - 1)
        val width = box.width().toInt().coerceIn(0, upright.width - left)
        val height = box.height().toInt().coerceIn(0, upright.height - top)

        if (width < LABELLER_MIN_BOX_PIXELS ||
          height < LABELLER_MIN_BOX_PIXELS
        ) {
          return emptyList()
        }

        val crop = Bitmap.createBitmap(upright, left, top, width, height)
        val name = try {
          val image = BitmapImageBuilder(crop).build()
          try {
            activeLabeller.classify(image)
              .classificationResult()
              .classifications()
              .firstOrNull()
              ?.categories()
              ?.firstOrNull()
              ?.categoryName()
          } finally {
            image.close()
          }
        } catch (error: RuntimeException) {
          null
        } finally {
          // Only recycle a bitmap this function allocated: a crop that covers
          // the whole frame comes back as the source itself.
          if (crop !== upright) crop.recycle()
        }

        detections.indices.map { index -> if (index == namedIndex) name else null }
      } finally {
        if (upright !== bitmap) upright.recycle()
      }
    }

    /** The sensor delivers the frame lying down; the boxes are upright. */
    private fun standUpright(bitmap: Bitmap, rotationDegrees: Int): Bitmap {
      val turn = ((rotationDegrees % 360) + 360) % 360
      if (turn == 0) return bitmap

      val matrix = Matrix().apply { postRotate(turn.toFloat()) }

      return Bitmap.createBitmap(
        bitmap,
        0,
        0,
        bitmap.width,
        bitmap.height,
        matrix,
        true,
      )
    }

    private fun getOrCreateLabeller(): ImageClassifier {
      labeller?.let { return it }

      val context = NitroModules.applicationContext
        ?: error("React Native application context is not available.")
      val baseOptions = BaseOptions.builder()
        // Always the CPU: the crop is small, the delegate handover costs more
        // than the inference, and the GPU is already carrying the detector.
        .setDelegate(Delegate.CPU)
        .setModelAssetPath(LABELLER_MODEL_ASSET_PATH)
        .build()
      val options = ImageClassifier.ImageClassifierOptions.builder()
        .setBaseOptions(baseOptions)
        .setRunningMode(RunningMode.IMAGE)
        .setMaxResults(LABELLER_MAX_RESULTS)
        .setScoreThreshold(LABELLER_SCORE_THRESHOLD)
        .build()

      return synchronized(cpuModelCreationLock) {
        ImageClassifier.createFromOptions(context, options)
      }.also {
        labeller = it
        Log.i(TAG, "Labeller ready on worker $id using $LABELLER_MODEL_ASSET_PATH.")
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
    const val TAG = "LesingoDetector"
    const val MODEL_NAME = "EfficientDet-Lite0 int8"
    const val MODEL_ASSET_PATH = "efficientdet_lite0_int8.tflite"
    /**
     * The classifier that names what the detector found.
     *
     * The detector knows eighty things and has to answer with one of them
     * whichever object it is pointed at, so an earphone comes back as a mouse.
     * A classifier reading the same box knows a thousand, and is asked for the
     * name; the detector's own label is kept only when the classifier is
     * unsure. iOS has worked this way from the start and Android never did,
     * which is why the two platforms named the same object differently.
     */
    /**
     * Whether the classifier runs at all.
     *
     * It reads a thousand classes against the detector's eighty and gives the
     * better name, and everything that has gone wrong on the Galaxy J6 went
     * wrong inside it: building its graph is what took the process down with
     * SIGBUS, its six instances are what the memory went to, and naming every
     * box is what halved the detector's throughput. Off, the detector's own
     * name is what a learner sees.
     */
    const val LABELLER_ENABLED = false
    const val LABELLER_MODEL_ASSET_PATH = "efficientnet_lite0_int8.tflite"
    const val LABELLER_MAX_RESULTS = 1
    const val LABELLER_SCORE_THRESHOLD = 0.45f
    /** A box thinner than this carries too few pixels to be worth a second
     * model, and the crop would cost more than the name is worth. */
    const val LABELLER_MIN_BOX_PIXELS = 24
    const val MAXIMUM_PERFORMANCE_PROFILE = "maximum-performance"
    const val POWER_SAVING_PROFILE = "power-saving"
    const val MIN_CPU_WORKERS = 1
    const val MAX_CPU_WORKERS = 6

    /** What a device that throttles inside a minute is held to. */
    const val WEAK_DEVICE_MAX_CPU_WORKERS = 3

    /** Below four gigabytes is the phone this cap was measured on. */
    const val WEAK_DEVICE_MEMORY_BYTES = 4L * 1024 * 1024 * 1024
    const val POWER_SAVING_CPU_WORKERS = 1
    const val MIN_GPU_WORKERS = 0
    const val MAX_GPU_WORKERS = 1
    const val MIN_GPU_DELEGATE_GL_ES_VERSION = 0x00030001
    const val GPU_DELEGATE_PREFERENCES_NAME = "lesingo-detector"
    const val GPU_DELEGATE_BLOCKED_KEY = "gpu-delegate-blocked"
    const val GPU_DELEGATE_VERIFIED_KEY = "gpu-delegate-verified"
    const val GPU_DELEGATE_FAILED_PROBES_KEY = "gpu-delegate-failed-probes"
    const val GPU_DELEGATE_ENABLED = false
    const val GPU_DELEGATE_PROBE_ATTEMPT_LIMIT = 1
    /**
     * How many boxes a frame may report.
     *
     * Five filled the screen with names the learner was not reading, and each
     * one costs a track to match and smooth and a label to lay out. Three is
     * what a phone pointed at a desk can show without the words competing with
     * each other.
     */
    const val MAX_RESULTS = 3
    /**
     * What the model has to be sure of before a box is reported at all.
     *
     * Low on purpose: this is a floor, not a decision. Whatever is dropped
     * here can never be recovered, and EfficientDet-Lite0 reads plenty of real
     * objects in the fifties — a chair across a room, a cup on a dark counter.
     * The interface decides what earns a word, and it weighs a middling
     * reading that holds still against a loud one that does not.
     */
    const val DEFAULT_SCORE_THRESHOLD = 0.4f
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
