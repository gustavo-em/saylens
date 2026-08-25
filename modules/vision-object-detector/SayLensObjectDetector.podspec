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

  # Recognition on iOS is Apple's own Vision framework, so this pod ships no
  # model and no third-party inference dependency: nothing is added to the
  # download the learner pays for. See docs/adr/0009-ios-vision-detector.md.
  spec.frameworks = "Vision", "CoreMedia", "CoreVideo", "ImageIO"
  spec.dependency "VisionCamera"

  load File.join(__dir__, "nitrogen/generated/ios/SayLensObjectDetector+autolinking.rb")
  add_nitrogen_files(spec)

  install_modules_dependencies(spec)
end
