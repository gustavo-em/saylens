///
/// DetectionMapper.swift
/// SayLensObjectDetector
///
/// Turns recognised objects into the typed batch the JavaScript side reads.
/// Boxes arrive normalized with the origin at the bottom left, which is
/// Vision's convention, and leave in frame pixels with the origin at the top
/// left, which is the contract both platforms answer.
///

import CoreGraphics
import Foundation

enum DetectionMapper {
  static func batch(from objects: [RecognizedObject], frame: PendingFrame) -> NativeDetectionBatch {
    let width = CGFloat(frame.width)
    let height = CGFloat(frame.height)

    let detections = objects.map { object -> NativeDetection in
      let box = object.boundingBox

      return NativeDetection(
        label: object.label,
        score: Double(object.score),
        boundingBox: NativeDetectionBox(
          left: Double(box.minX * width),
          top: Double((1 - box.maxY) * height),
          right: Double(box.maxX * width),
          bottom: Double((1 - box.minY) * height)
        )
      )
    }

    let elapsed = DispatchTime.now().uptimeNanoseconds &- frame.startedAt.uptimeNanoseconds

    return NativeDetectionBatch(
      detections: detections,
      frameWidth: Double(frame.width),
      frameHeight: Double(frame.height),
      // Vision was told how the buffer is oriented and answered in the upright
      // image's coordinates, so nothing is left for JavaScript to rotate.
      rotationDegrees: 0,
      inferenceTimeMs: Double(elapsed) / 1_000_000
    )
  }
}
