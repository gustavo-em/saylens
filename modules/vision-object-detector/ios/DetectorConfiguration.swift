///
/// DetectorConfiguration.swift
/// SayLensObjectDetector
///
/// Values that describe the detector runtime and what this device can do with
/// it. Kept apart from the workers so the numbers can be read, compared with
/// the Android side, and changed without touching inference code.
///

import Foundation

enum DetectorConstants {
  static let logSubsystem = "com.gustavoem.saylens.detector"
  /// Reported to JavaScript and shown in the diagnostics panel.
  static let modelName = "Apple Vision objectness + classification"

  static let maximumPerformanceProfile = "maximum-performance"
  static let powerSavingProfile = "power-saving"

  static let minimumCpuWorkers = 1
  /// Six matches the Android ceiling, and every current iPhone reports six
  /// logical cores, so maximum performance asks for the whole processor.
  static let maximumCpuWorkers = 6
  static let powerSavingCpuWorkers = 1
  static let minimumGpuWorkers = 0
  static let maximumGpuWorkers = 1

  /// How many objects a single frame may report, matching Android.
  static let maximumResults = 5
  /// Objectness confidence below this is not worth classifying.
  static let salientObjectThreshold: Float = 0.3
  /// Objectness boxes hug the subject, and a classifier reads a little context
  /// better than a tight crop, so each box grows by this share of its size
  /// before it is classified.
  static let regionInflation: CGFloat = 0.06
  /// Apple's recommended shape of filter for classification results: keep a
  /// label only where the taxonomy's curve says this precision is reachable.
  static let classificationPrecision: Float = 0.6
  static let classificationRecall: Float = 0.01
  /// A label the dictionary does not know still draws a box, but only when the
  /// classifier is clearly confident about it.
  static let unknownLabelConfidence: Float = 0.35

  static let performanceLogInterval: TimeInterval = 5
}

/// What this device offers, resolved once per process.
struct DevicePerformanceCapabilities {
  let maximumCpuWorkerCount: Int
  let recommendedCpuWorkerCount: Int
  let recommendedProfile: String
  let supportedProfiles: [String]
  let supportsGpuDelegate: Bool

  /// Maximum performance takes every logical core the process is given.
  ///
  /// Unlike Android, no core is held back for the camera: AVFoundation runs
  /// capture on its own real-time queues, and the detector queues sit below
  /// them in quality of service, so the scheduler already protects the preview
  /// from a saturated detector pool.
  ///
  /// A worker here is a Vision pipeline rather than a CPU thread. Vision picks
  /// the Neural Engine or the GPU on its own, and those are shared, so extra
  /// workers overlap the CPU-side work around inference rather than
  /// multiplying inference itself.
  static func resolve() -> DevicePerformanceCapabilities {
    let cores = ProcessInfo.processInfo.activeProcessorCount
    let cpuWorkerCount = min(
      max(cores, DetectorConstants.minimumCpuWorkers),
      DetectorConstants.maximumCpuWorkers
    )

    return DevicePerformanceCapabilities(
      maximumCpuWorkerCount: cpuWorkerCount,
      recommendedCpuWorkerCount: cpuWorkerCount,
      recommendedProfile: DetectorConstants.maximumPerformanceProfile,
      supportedProfiles: [
        DetectorConstants.maximumPerformanceProfile,
        DetectorConstants.powerSavingProfile,
      ],
      // There is no delegate to choose on iOS: Vision routes the work to the
      // Neural Engine, GPU, or CPU by itself. The flag stays false so the
      // settings screen does not offer a switch that changes nothing.
      supportsGpuDelegate: false
    )
  }
}

enum DetectorError: LocalizedError {
  case unsupportedFrame
  case unsupportedPixelFormat(OSType)
  case pixelBufferAllocationFailed(CVReturn)

  var errorDescription: String? {
    switch self {
    case .unsupportedFrame:
      return "The SayLens detector requires a native VisionCamera frame."
    case let .unsupportedPixelFormat(format):
      return "The SayLens detector requires 32BGRA frames, and got \(format)."
    case let .pixelBufferAllocationFailed(status):
      return "Could not allocate a detector pixel buffer (status \(status))."
    }
  }
}
