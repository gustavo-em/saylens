///
/// DetectorModel.swift
/// SayLensObjectDetector
///
/// Finds the model this pod ships. It is the same EfficientDet-Lite0 int8
/// binary the Android build reads, kept in one place in the repository rather
/// than copied per platform.
///

import Foundation

enum DetectorModel {
  static let name = "EfficientDet-Lite0 int8"
  private static let resourceName = "efficientdet_lite0_int8"
  private static let resourceExtension = "tflite"
  /// Name of the CocoaPods resource bundle declared in the podspec.
  private static let bundleName = "SayLensObjectDetectorModel"

  /// The file ships in a CocoaPods resource bundle, which lands inside the app
  /// bundle for a static build and inside the framework for a dynamic one, so
  /// both are searched before giving up.
  static func resolvePath() throws -> String {
    let ownBundle = Bundle(for: SayLensVisionDetector.self)
    let candidates: [Bundle] = [
      ownBundle.url(forResource: bundleName, withExtension: "bundle")
        .flatMap(Bundle.init(url:)),
      Bundle.main.url(forResource: bundleName, withExtension: "bundle")
        .flatMap(Bundle.init(url:)),
      ownBundle,
      Bundle.main,
    ].compactMap { $0 }

    for bundle in candidates {
      if let path = bundle.path(forResource: resourceName, ofType: resourceExtension) {
        return path
      }
    }

    throw DetectorError.modelMissing
  }
}
