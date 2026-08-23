package com.margelo.nitro.spellformeobjectdetector

import android.app.ActivityManager
import android.content.Context
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
class SpellformeObjectDetector : HybridSpellformeObjectDetectorSpec() {
  @Volatile private var latestBatch: NativeDetectionBatch? = null
  @Volatile private var latestSequence = -1L

  private var compactRgbaBuffer: ByteBuffer? = null
  private var nextWorkerIndex = 0
  private var performanceWindowCompleted = 0
  private var performanceWindowStartedAtNanos = 0L
  private val cpuDetectorCreationLock = Any()
  private val nextSequence = AtomicLong()
  private val performanceCapabilities = resolvePerformanceCapabilities()
  private var cpuWorkerCount = performanceCapabilities.recommendedCpuWorkerCount
  private var gpuWorkerCount = DEFAULT_GPU_WORKERS
  @Volatile private var workers = createWorkers(cpuWorkerCount, gpuWorkerCount)

  override fun getModelName(): String = MODEL_NAME

  override fun getRecommendedPerformanceProfile(): String =
    performanceCapabilities.recommendedProfile

  override fun getSupportedPerformanceProfiles(): Array<String> =
    performanceCapabilities.supportedProfiles

  override fun getRecommendedCpuWorkerCount(): Double =
    performanceCapabilities.recommendedCpuWorkerCount.toDouble()

