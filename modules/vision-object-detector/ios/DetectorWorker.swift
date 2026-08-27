///
/// DetectorWorker.swift
/// SayLensObjectDetector
///
/// One MediaPipe detector on one serial queue. A worker either takes a frame
/// or refuses it; it never queues one. A queue would only make results older,
/// and an overlay drawn from an old result is what makes a card look detached
/// from the object under it.
///

import CoreGraphics
import CoreVideo
import Foundation
import ImageIO
import MediaPipeTasksVision
import os

final class DetectorWorker {
  /// The size is the image the model actually read, which is not the frame the
  /// camera delivered: it was stood up and shrunk on the way in, and the boxes
  /// come back measured against it.
  /// The detection result, the name found for each of its boxes, and the size
  /// of the image both were measured against.
  typealias ResultHandler = (
    PendingFrame,
    ObjectDetectorResult,
    [String?],
    CGSize
  ) -> Void

  let id: Int
  private let log: Logger
  private let queue: DispatchQueue
  private let copier = FrameCopier()
  private let cropper = FrameCropper()
  private let state = UnfairLock()
  private let onResult: ResultHandler

  private var isBusy = false
  private var isClosed = false
  private var detector: ObjectDetector?
  private var labeller: ImageClassifier?
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

  /// Builds the detector before the first frame arrives. The first inference
  /// on a cold detector costs several hundred milliseconds, which the learner
  /// would otherwise pay while pointing the camera at something.
  func prewarm() {
    queue.async { [weak self] in
      guard let self else { return }

      let startedAt = DispatchTime.now()
      do {
        _ = try self.detectorForCurrentState()
        _ = try self.labellerForCurrentState()
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
      let copy = try copier.copy(from: pixelBuffer, orientation: frame.orientation)
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
    queue.async { [weak self] in
      self?.detector = nil
      self?.labeller = nil
    }
  }

  private func runInference(on pixelBuffer: CVPixelBuffer, frame: PendingFrame) {
    defer { state.withLock { isBusy = false } }

    if state.withLock({ isClosed }) { return }

    do {
      let detector = try detectorForCurrentState()
      // The buffer was already stood up by the copier, so the model is handed
      // an upright image and no orientation to interpret.
      let image = try MPImage(pixelBuffer: pixelBuffer)
      let result = try detector.detect(image: image)
      let names = try nameEach(of: result, in: pixelBuffer)

      if !hasLoggedFirstResult {
        hasLoggedFirstResult = true
        log.info("Worker \(self.id) delivered its first result with \(result.detections.count) detection(s).")
      }

      onResult(
        frame,
        result,
        names,
        CGSize(
          width: CVPixelBufferGetWidth(pixelBuffer),
          height: CVPixelBufferGetHeight(pixelBuffer)
        )
      )
    } catch {
      log.warning("Worker \(self.id) failed on a frame: \(error.localizedDescription).")
    }
  }

  /**
   Asks the classifier what each box holds.

   A box the classifier cannot name keeps whatever the detector called it,
   which is the honest fallback: the detector was sure enough to draw the box,
   and a name from eighty is better than none.
   */
  private func nameEach(
    of result: ObjectDetectorResult,
    in frame: CVPixelBuffer
  ) throws -> [String?] {
    let labeller = try labellerForCurrentState()

    return result.detections.map { detection in
      guard
        let crop = try? cropper.crop(frame, to: detection.boundingBox),
        let image = try? MPImage(pixelBuffer: crop),
        let classified = try? labeller.classify(image: image),
        let best = classified.classificationResult.classifications.first?
          .categories.first,
        let name = best.categoryName
      else { return nil }

      return name
    }
  }

  private func labellerForCurrentState() throws -> ImageClassifier {
    if let labeller { return labeller }

    let options = ImageClassifierOptions()
    options.baseOptions.modelAssetPath = try DetectorModel.resolveLabellerPath()
    options.baseOptions.delegate = .CPU
    options.runningMode = .image
    options.maxResults = DetectorConstants.labellerMaximumResults
    options.scoreThreshold = DetectorConstants.labellerScoreThreshold

    let created = try ImageClassifier(options: options)
    labeller = created
    return created
  }

  private func detectorForCurrentState() throws -> ObjectDetector {
    if let detector { return detector }

    let options = ObjectDetectorOptions()
    options.baseOptions.modelAssetPath = try DetectorModel.resolvePath()
    options.baseOptions.delegate = .CPU
    options.runningMode = .image
    options.maxResults = DetectorConstants.maximumResults
    options.scoreThreshold = DetectorConstants.scoreThreshold

    let created = try ObjectDetector(options: options)
    detector = created
    return created
  }

  private static func milliseconds(since start: DispatchTime) -> Double {
    let elapsed = DispatchTime.now().uptimeNanoseconds &- start.uptimeNanoseconds
    return Double(elapsed) / 1_000_000
  }
}
