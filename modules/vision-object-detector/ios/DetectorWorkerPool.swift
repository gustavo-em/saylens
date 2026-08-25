///
/// DetectorWorkerPool.swift
/// SayLensObjectDetector
///
/// Holds the workers, hands each frame to the first idle one, and keeps the
/// newest finished result until someone asks for it. The camera calls in at
/// its own rate and never waits for inference, so the pool answers with the
/// last result rather than the one for the frame just handed over.
///

import CoreVideo
import Foundation
import ImageIO
import os

/// What is known about a frame at the moment it is handed to a worker.
struct PendingFrame {
  let sequence: Int64
  /// Dimensions of the upright image, which is the space Vision reports boxes
  /// in once it is told how the buffer is oriented.
  let width: Int
  let height: Int
  let orientation: CGImagePropertyOrientation
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
    orientation: CGImagePropertyOrientation
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
  /// older one never replaces a newer one already published.
  private func publish(frame: PendingFrame, objects: [RecognizedObject]) {
    let batch = DetectionMapper.batch(from: objects, frame: frame)
    recordThroughput(inferenceTimeMs: batch.inferenceTimeMs)

    state.withLock {
      guard frame.sequence > latestSequence else { return }

      latestSequence = frame.sequence
      latestBatch = batch
    }
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
      DetectorWorker(id: id, qualityOfService: qualityOfService) { [weak self] frame, objects in
        self?.publish(frame: frame, objects: objects)
      }
    }

    created.forEach { $0.prewarm() }
    return created
  }
}
