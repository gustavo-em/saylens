///
/// FrameCopy.swift
/// SayLensObjectDetector
///
/// A camera frame belongs to the capture session, which recycles it as soon as
/// the frame callback returns. Inference runs on another queue and outlives
/// that callback, so the pixels are copied into a buffer this module owns
/// before the frame is handed over.
///
/// The copy also stands the image up and shrinks it. The sensor delivers
/// landscape buffers while the learner holds the phone in portrait, and a
/// detector reads a scene lying on its side far worse than one the right way
/// up. Two megapixels is also far more than a 320-pixel model can use, and the
/// Android build already feeds it a few hundred pixels.
///
/// The rotation is written out by hand rather than handed to Accelerate: the
/// vImage path produced a black buffer on the device while behaving correctly
/// on a Mac, and a loop that can be read is worth more here than one that
/// cannot be explained.
///

import CoreVideo
import Foundation
import ImageIO

final class FrameCopier {
  /// Longest side handed to the model. EfficientDet-Lite0 reads 320 by 320, so
  /// anything past this is thrown away by its own preprocessing.
  private static let targetLongSide = 640
  private static let bytesPerPixel = 4

  private var destination: CVPixelBuffer?
  private var width = 0
  private var height = 0

  func copy(
    from source: CVPixelBuffer,
    orientation: CGImagePropertyOrientation = .up
  ) throws -> CVPixelBuffer {
    let format = CVPixelBufferGetPixelFormatType(source)
    guard format == kCVPixelFormatType_32BGRA else {
      throw DetectorError.unsupportedPixelFormat(format)
    }

    let sourceWidth = CVPixelBufferGetWidth(source)
    let sourceHeight = CVPixelBufferGetHeight(source)
    let turnsSideways = orientation == .right || orientation == .left
    let uprightWidth = turnsSideways ? sourceHeight : sourceWidth
    let uprightHeight = turnsSideways ? sourceWidth : sourceHeight
    let scale = max(
      max(uprightWidth, uprightHeight) / Self.targetLongSide,
      1
    )
    let destination = try reusableBuffer(
      width: uprightWidth / scale,
      height: uprightHeight / scale
    )

    CVPixelBufferLockBaseAddress(source, .readOnly)
    CVPixelBufferLockBaseAddress(destination, [])
    defer {
      CVPixelBufferUnlockBaseAddress(destination, [])
      CVPixelBufferUnlockBaseAddress(source, .readOnly)
    }

    guard
      let sourceAddress = CVPixelBufferGetBaseAddress(source),
      let destinationAddress = CVPixelBufferGetBaseAddress(destination)
    else {
      throw DetectorError.unsupportedFrame
    }

    let input = sourceAddress.assumingMemoryBound(to: UInt8.self)
    let output = destinationAddress.assumingMemoryBound(to: UInt8.self)
    let sourceRowBytes = CVPixelBufferGetBytesPerRow(source)
    let destinationRowBytes = CVPixelBufferGetBytesPerRow(destination)
    let outputWidth = CVPixelBufferGetWidth(destination)
    let outputHeight = CVPixelBufferGetHeight(destination)

    for y in 0..<outputHeight {
      // Where this output row sits in the upright image.
      let uprightY = y * scale
      for x in 0..<outputWidth {
        let uprightX = x * scale
        let (sourceX, sourceY) = Self.sourcePixel(
          uprightX: uprightX,
          uprightY: uprightY,
          sourceWidth: sourceWidth,
          sourceHeight: sourceHeight,
          orientation: orientation
        )

        let from = sourceY * sourceRowBytes + sourceX * Self.bytesPerPixel
        let to = y * destinationRowBytes + x * Self.bytesPerPixel
        output[to] = input[from]
        output[to + 1] = input[from + 1]
        output[to + 2] = input[from + 2]
        output[to + 3] = 255
      }
    }

    return destination
  }

  /// Where a pixel of the upright image sits in the buffer the sensor
  /// delivered.
  ///
  /// VisionCamera names the turn that stands the frame up rather than naming
  /// where the top of the picture ended up, which is the opposite of the Core
  /// Graphics convention the type is borrowed from. A frame reported as `left`
  /// therefore needs a quarter turn clockwise. This was settled by rotating a
  /// captured frame both ways and looking at which one matched the preview.
  private static func sourcePixel(
    uprightX: Int,
    uprightY: Int,
    sourceWidth: Int,
    sourceHeight: Int,
    orientation: CGImagePropertyOrientation
  ) -> (Int, Int) {
    switch orientation {
    case .left:
      // A quarter turn clockwise.
      return (uprightY, sourceHeight - 1 - uprightX)
    case .right:
      // A quarter turn anticlockwise.
      return (sourceWidth - 1 - uprightY, uprightX)
    case .down:
      return (sourceWidth - 1 - uprightX, sourceHeight - 1 - uprightY)
    default:
      return (uprightX, uprightY)
    }
  }

  /// One reusable destination buffer, resized only when the camera resolution
  /// or the way the phone is held changes. Allocating per frame would hand the
  /// allocator megabytes at fifty frames a second for no benefit.
  private func reusableBuffer(width: Int, height: Int) throws -> CVPixelBuffer {
    if let destination, self.width == width, self.height == height {
      return destination
    }

    var created: CVPixelBuffer?
    let attributes: [CFString: Any] = [
      kCVPixelBufferIOSurfacePropertiesKey: [:] as CFDictionary,
      kCVPixelBufferMetalCompatibilityKey: true,
    ]
    let status = CVPixelBufferCreate(
      kCFAllocatorDefault,
      width,
      height,
      kCVPixelFormatType_32BGRA,
      attributes as CFDictionary,
      &created
    )

    guard status == kCVReturnSuccess, let buffer = created else {
      throw DetectorError.pixelBufferAllocationFailed(status)
    }

    destination = buffer
    self.width = width
    self.height = height
    return buffer
  }
}
