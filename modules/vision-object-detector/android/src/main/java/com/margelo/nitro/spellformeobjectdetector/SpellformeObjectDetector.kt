package com.margelo.nitro.spellformeobjectdetector

import android.os.SystemClock
import com.facebook.proguard.annotations.DoNotStrip
import com.google.mediapipe.framework.image.MediaImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.ImageProcessingOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetector
import com.margelo.nitro.NitroModules
import com.margelo.nitro.camera.HybridFrameSpec
import com.margelo.nitro.camera.public.NativeFrame

@DoNotStrip
class SpellformeObjectDetector : HybridSpellformeObjectDetectorSpec() {
  private var detector: ObjectDetector? = null

  override fun getModelName(): String {
    return MODEL_NAME
  }

  override fun detect(frame: HybridFrameSpec): NativeDetectionBatch {
    val nativeFrame = frame as? NativeFrame
      ?: error("SpellForMe detector requires a native VisionCamera frame.")
    val imageProxy = nativeFrame.image
    val mediaImage = imageProxy.image
      ?: return emptyBatch(imageProxy.width, imageProxy.height, imageProxy.imageInfo.rotationDegrees)
    val rotationDegrees = imageProxy.imageInfo.rotationDegrees
    val processingOptions = ImageProcessingOptions.builder()
      .setRotationDegrees(rotationDegrees)
      .build()
    val mpImage = MediaImageBuilder(mediaImage).build()
    val startedAt = SystemClock.elapsedRealtimeNanos()

    return try {
      val result = getOrCreateDetector().detect(mpImage, processingOptions)
      val inferenceTimeMs =
        (SystemClock.elapsedRealtimeNanos() - startedAt) / NANOSECONDS_PER_MILLISECOND
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

      NativeDetectionBatch(
        detections = detections,
        frameWidth = imageProxy.width.toDouble(),
        frameHeight = imageProxy.height.toDouble(),
        rotationDegrees = rotationDegrees.toDouble(),
        inferenceTimeMs = inferenceTimeMs,
      )
    } finally {
      mpImage.close()
    }
  }

  @Synchronized
  override fun close() {
    detector?.close()
    detector = null
  }

  @Synchronized
  private fun getOrCreateDetector(): ObjectDetector {
    detector?.let { return it }

    val context = NitroModules.applicationContext
      ?: error("React Native application context is not available.")
    val baseOptions = BaseOptions.builder()
      .setDelegate(Delegate.CPU)
      .setModelAssetPath(MODEL_ASSET_PATH)
      .build()
    val options = ObjectDetector.ObjectDetectorOptions.builder()
      .setBaseOptions(baseOptions)
      .setRunningMode(RunningMode.IMAGE)
      .setMaxResults(MAX_RESULTS)
      .setScoreThreshold(SCORE_THRESHOLD)
      .build()

    return ObjectDetector.createFromOptions(context, options).also {
      detector = it
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

  private companion object {
    const val MODEL_NAME = "EfficientDet-Lite0 int8"
    const val MODEL_ASSET_PATH = "efficientdet_lite0_int8.tflite"
    const val MAX_RESULTS = 5
    const val SCORE_THRESHOLD = 0.55f
    const val NANOSECONDS_PER_MILLISECOND = 1_000_000.0
  }
}
