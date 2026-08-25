///
/// UnfairLock.swift
/// SayLensObjectDetector
///
/// The camera queue publishes work and the detector queues finish it, so the
/// small pieces of state they share need a lock. `os_unfair_lock` is the
/// cheapest one the platform offers, and the critical sections here are a
/// handful of instructions long.
///

import Foundation
import os

final class UnfairLock {
  private let unfairLock: UnsafeMutablePointer<os_unfair_lock>

  init() {
    unfairLock = UnsafeMutablePointer<os_unfair_lock>.allocate(capacity: 1)
    unfairLock.initialize(to: os_unfair_lock())
  }

  deinit {
    unfairLock.deinitialize(count: 1)
    unfairLock.deallocate()
  }

  @inline(__always)
  func withLock<Result>(_ body: () throws -> Result) rethrows -> Result {
    os_unfair_lock_lock(unfairLock)
    defer { os_unfair_lock_unlock(unfairLock) }
    return try body()
  }
}
