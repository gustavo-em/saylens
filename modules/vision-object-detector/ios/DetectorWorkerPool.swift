///
/// DetectorWorkerPool.swift
/// SayLensObjectDetector
///
/// Holds the workers, hands each frame to the first idle one, and keeps the
/// newest finished result until someone asks for it. The camera calls in at
/// its own rate and never waits for inference, so the pool answers with the
/// last result rather than the one for the frame just handed over.
///

import CoreGraphics
import CoreVideo
import Foundation
import ImageIO
import MediaPipeTasksVision
import os

/// What is known about a frame at the moment it is handed to a worker.
struct PendingFrame {
  let sequence: Int64
  /// Dimensions of the upright image, which is the space Vision reports boxes
  /// in once it is told how the buffer is oriented.
  let width: Int
  let height: Int
  let orientation: CGImagePropertyOrientation
  /// Clockwise degrees that stand the frame up, which is what the JavaScript
  /// side applies to the boxes, exactly as it does for Android.
  let rotationDegrees: Int
  let startedAt: DispatchTime
}

final class DetectorWorkerPool {
  private let log = Logger(
    subsystem: DetectorConstants.logSubsystem,
    category: "pool"
  )
  private let state = UnfairLock()

  /// Read from the camera queue and replaced from the JavaScript thread, so
  /// every access goes through the lock.
  private var workers: [DetectorWorker] = []
  private var nextWorkerIndex = 0
  private var nextSequence: Int64 = 0
  private var latestBatch: NativeDetectionBatch?
  private var latestSequence: Int64 = -1
  private var lastDeliveredSequence: Int64 = -1

  private var throughputWindowStartedAt: DispatchTime?
  private var throughputWindowCount = 0
  /// What was published last, used to keep an object's name and place steady
  /// across frames, along with the names this object has been given recently.
  private var tracked: [TrackedObject] = []

  private(set) var workerCount: Int

  init(workerCount: Int) {
    self.workerCount = workerCount
    self.workers = []
    self.workers = makeWorkers(count: workerCount)
  }

  private var currentWorkers: [DetectorWorker] {
    state.withLock { workers }
  }

  /// Rebuilds the pool only when the count actually changes: replacing the
  /// workers throws away queues that are already warm.
  func reconfigure(workerCount: Int) {
    guard workerCount != self.workerCount else { return }

    let replacement = makeWorkers(count: workerCount)
    self.workerCount = workerCount

    let previous = state.withLock { () -> [DetectorWorker] in
      let previous = workers
      workers = replacement
      nextWorkerIndex = 0
      throughputWindowStartedAt = nil
      throughputWindowCount = 0
      return previous
    }
    previous.forEach { $0.close() }
    log.info("Detector reconfigured with \(workerCount) worker(s).")
  }

  /// Offers the frame to every worker once, starting after the one that took
  /// the previous frame, and answers with the newest undelivered result.
  func submit(
    pixelBuffer: CVPixelBuffer,
    width: Int,
    height: Int,
    orientation: CGImagePropertyOrientation,
    rotationDegrees: Int
  ) -> NativeDetectionBatch? {
    let undelivered = takeLatestBatch()
    let workers = currentWorkers
    guard !workers.isEmpty else { return undelivered }

    let frame = PendingFrame(
      sequence: state.withLock { () -> Int64 in
        let sequence = nextSequence
        nextSequence += 1
        return sequence
      },
      width: width,
      height: height,
      orientation: orientation,
      rotationDegrees: rotationDegrees,
      startedAt: DispatchTime.now()
    )
    let startIndex = state.withLock { nextWorkerIndex }

    for offset in 0..<workers.count {
      let index = (startIndex + offset) % workers.count
      if workers[index].trySubmit(pixelBuffer: pixelBuffer, frame: frame) {
        state.withLock { nextWorkerIndex = (index + 1) % workers.count }
        return undelivered
      }
    }

    // Every worker is busy. The frame is dropped on purpose: the camera keeps
    // its cadence and the next frame is newer than anything a queue would hold.
    return undelivered
  }

  func close() {
    let previous = state.withLock { () -> [DetectorWorker] in
      let previous = workers
      workers = []
      latestBatch = nil
      latestSequence = -1
      lastDeliveredSequence = -1
      nextWorkerIndex = 0
      tracked = []
      return previous
    }

    previous.forEach { $0.close() }
  }

  private func takeLatestBatch() -> NativeDetectionBatch? {
    state.withLock { () -> NativeDetectionBatch? in
      guard latestSequence > lastDeliveredSequence else { return nil }

      lastDeliveredSequence = latestSequence
      return latestBatch
    }
  }

  /// Results can finish out of order when several workers run at once, so an
  /// older one never replaces a newer one already published, and a late result
  /// never disturbs what is being tracked.
  private func publish(
    frame: PendingFrame,
    result: ObjectDetectorResult,
    names: [String?],
    processedSize: CGSize
  ) {
    let objects = DetectionMapper.objects(from: result, names: names)
    let batch: NativeDetectionBatch? = state.withLock {
      guard frame.sequence > latestSequence else { return nil }

      let batch = DetectionMapper.batch(
        from: stabilise(objects),
        processedSize: processedSize,
        frame: frame
      )
      latestSequence = frame.sequence
      latestBatch = batch
      return batch
    }

    guard let batch else { return }
    recordThroughput(inferenceTimeMs: batch.inferenceTimeMs)
  }

