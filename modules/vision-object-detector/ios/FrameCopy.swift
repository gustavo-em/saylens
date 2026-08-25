///
/// FrameCopy.swift
/// SayLensObjectDetector
///
/// A camera frame belongs to the capture session, which recycles it as soon as
/// the frame callback returns. Inference runs on another queue and outlives
/// that callback, so the pixels are copied into a buffer this module owns
/// before the frame is handed over.
///

import CoreVideo
import Foundation

/// One reusable destination buffer, resized only when the camera resolution
/// changes. Allocating per frame would hand the allocator a few megabytes at
/// thirty frames per second for no benefit.
final class FrameCopier {
  private var destination: CVPixelBuffer?
  private var width = 0
  private var height = 0

  func copy(from source: CVPixelBuffer) throws -> CVPixelBuffer {
    let format = CVPixelBufferGetPixelFormatType(source)
    guard format == kCVPixelFormatType_32BGRA else {
      throw DetectorError.unsupportedPixelFormat(format)
    }

    let sourceWidth = CVPixelBufferGetWidth(source)
    let sourceHeight = CVPixelBufferGetHeight(source)
    let destination = try reusableBuffer(width: sourceWidth, height: sourceHeight)

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

    let sourceStride = CVPixelBufferGetBytesPerRow(source)
    let destinationStride = CVPixelBufferGetBytesPerRow(destination)

    if sourceStride == destinationStride {
      memcpy(destinationAddress, sourceAddress, sourceStride * sourceHeight)
      return destination
    }

    // Padded rows: copy row by row rather than the whole plane, or the image
    // shears by the difference between the two strides. Only the visible
    // pixels are copied; whatever padding either buffer carries is left alone.
    let rowBytes = min(sourceWidth * 4, min(sourceStride, destinationStride))
    for row in 0..<sourceHeight {
      memcpy(
        destinationAddress.advanced(by: row * destinationStride),
        sourceAddress.advanced(by: row * sourceStride),
        rowBytes
      )
    }

    return destination
  }

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
