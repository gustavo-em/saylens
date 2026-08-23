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
  private var lastDeliveredSequence = -1L

  private var compactRgbaBuffer: ByteBuffer? = null
  private var nextWorkerIndex = 0
  private var performanceWindowCompleted = 0
  private var performanceWindowStartedAtNanos = 0L
  private val cpuDetectorCreationLock = Any()
  private val nextSequence = AtomicLong()
  private val performanceCapabilities = resolvePerformanceCapabilities()
  private var cpuWorkerCount = performanceCapabilities.recommendedCpuWorkerCount
  private var activeCpuWorkerCount = cpuWorkerCount
  private var gpuWorkerCount = DEFAULT_GPU_WORKERS
  private var calibrationRequested = false
  private var workerCalibration: WorkerCalibration? = null
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
    calibrateCpuWorkers: Boolean,
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
    val shouldCalibrate =
      calibrateCpuWorkers &&
        performanceCapabilities.supportsHighPerformance &&
        normalizedCpuCount >= MIN_HIGH_PERFORMANCE_CPU_WORKERS
    val poolIsUnchanged =
      normalizedCpuCount == this.cpuWorkerCount &&
        normalizedGpuCount == this.gpuWorkerCount
    if (
      poolIsUnchanged &&
      shouldCalibrate == calibrationRequested
    ) return

    val previousWorkers = if (poolIsUnchanged) null else workers
    this.cpuWorkerCount = normalizedCpuCount
    this.gpuWorkerCount = normalizedGpuCount
    calibrationRequested = shouldCalibrate
    workerCalibration = if (shouldCalibrate) {
      WorkerCalibration.create(normalizedCpuCount)
    } else {
      null
    }
    activeCpuWorkerCount = workerCalibration?.currentWorkerCount
      ?: normalizedCpuCount
    if (!poolIsUnchanged) {
      workers = createWorkers(normalizedCpuCount, normalizedGpuCount)
    }
    nextWorkerIndex = 0
    performanceWindowCompleted = 0
    performanceWindowStartedAtNanos = 0L
    previousWorkers?.forEach(DetectorWorker::close)
    Log.i(
      TAG,
      "Detector reconfigured with $normalizedCpuCount CPU workers and " +
        "$normalizedGpuCount GPU workers; calibration=$shouldCalibrate.",
    )
  }

  @Synchronized
  override fun detect(frame: HybridFrameSpec): NativeDetectionBatch? {
    val nativeFrame = frame as? NativeFrame
      ?: error("SpellForMe detector requires a native VisionCamera frame.")
    val imageProxy = nativeFrame.image
    val rotationDegrees = imageProxy.imageInfo.rotationDegrees
    val latestUndeliveredBatch = takeLatestBatch()
    val pendingFrame = PendingFrame(
      activeCpuWorkerCount = activeCpuWorkerCount,
      sequence = nextSequence.getAndIncrement(),
      width = imageProxy.width,
      height = imageProxy.height,
      rotationDegrees = rotationDegrees,
      startedAtNanos = SystemClock.elapsedRealtimeNanos(),
    )

    val activeWorkerCount = activeCpuWorkerCount + gpuWorkerCount
    repeat(activeWorkerCount) { offset ->
      val activeWorkerIndex = (nextWorkerIndex + offset) % activeWorkerCount
      val workerIndex = if (activeWorkerIndex < activeCpuWorkerCount) {
        activeWorkerIndex
      } else {
        cpuWorkerCount + activeWorkerIndex - activeCpuWorkerCount
      }
      if (workers[workerIndex].trySubmit(imageProxy, pendingFrame)) {
        nextWorkerIndex = (activeWorkerIndex + 1) % activeWorkerCount
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
  private fun publishResult(frame: PendingFrame, batch: NativeDetectionBatch) {
    recordThroughput(batch.inferenceTimeMs)
    recordCalibration(frame.activeCpuWorkerCount, batch.inferenceTimeMs)
    if (frame.sequence <= latestSequence) return

    latestSequence = frame.sequence
    latestBatch = batch
  }

  private fun recordCalibration(
    completedWithCpuWorkerCount: Int,
    inferenceTimeMs: Double,
  ) {
    val calibration = workerCalibration ?: return
    if (completedWithCpuWorkerCount != calibration.currentWorkerCount) return

    val now = SystemClock.elapsedRealtimeNanos()
    if (calibration.stageStartedAtNanos == 0L) {
      calibration.stageStartedAtNanos = now
      Log.i(
        TAG,
        "Calibrating ${calibration.currentWorkerCount} CPU workers: warm-up.",
      )
      return
    }
    if (
      now - calibration.stageStartedAtNanos <
      CALIBRATION_WARM_UP_INTERVAL_NANOS
    ) return

    if (calibration.measurementStartedAtNanos == 0L) {
      calibration.measurementStartedAtNanos = now
    }
    calibration.completedInferences += 1
    calibration.totalInferenceTimeMs += inferenceTimeMs
    val elapsedNanos = now - calibration.measurementStartedAtNanos
    if (elapsedNanos < CALIBRATION_MEASUREMENT_INTERVAL_NANOS) return

    val sample = WorkerCalibrationSample(
      averageInferenceTimeMs =
        calibration.totalInferenceTimeMs / calibration.completedInferences,
      cpuWorkerCount = calibration.currentWorkerCount,
      inferencesPerSecond =
        calibration.completedInferences * NANOSECONDS_PER_SECOND / elapsedNanos,
    )
    calibration.samples += sample
    Log.i(
      TAG,
      "Calibration sample: ${sample.cpuWorkerCount} CPU workers, " +
        "%.1f fps, %.0f ms average latency."
          .format(sample.inferencesPerSecond, sample.averageInferenceTimeMs),
    )

    if (calibration.moveToNextCandidate()) {
      activeCpuWorkerCount = calibration.currentWorkerCount
      nextWorkerIndex = 0
      return
    }

    finishCalibration(calibration)
  }

  private fun finishCalibration(calibration: WorkerCalibration) {
    val peakThroughput = calibration.samples.maxOf { it.inferencesPerSecond }
    val selectedSample = calibration.samples
      .filter {
        it.inferencesPerSecond >= peakThroughput * CALIBRATION_NEAR_PEAK_RATIO
      }
      .minBy { it.cpuWorkerCount }

    activeCpuWorkerCount = selectedSample.cpuWorkerCount
    nextWorkerIndex = 0
    workerCalibration = null

    for (workerIndex in activeCpuWorkerCount until cpuWorkerCount) {
      workers[workerIndex].close()
    }
    Log.i(
      TAG,
      "Calibration complete: selected ${selectedSample.cpuWorkerCount} CPU " +
        "workers at %.1f fps (peak %.1f fps)."
          .format(selectedSample.inferencesPerSecond, peakThroughput),
    )
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
    repeat(cpuWorkerCount) { cpuWorkerIndex ->
      workers += DetectorWorker(
        id = workers.size + 1,
        preferredDelegate = Delegate.CPU,
        prewarm =
          !performanceCapabilities.supportsHighPerformance || cpuWorkerIndex == 0,
      )
    }
    repeat(gpuWorkerCount) {
      workers += DetectorWorker(
        id = workers.size + 1,
        preferredDelegate = Delegate.GPU,
        prewarm = false,
      )
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
      .setScoreThreshold(
        if (performanceCapabilities.supportsHighPerformance) {
          DEFAULT_SCORE_THRESHOLD
        } else {
          LOW_END_SCORE_THRESHOLD
        },
      )
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
  ) {
    private val busy = AtomicBoolean(false)
    private val closed = AtomicBoolean(false)
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
        val result = getOrCreateDetector().detect(image, processingOptions)
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
    const val CALIBRATION_BASELINE_CPU_WORKERS = 2
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
    const val DEFAULT_SCORE_THRESHOLD = 0.55f
    const val LOW_END_SCORE_THRESHOLD = 0.45f
    const val RGBA_BYTES_PER_PIXEL = 4
    const val NANOSECONDS_PER_MILLISECOND = 1_000_000.0
    const val NANOSECONDS_PER_SECOND = 1_000_000_000.0
    const val PERFORMANCE_LOG_INTERVAL_NANOS = 5_000_000_000L
    const val CALIBRATION_WARM_UP_INTERVAL_NANOS = 1_500_000_000L
    const val CALIBRATION_MEASUREMENT_INTERVAL_NANOS = 2_500_000_000L
    const val CALIBRATION_NEAR_PEAK_RATIO = 0.95
  }

  private data class PendingFrame(
    val activeCpuWorkerCount: Int,
    val sequence: Long,
    val width: Int,
    val height: Int,
    val rotationDegrees: Int,
    val startedAtNanos: Long,
  )

  private data class WorkerCalibrationSample(
    val averageInferenceTimeMs: Double,
    val cpuWorkerCount: Int,
    val inferencesPerSecond: Double,
  )

  private data class WorkerCalibration(
    private val candidates: IntArray,
    private var candidateIndex: Int = 0,
    var stageStartedAtNanos: Long = 0L,
    var measurementStartedAtNanos: Long = 0L,
    var completedInferences: Int = 0,
    var totalInferenceTimeMs: Double = 0.0,
    val samples: MutableList<WorkerCalibrationSample> = mutableListOf(),
  ) {
    val currentWorkerCount: Int
      get() = candidates[candidateIndex]

    fun moveToNextCandidate(): Boolean {
      if (candidateIndex >= candidates.lastIndex) return false

      candidateIndex += 1
      stageStartedAtNanos = 0L
      measurementStartedAtNanos = 0L
      completedInferences = 0
      totalInferenceTimeMs = 0.0
      return true
    }

    companion object {
      fun create(maxCpuWorkerCount: Int) = WorkerCalibration(
        candidates = intArrayOf(
          CALIBRATION_BASELINE_CPU_WORKERS,
          MIN_HIGH_PERFORMANCE_CPU_WORKERS,
          maxCpuWorkerCount,
        ).distinct().sorted().toIntArray(),
      )
    }
  }

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