  @Synchronized
  override fun configureWorkers(
    cpuWorkerCount: Double,
    gpuWorkerCount: Double,
  ) {
    val normalizedCpuCount = cpuWorkerCount.toInt().coerceIn(
      MIN_CPU_WORKERS,
      performanceCapabilities.maxCpuWorkerCount,
    )
    val normalizedGpuCount = if (performanceCapabilities.supportsHighPerformance) {
      gpuWorkerCount.toInt().coerceIn(MIN_GPU_WORKERS, MAX_GPU_WORKERS)
    } else {
      0
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
  override fun detect(frame: HybridFrameSpec): NativeDetectionBatch {
    val nativeFrame = frame as? NativeFrame
      ?: error("SpellForMe detector requires a native VisionCamera frame.")
    val imageProxy = nativeFrame.image
    val rotationDegrees = imageProxy.imageInfo.rotationDegrees
    val fallbackBatch = latestBatch
      ?: emptyBatch(imageProxy.width, imageProxy.height, rotationDegrees)
    val pendingFrame = PendingFrame(
      sequence = nextSequence.getAndIncrement(),
      width = imageProxy.width,
      height = imageProxy.height,
      rotationDegrees = rotationDegrees,
      startedAtNanos = SystemClock.elapsedRealtimeNanos(),
    )

    repeat(workers.size) { offset ->
      val workerIndex = (nextWorkerIndex + offset) % workers.size
      if (workers[workerIndex].trySubmit(imageProxy, pendingFrame)) {
        nextWorkerIndex = (workerIndex + 1) % workers.size
        return fallbackBatch
      }
    }

    return fallbackBatch
  }

  @Synchronized
  override fun close() {
    workers.forEach(DetectorWorker::close)
    workers = emptyArray()
    latestBatch = null
    latestSequence = -1L
    compactRgbaBuffer = null
  }

  @Synchronized
  private fun copyFrameToBitmap(imageProxy: ImageProxy, bitmap: Bitmap) {
    require(imageProxy.format == PixelFormat.RGBA_8888) {
      "SpellForMe detector requires RGBA_8888 frames."
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
  private fun publishResult(sequence: Long, batch: NativeDetectionBatch) {
    recordThroughput(batch.inferenceTimeMs)
    if (sequence <= latestSequence) return

    latestSequence = sequence
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
    repeat(cpuWorkerCount) {
      workers += DetectorWorker(workers.size + 1, Delegate.CPU)
    }
    repeat(gpuWorkerCount) {
      workers += DetectorWorker(workers.size + 1, Delegate.GPU)
    }
    return workers.toTypedArray()
  }

  private fun resolvePerformanceCapabilities(): DevicePerformanceCapabilities {
    val context = NitroModules.applicationContext
      ?: return DevicePerformanceCapabilities.lowDevice()
    val activityManager = context.getSystemService(
      Context.ACTIVITY_SERVICE,
    ) as ActivityManager
    val availableProcessors = Runtime.getRuntime().availableProcessors()
    val memoryClassMb = activityManager.memoryClass
    val onlySupports32Bit = Build.SUPPORTED_64_BIT_ABIS.isEmpty()
    val supportsHighPerformance =
      !activityManager.isLowRamDevice &&
        !onlySupports32Bit &&
        availableProcessors >= MIN_HIGH_PERFORMANCE_PROCESSORS &&
        memoryClassMb >= MIN_HIGH_PERFORMANCE_MEMORY_CLASS_MB

    if (!supportsHighPerformance) {
      return DevicePerformanceCapabilities.lowDevice()
    }

    val memoryWorkerLimit = when {
      memoryClassMb >= 512 -> 6
      memoryClassMb >= 384 -> 5
      else -> 4
    }
    val recommendedCpuWorkerCount = minOf(
      availableProcessors - RESERVED_SYSTEM_PROCESSORS,
      memoryWorkerLimit,
      MAX_CPU_WORKERS,
    ).coerceAtLeast(MIN_HIGH_PERFORMANCE_CPU_WORKERS)

    return DevicePerformanceCapabilities(
      maxCpuWorkerCount = recommendedCpuWorkerCount,
      recommendedCpuWorkerCount = recommendedCpuWorkerCount,
      recommendedProfile = HIGH_PERFORMANCE_PROFILE,
      supportedProfiles = arrayOf(
        ULTRA_PERFORMANCE_PROFILE,
        HIGH_PERFORMANCE_PROFILE,
        LOW_DEVICE_PROFILE,
      ),
      supportsHighPerformance = true,
    )
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
      .setScoreThreshold(SCORE_THRESHOLD)
      .build()

    return ObjectDetector.createFromOptions(context, options).also {
      Log.i(
        TAG,
        "Object detector worker $workerId initialized with $delegate delegate.",
      )
    }
  }

  private fun emptyBatch(
    frameWidth: Int,
    frameHeight: Int,
    rotationDegrees: Int,
  ) = NativeDetectionBatch(
    detections = emptyArray(),
    frameWidth = frameWidth.toDouble(),
    frameHeight = frameHeight.toDouble(),
    rotationDegrees = rotationDegrees.toDouble(),
    inferenceTimeMs = 0.0,
  )

  private inner class DetectorWorker(
    private val id: Int,
    preferredDelegate: Delegate,
  ) {
    private val busy = AtomicBoolean(false)
    private var detector: ObjectDetector? = null
    private var hasLoggedFirstResult = false
    private var inputBitmap: Bitmap? = null
    private var activeDelegate = preferredDelegate
    private val executor = Executors.newSingleThreadExecutor { runnable ->
      Thread(
        {
          Process.setThreadPriority(Process.THREAD_PRIORITY_MORE_FAVORABLE)
          runnable.run()
        },
        "$TAG-$id",
      )
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
        val result = getOrCreateDetector().detect(image, processingOptions)
        val batch = mapResult(result, frame)
        publishResult(frame.sequence, batch)
        if (!hasLoggedFirstResult) {
          hasLoggedFirstResult = true
          Log.i(
            TAG,
            "Object detector worker $id completed its first inference in " +
              "${batch.inferenceTimeMs.toInt()} ms.",
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
        inputBitmap = null
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
    const val TAG = "SpellForMeDetector"
    const val MODEL_NAME = "EfficientDet-Lite0 int8"
    const val MODEL_ASSET_PATH = "efficientdet_lite0_int8.tflite"
    const val HIGH_PERFORMANCE_PROFILE = "high-performance"
    const val LOW_DEVICE_PROFILE = "low-device"
    const val ULTRA_PERFORMANCE_PROFILE = "ultra-performance"
    const val LOW_DEVICE_CPU_WORKERS = 2
    const val DEFAULT_GPU_WORKERS = 0
    const val MIN_CPU_WORKERS = 1
    const val MAX_CPU_WORKERS = 6
    const val MIN_GPU_WORKERS = 0
    const val MAX_GPU_WORKERS = 1
    const val MIN_HIGH_PERFORMANCE_CPU_WORKERS = 4
    const val MIN_HIGH_PERFORMANCE_MEMORY_CLASS_MB = 256
    const val MIN_HIGH_PERFORMANCE_PROCESSORS = 6
    const val RESERVED_SYSTEM_PROCESSORS = 2
    const val MAX_RESULTS = 5
    const val SCORE_THRESHOLD = 0.55f
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
    val supportsHighPerformance: Boolean,
  ) {
    companion object {
      fun lowDevice() = DevicePerformanceCapabilities(
        maxCpuWorkerCount = LOW_DEVICE_CPU_WORKERS,
        recommendedCpuWorkerCount = LOW_DEVICE_CPU_WORKERS,
        recommendedProfile = LOW_DEVICE_PROFILE,
        supportedProfiles = arrayOf(LOW_DEVICE_PROFILE),
        supportsHighPerformance = false,
      )
    }
  }
}
