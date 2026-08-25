///
/// DetectorWorker.swift
/// SayLensObjectDetector
///
/// One Vision pipeline on one serial queue. A worker either takes a frame or
/// refuses it; it never queues one. A queue would only make results older, and
/// an overlay drawn from an old result is what makes a card look detached from
/// the object under it.
///
/// Each frame is read twice. The first pass asks where the objects are without
/// naming them, and the second names each box on its own. Splitting it this
/// way is what lets the app draw a box around something the dictionary has
/// never heard of.
///

import CoreVideo
import Foundation
import Vision
import os

/// One named box, before it becomes part of a batch.
struct RecognizedObject {
  let label: String
  let score: Float
  /// Normalized, Vision's coordinate space: origin bottom-left.
  let boundingBox: CGRect
}

final class DetectorWorker {
  typealias ResultHandler = (PendingFrame, [RecognizedObject]) -> Void

  let id: Int
  private let log: Logger
  private let queue: DispatchQueue
  private let copier = FrameCopier()
  private let state = UnfairLock()
  private let onResult: ResultHandler

  private var isBusy = false
  private var isClosed = false
  private var hasLoggedFirstResult = false

  init(
    id: Int,
    qualityOfService: DispatchQoS,
    onResult: @escaping ResultHandler
  ) {
    self.id = id
    self.onResult = onResult
    self.log = Logger(
      subsystem: DetectorConstants.logSubsystem,
      category: "worker-\(id)"
    )
    self.queue = DispatchQueue(
      label: "\(DetectorConstants.logSubsystem).worker-\(id)",
      qos: qualityOfService
    )
  }

  /// Vision loads a model the first time each kind of request runs. Doing that
  /// before the first frame arrives keeps the learner from paying for it while
  /// pointing the camera at something.
  func prewarm() {
    queue.async { [weak self] in
      guard let self, let buffer = Self.makeBlankBuffer() else { return }

      let startedAt = DispatchTime.now()
      let handler = VNImageRequestHandler(
        cvPixelBuffer: buffer,
        orientation: .up,
        options: [:]
      )

      do {
        try handler.perform([
          VNGenerateObjectnessBasedSaliencyImageRequest(),
          VNClassifyImageRequest(),
        ])
        let elapsed = Self.milliseconds(since: startedAt)
        self.log.info("Worker \(self.id) prewarmed in \(elapsed, format: .fixed(precision: 0)) ms.")
      } catch {
        self.log.warning("Worker \(self.id) could not prewarm: \(error.localizedDescription).")
      }
    }
  }

  /// Takes the frame if this worker is idle. The pixels are copied here, on
  /// the camera queue, because the capture session recycles the buffer as soon
  /// as this call returns.
  func trySubmit(pixelBuffer: CVPixelBuffer, frame: PendingFrame) -> Bool {
    let accepted = state.withLock { () -> Bool in
      if isBusy || isClosed { return false }
      isBusy = true
      return true
    }
    guard accepted else { return false }

    do {
      let copy = try copier.copy(from: pixelBuffer)
      queue.async { [weak self] in
        self?.runInference(on: copy, frame: frame)
      }
      return true
    } catch {
      log.warning("Worker \(self.id) could not take a frame: \(error.localizedDescription).")
      state.withLock { isBusy = false }
      return false
    }
  }

  func close() {
    state.withLock { isClosed = true }
  }

  private func runInference(on pixelBuffer: CVPixelBuffer, frame: PendingFrame) {
    defer { state.withLock { isBusy = false } }

    if state.withLock({ isClosed }) { return }

    do {
      let handler = VNImageRequestHandler(
        cvPixelBuffer: pixelBuffer,
        orientation: frame.orientation,
        options: [:]
      )
      let objects = try recognizeObjects(with: handler)

      if !hasLoggedFirstResult {
        hasLoggedFirstResult = true
        log.info("Worker \(self.id) delivered its first result with \(objects.count) object(s).")
      }

      onResult(frame, objects)
    } catch {
      log.warning("Worker \(self.id) failed on a frame: \(error.localizedDescription).")
    }
  }

