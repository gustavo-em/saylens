///
/// SayLensVisionDetector.swift
/// SayLensObjectDetector
///
/// The Nitro boundary. It owns nothing but the pool and the device profile:
/// every frame it receives is unwrapped, oriented, and handed over, and every
/// answer it gives comes back from the pool. Keeping it this thin is what lets
/// the scheduling rules be read and changed on their own.
///
/// This object is the iOS half of an adapter the app's learning feature owns.
/// The feature's ViewModels and views stay in TypeScript, so there is no iOS
/// view or view model here on purpose. See `docs/IOS.md`.
///

import CoreMedia
import CoreVideo
import Foundation
import ImageIO
import NitroModules
import VisionCamera
import os

/// The class is deliberately not called `SayLensObjectDetector`: that is the
/// name of the Swift module, and Swift's C++ interop header would then resolve
/// `SayLensObjectDetector::_impl` to this class instead of the module
/// namespace, which does not compile.
public final class SayLensVisionDetector: HybridSayLensObjectDetectorSpec {
  private let log = Logger(
    subsystem: DetectorConstants.logSubsystem,
    category: "detector"
  )
  private let capabilities = DevicePerformanceCapabilities.resolve()
  private let pool: DetectorWorkerPool

  public override init() {
    let capabilities = DevicePerformanceCapabilities.resolve()
    pool = DetectorWorkerPool(workerCount: capabilities.recommendedCpuWorkerCount)
    super.init()

    log.info("Detector starting with \(capabilities.recommendedCpuWorkerCount) worker(s) on \(ProcessInfo.processInfo.activeProcessorCount) logical core(s).")
  }

  public func getModelName() throws -> String {
    DetectorConstants.modelName
  }

  public func getRecommendedPerformanceProfile() throws -> String {
    capabilities.recommendedProfile
  }

  public func getSupportedPerformanceProfiles() throws -> [String] {
    capabilities.supportedProfiles
  }

  public func getRecommendedCpuWorkerCount() throws -> Double {
    Double(capabilities.recommendedCpuWorkerCount)
  }

  public func getSupportsGpuDelegate() throws -> Bool {
    capabilities.supportsGpuDelegate
  }

  /// The GPU count is part of the contract Android needs and has no meaning
  /// here: Vision chooses the Neural Engine, the GPU, or the CPU by itself.
  public func configureWorkers(cpuWorkerCount: Double, gpuWorkerCount: Double) throws {
    let count = Int(cpuWorkerCount).clamped(
      to: DetectorConstants.minimumCpuWorkers...capabilities.maximumCpuWorkerCount
    )

    pool.reconfigure(workerCount: count)
  }

  /// Called on VisionCamera's frame queue. It never waits for inference: the
  /// frame is offered to the pool and whatever finished in the meantime is
  /// returned, so the camera keeps its own cadence.
  public func detect(frame: any HybridFrameSpec) throws -> NativeDetectionBatch? {
    guard
      let nativeFrame = frame as? any NativeFrame,
      let sampleBuffer = nativeFrame.sampleBuffer,
      let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer)
    else {
      throw DetectorError.unsupportedFrame
    }

    let bufferWidth = CVPixelBufferGetWidth(pixelBuffer)
    let bufferHeight = CVPixelBufferGetHeight(pixelBuffer)
    let orientation = Self.imageOrientation(of: frame.orientation)

    // The model reads the buffer as the sensor delivered it and the boxes come
    // back in that same space, so the frame's own size travels with them and
    // the rotation is applied where Android applies it: in JavaScript.
    return pool.submit(
      pixelBuffer: pixelBuffer,
      width: bufferWidth,
      height: bufferHeight,
      orientation: orientation,
      rotationDegrees: Self.rotationDegrees(of: frame.orientation)
    )
  }

  public func close() throws {
    pool.close()
  }

  public func dispose() {
    pool.close()
  }

  /// VisionCamera reports where the top of the image ended up; Vision wants to
  /// be told the same thing in its own vocabulary. Classification is the
  /// reason this matters: an upside-down chair is a much harder chair.
  private static func rotationDegrees(of orientation: CameraOrientation) -> Int {
    switch orientation {
    case .up: return 0
    case .right: return 90
    case .down: return 180
    case .left: return 270
    @unknown default: return 0
    }
  }

  private static func imageOrientation(
    of orientation: CameraOrientation
  ) -> CGImagePropertyOrientation {
    switch orientation {
    case .up: return .up
    case .right: return .right
    case .down: return .down
    case .left: return .left
    @unknown default: return .up
    }
  }
}

private extension Int {
  func clamped(to range: ClosedRange<Int>) -> Int {
    Swift.min(Swift.max(self, range.lowerBound), range.upperBound)
  }
}
