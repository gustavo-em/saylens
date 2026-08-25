///
/// DetectorConfiguration.swift
/// SayLensObjectDetector
///
/// Values that describe the detector runtime and what this device can do with
/// it. Kept apart from the workers so the numbers can be read, compared with
/// the Android side, and changed without touching inference code.
///

import CoreGraphics
import Foundation

enum DetectorConstants {
  static let logSubsystem = "com.gustavoem.saylens.detector"
  /// Reported to JavaScript and shown in the diagnostics panel.
  static let modelName = DetectorModel.name

  static let maximumPerformanceProfile = "maximum-performance"
  static let powerSavingProfile = "power-saving"

  static let minimumCpuWorkers = 1
  /// Six matches the Android ceiling, and the iPhone 13 this was measured on
  /// reports six logical cores, so maximum performance asks for the whole
  /// processor.
  static let maximumCpuWorkers = 6
  static let powerSavingCpuWorkers = 1
  static let minimumGpuWorkers = 0
  static let maximumGpuWorkers = 1

  /// How many objects a single frame may report, and how sure the model has to
  /// be about one. Both match Android, so a difference between the platforms
  /// is a difference in hardware rather than in what was asked of the model.
  static let maximumResults = 5
  static let scoreThreshold: Float = 0.55

  /// How much a new box has to overlap the previous one to be treated as the
  /// same object rather than a new one.
  static let trackingOverlap: CGFloat = 0.4
  /// Weight of the new box against the one already on screen: the model reads
  /// every frame from scratch, so the same still object comes back with edges
  /// a few pixels apart.
  static let trackingSmoothing: CGFloat = 0.5
  /// How much more confident a new label has to be to replace the one already
  /// shown for the same object.
  static let labelChangeMargin: Float = 0.1

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
      // Every worker runs on the CPU for now. MediaPipe's iOS delegate is
      // Metal rather than the OpenCL path that aborted processes on Android,
      // so it is a reasonable next experiment, but it is not one this build
      // has measured.
      supportsGpuDelegate: false
    )
  }
}

enum DetectorError: LocalizedError {
  case modelMissing
  case unsupportedFrame
  case unsupportedPixelFormat(OSType)
  case pixelBufferAllocationFailed(CVReturn)

  var errorDescription: String? {
    switch self {
    case .modelMissing:
      return "The \(DetectorModel.name) model is not bundled with this build."
    case .unsupportedFrame:
      return "The SayLens detector requires a native VisionCamera frame."
    case let .unsupportedPixelFormat(format):
      return "The SayLens detector requires 32BGRA frames, and got \(format)."
    case let .pixelBufferAllocationFailed(status):
      return "Could not allocate a detector pixel buffer (status \(status))."
    }
  }
}
