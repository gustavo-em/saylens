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
  /**
   Turns the detector's boxes into named objects, preferring the name the
   classifier read out of each box.

   An ImageNet label carries its synonyms — "mouse, computer mouse" — and the
   first of them is the one a learner would recognise.
   */
  static func objects(
    from result: ObjectDetectorResult,
    names: [String?]
  ) -> [RecognizedObject] {
    result.detections.enumerated().compactMap { index, detection in
      guard let category = detection.categories.max(by: { $0.score < $1.score })
      else { return nil }

      let read = index < names.count ? names[index] : nil

      // A detection without a name still draws a box. The label map lives in
      // the model file, and a box under a placeholder is what says the model
      // found something the metadata failed to name.
      return RecognizedObject(
        label: firstSynonym(of: read) ?? category.categoryName ?? "object",
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

/// ImageNet names a class by every word for it. The first is the plain one.
private func firstSynonym(of label: String?) -> String? {
  guard let label else { return nil }

  let first = label.split(separator: ",").first.map(String.init)?
    .trimmingCharacters(in: .whitespaces)

  return first?.isEmpty == false ? first : nil
}

/// One named box on its way from the detector to the batch. Boxes are in the
/// upright frame's pixels, with the origin at the top left, which is the space
/// both MediaPipe and the JavaScript contract use.
struct RecognizedObject {
  let label: String
  let score: Float
  let boundingBox: CGRect
}

/// A box being followed from frame to frame, with the names it has been given
/// recently. The names are what the vote reads; the box is what is drawn.
struct TrackedObject {
  let object: RecognizedObject
  let recentLabels: [String]
}