  /// Saliency recomputes the whole frame every time, so the same object comes
  /// back with slightly different edges and, now and then, a different name.
  /// Carrying the last reading forward is what turns a sequence of independent
  /// guesses into an object that stays put.
  ///
  /// Called with the lock held.
  private func stabilise(_ objects: [RecognizedObject]) -> [RecognizedObject] {
    var unmatched = tracked
    var stabilised: [TrackedObject] = []

    for object in objects {
      guard
        let index = unmatched.firstIndex(where: {
          Self.overlap($0.object.boundingBox, object.boundingBox)
            >= DetectorConstants.trackingOverlap
        })
      else {
        stabilised.append(TrackedObject(object: object, recentLabels: [object.label]))
        continue
      }

      let previous = unmatched.remove(at: index)
      var recentLabels = previous.recentLabels
      recentLabels.append(object.label)
      if recentLabels.count > DetectorConstants.labelVoteWindow {
        recentLabels.removeFirst(recentLabels.count - DetectorConstants.labelVoteWindow)
      }

      let label = Self.mostCommonLabel(in: recentLabels, fallingBackTo: object.label)
      stabilised.append(
        TrackedObject(
          object: RecognizedObject(
            label: label,
            score: label == object.label ? object.score : previous.object.score,
            boundingBox: Self.blend(
              previous.object.boundingBox,
              towards: object.boundingBox
            )
          ),
          recentLabels: recentLabels
        )
      )
    }

    // Anything that was not matched is gone from the scene: the tracked set is
    // whatever was just published, nothing older.
    tracked = stabilised
    return stabilised.map(\.object)
  }

  /// The name shown is the one this object has been given most often in the
  /// last few frames.
  ///
  /// A margin on confidence was tried first and it made names stick: once a
  /// chair under a blanket had been called a person, no later reading of
  /// `chair` was ever confident enough to take the name back. A vote is as
  /// steady frame to frame and corrects itself as soon as the model does.
  private static func mostCommonLabel(
    in labels: [String],
    fallingBackTo fallback: String
  ) -> String {
    var counts: [String: Int] = [:]
    for label in labels { counts[label, default: 0] += 1 }

    guard let highest = counts.values.max() else { return fallback }

    // The newest reading breaks a tie, so a name that is taking over is not
    // held back by the one it is replacing.
    for label in labels.reversed() where counts[label] == highest {
      return label
    }

    return fallback
  }

  private static func overlap(_ first: CGRect, _ second: CGRect) -> CGFloat {
    let intersection = first.intersection(second)
    guard !intersection.isNull, !intersection.isEmpty else { return 0 }

    let overlapArea = intersection.width * intersection.height
    let union = first.width * first.height + second.width * second.height - overlapArea

    return union <= 0 ? 0 : overlapArea / union
  }

  private static func blend(_ previous: CGRect, towards next: CGRect) -> CGRect {
    let weight = DetectorConstants.trackingSmoothing

    return CGRect(
      x: previous.minX + (next.minX - previous.minX) * weight,
      y: previous.minY + (next.minY - previous.minY) * weight,
      width: previous.width + (next.width - previous.width) * weight,
      height: previous.height + (next.height - previous.height) * weight
    )
  }

  private func recordThroughput(inferenceTimeMs: Double) {
    let report: (Double, Double)? = state.withLock { () -> (Double, Double)? in
      let now = DispatchTime.now()
      guard let start = throughputWindowStartedAt else {
        throughputWindowStartedAt = now
        throughputWindowCount = 1
        return nil
      }

      throughputWindowCount += 1
      let elapsedSeconds = Double(now.uptimeNanoseconds &- start.uptimeNanoseconds) / 1_000_000_000
      guard elapsedSeconds >= DetectorConstants.performanceLogInterval else { return nil }

      let perSecond = Double(throughputWindowCount) / elapsedSeconds
      throughputWindowStartedAt = now
      throughputWindowCount = 0
      return (perSecond, inferenceTimeMs)
    }

    guard let report else { return }
    log.info("Detector throughput: \(report.0, format: .fixed(precision: 1)) fps; latest latency: \(report.1, format: .fixed(precision: 0)) ms.")
  }

  private func makeWorkers(count: Int) -> [DetectorWorker] {
    // A single worker is the power-saving pool, and it deliberately runs below
    // the interface so a background-quality detector cannot compete with
    // scrolling or animation.
    let isPowerSaving = count == DetectorConstants.powerSavingCpuWorkers
    let qualityOfService: DispatchQoS = isPowerSaving ? .utility : .userInitiated

    let created = (1...max(count, 1)).map { id in
      DetectorWorker(id: id, qualityOfService: qualityOfService) {
        [weak self] frame, result, names, processedSize in
        self?.publish(
          frame: frame,
          result: result,
          names: names,
          processedSize: processedSize
        )
      }
    }

    created.forEach { $0.prewarm() }
    return created
  }
}
