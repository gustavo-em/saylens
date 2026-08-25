require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |spec|
  spec.name         = "SayLensObjectDetector"
  spec.version      = package["version"]
  spec.summary      = package["description"]
  spec.homepage     = package["homepage"]
  spec.license      = { :type => "UNLICENSED" }
  spec.authors      = package["author"]
  spec.platforms    = { :ios => min_ios_version_supported }
  spec.source       = { :path => "." }

  spec.source_files = "ios/**/*.{swift}"

  # The model is a single 4.4 MB binary shared with the Android build, which
  # reads it from the same path as an Android asset. Copying it into an iOS
  # folder would put a second copy of the same weights in the repository.
  spec.resource_bundles = {
    "SayLensObjectDetectorModel" => ["android/src/main/assets/efficientdet_lite0_int8.tflite"]
  }

  spec.frameworks = "CoreMedia", "CoreVideo", "ImageIO"

  # Pinned to the version the Android build uses, so a difference between the
  # two platforms is a difference in hardware rather than in the task library.
  spec.dependency "MediaPipeTasksVision", "0.10.35"
  spec.dependency "VisionCamera"

  load File.join(__dir__, "nitrogen/generated/ios/SayLensObjectDetector+autolinking.rb")
  add_nitrogen_files(spec)

  install_modules_dependencies(spec)
end