  private func recognizeObjects(with handler: VNImageRequestHandler) throws -> [RecognizedObject] {
    let boxes = try salientBoxes(with: handler)
    guard !boxes.isEmpty else { return [] }

    let requests = boxes.map { box -> VNClassifyImageRequest in
      let request = VNClassifyImageRequest()
      request.regionOfInterest = Self.inflate(box)
      return request
    }
    try handler.perform(requests)

    return zip(boxes, requests).compactMap { box, request in
      guard let classification = Self.bestClassification(in: request.results ?? []) else {
        return nil
      }

      return RecognizedObject(
        label: VisionTaxonomy.resolve(identifier: classification.identifier),
        score: classification.confidence,
        boundingBox: box
      )
    }
  }

  /// Phase one: where the objects are, without naming them.
  private func salientBoxes(with handler: VNImageRequestHandler) throws -> [CGRect] {
    let request = VNGenerateObjectnessBasedSaliencyImageRequest()
    try handler.perform([request])

    guard
      let observation = request.results?.first as? VNSaliencyImageObservation,
      let salientObjects = observation.salientObjects
    else { return [] }

    return salientObjects
      .filter { $0.confidence >= DetectorConstants.salientObjectThreshold }
      .sorted { $0.confidence > $1.confidence }
      .prefix(DetectorConstants.maximumResults)
      .map(\.boundingBox)
  }

  /// Phase two: the best name for one box. A label the dictionary knows wins
  /// over a more confident one it does not, because a known label carries a
  /// meaning, a pronunciation, and an example, and an unknown one carries a
  /// word alone.
  private static func bestClassification(
    in observations: [VNClassificationObservation]
  ) -> VNClassificationObservation? {
    let ranked = observations
      .filter {
        $0.hasMinimumRecall(
          DetectorConstants.classificationRecall,
          forPrecision: DetectorConstants.classificationPrecision
        )
      }
      .sorted { $0.confidence > $1.confidence }

    if let known = ranked.first(where: { VisionTaxonomy.appLabel(for: $0.identifier) != nil }) {
      return known
    }

    guard
      let best = ranked.first,
      best.confidence >= DetectorConstants.unknownLabelConfidence
    else { return nil }

    return best
  }

  private static func milliseconds(since start: DispatchTime) -> Double {
    let elapsed = DispatchTime.now().uptimeNanoseconds &- start.uptimeNanoseconds
    return Double(elapsed) / 1_000_000
  }

  /// A small black frame, which is enough to make Vision load its models.
  private static func makeBlankBuffer() -> CVPixelBuffer? {
    let side = 64
    var created: CVPixelBuffer?
    let status = CVPixelBufferCreate(
      kCFAllocatorDefault,
      side,
      side,
      kCVPixelFormatType_32BGRA,
      [kCVPixelBufferIOSurfacePropertiesKey: [:] as CFDictionary] as CFDictionary,
      &created
    )

    guard status == kCVReturnSuccess, let buffer = created else { return nil }

    CVPixelBufferLockBaseAddress(buffer, [])
    if let address = CVPixelBufferGetBaseAddress(buffer) {
      memset(address, 0, CVPixelBufferGetBytesPerRow(buffer) * side)
    }
    CVPixelBufferUnlockBaseAddress(buffer, [])

    return buffer
  }

  /// Objectness boxes hug the subject. A little context around one reads
  /// better to the classifier than a tight crop does.
  private static func inflate(_ box: CGRect) -> CGRect {
    let horizontal = box.width * DetectorConstants.regionInflation
    let vertical = box.height * DetectorConstants.regionInflation
    let inflated = box.insetBy(dx: -horizontal, dy: -vertical)

    return inflated.intersection(CGRect(x: 0, y: 0, width: 1, height: 1))
  }
}
