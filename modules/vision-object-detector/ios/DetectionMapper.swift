///
/// DetectionMapper.swift
/// SayLensObjectDetector
///
/// Turns a MediaPipe result into the typed batch the JavaScript side reads.
/// The model is given an upright image, so the boxes come back measured
/// against the upright frame and nothing is left for JavaScript to rotate.
///

import CoreGraphics
import Foundation
import MediaPipeTasksVision

enum DetectionMapper {
  static func objects(from result: ObjectDetectorResult) -> [RecognizedObject] {
    result.detections.compactMap { detection in
      guard let category = detection.categories.max(by: { $0.score < $1.score })
      else { return nil }

      // A detection without a name still draws a box. The label map lives in
      // the model file, and a box under a placeholder is what says the model
      // found something the metadata failed to name.
      return RecognizedObject(
        label: category.categoryName ?? "object",
        score: category.score,
        boundingBox: detection.boundingBox
      )
    }
  }

  static func batch(
    from objects: [RecognizedObject],
    processedSize: CGSize,
    frame: PendingFrame
  ) -> NativeDetectionBatch {
    let detections = objects.map { object in
      NativeDetection(
        label: object.label,
        score: Double(object.score),
        boundingBox: NativeDetectionBox(
          left: Double(object.boundingBox.minX),
          top: Double(object.boundingBox.minY),
          right: Double(object.boundingBox.maxX),
          bottom: Double(object.boundingBox.maxY)
        )
      )
    }

    let elapsed = DispatchTime.now().uptimeNanoseconds &- frame.startedAt.uptimeNanoseconds

    return NativeDetectionBatch(
      detections: detections,
      // The frame the boxes belong to is the one the model read: already
      // upright, already shrunk. Reporting the camera's own size here, or a
      // rotation on top of one already applied, is what put every card in the
      // same corner of the screen.
      frameWidth: Double(processedSize.width),
      frameHeight: Double(processedSize.height),
      rotationDegrees: 0,
      inferenceTimeMs: Double(elapsed) / 1_000_000
    )
  }
}

/// One named box on its way from the detector to the batch. Boxes are in the
/// upright frame's pixels, with the origin at the top left, which is the space
/// both MediaPipe and the JavaScript contract use.
struct RecognizedObject {
  let label: String
  let score: Float
  let boundingBox: CGRect
}
