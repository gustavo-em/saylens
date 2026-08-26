//
//  SpeechRecognitionModule.swift
//  SayLens
//
//  Records one spoken word and reports what the system heard, so the app can
//  compare it with the word being practised. Recognition runs through Apple's
//  own service and prefers the on-device model; nothing is uploaded by this
//  module when that model is available for the language.
//
//  The contract matches the Android module: `isAvailable`, `hasPermission`,
//  `listen`, and `cancel`, with the same error codes, so the JavaScript
//  adapter stays free of platform branches.
//

import AVFoundation
import Foundation
import React
import Speech

@objc(SayLensSpeechRecognition)
final class SpeechRecognitionModule: NSObject {
  private enum ErrorCode {
    static let busy = "E_SPEECH_BUSY"
    static let cancelled = "E_SPEECH_CANCELLED"
    static let noMatch = "E_SPEECH_NO_MATCH"
    static let permission = "E_SPEECH_PERMISSION"
    static let recognition = "E_SPEECH_RECOGNITION"
    static let unavailable = "E_SPEECH_UNAVAILABLE"
    static let language = "E_SPEECH_LANGUAGE"
  }

  /// How long the learner has to start speaking. Tapping a button and then
  /// saying a word takes longer than the pause inside a sentence does, and
  /// timing the first word by the second is what made every attempt end
  /// before it began.
  private static let firstWordTimeout: TimeInterval = 5
  /// A word takes a moment; silence after it means the learner is done.
  private static let silenceTimeout: TimeInterval = 1.2
  /// A hard stop, so a noisy room cannot keep the microphone open forever.
  private static let maximumRecordingTime: TimeInterval = 12
  /// How long the final transcription may take once the audio has ended.
  private static let finalResultTimeout: TimeInterval = 2.5
  private static let maximumResults = 5

  private let stateQueue = DispatchQueue(label: "com.gustavoem.saylens.speech")
  private let audioEngine = AVAudioEngine()

  private var recognizer: SFSpeechRecognizer?
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var task: SFSpeechRecognitionTask?
  private var pendingResolve: RCTPromiseResolveBlock?
  private var pendingReject: RCTPromiseRejectBlock?
  private var silenceTimer: DispatchSourceTimer?
  private var deadlineTimer: DispatchSourceTimer?
  private var heardAnything = false
  /// How loud the microphone is hearing the room, from 0 to 1, written on the
  /// audio tap and read from the interface's queue while it draws the level.
  private let levelLock = NSLock()
  private var latestLevel: Float = 0

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(isAvailable:reject:)
  func isAvailable(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(SFSpeechRecognizer() != nil)
  }

  /// Android answers this from a permission that JavaScript can request on its
  /// own. iOS has no such call from JavaScript, so an undecided permission is
  /// requested here and the answer is the outcome of that request.
  @objc(hasPermission:reject:)
  func hasPermission(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Self.requestSpeechAuthorization { speechGranted in
      guard speechGranted else {
        resolve(false)
        return
      }

      Self.requestMicrophoneAuthorization { microphoneGranted in
        resolve(microphoneGranted)
      }
    }
  }

  @objc(listen:resolve:reject:)
  func listen(
    _ languageTag: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    stateQueue.async { [weak self] in
      guard let self else {
        reject(ErrorCode.cancelled, "The recording was cancelled.", nil)
        return
      }

      guard self.pendingResolve == nil else {
        reject(ErrorCode.busy, "Another recording is still running.", nil)
        return
      }

      guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
        reject(ErrorCode.permission, "Speech recognition permission was not granted.", nil)
        return
      }

      guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: languageTag)) else {
        reject(
          ErrorCode.language,
          "Speech recognition does not support \(languageTag) on this device.",
          nil
        )
        return
      }

      guard recognizer.isAvailable else {
        reject(ErrorCode.unavailable, "Speech recognition is unavailable right now.", nil)
        return
      }

      self.pendingResolve = resolve
      self.pendingReject = reject
      self.recognizer = recognizer
      self.heardAnything = false

      do {
        try self.startRecording(with: recognizer)
      } catch {
        self.settleRejecting(
          code: ErrorCode.recognition,
          message: "The microphone could not be started.",
          error: error
        )
      }
    }
  }

  /// Ends the recording and keeps whatever was said. Tapping the microphone a
  /// second time is how a learner says "that was it", and waiting out a
  /// silence timer after a word is already spoken is time spent for nothing.
  @objc(stop:reject:)
  func stop(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    stateQueue.async { [weak self] in
      guard let self else {
        resolve(nil)
        return
      }

      if self.pendingResolve != nil { self.finishAfterSilence() }
      resolve(nil)
    }
  }

  @objc(cancel:reject:)
  func cancel(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    stateQueue.async { [weak self] in
      guard let self else {
        resolve(nil)
        return
      }

      self.settleRejecting(
        code: ErrorCode.cancelled,
        message: "The recording was cancelled.",
        error: nil
      )
      resolve(nil)
    }
  }

  // MARK: - Recording

  private func startRecording(with recognizer: SFSpeechRecognizer) throws {
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(.record, mode: .measurement, options: [.duckOthers])
    try session.setActive(true, options: .notifyOthersOnDeactivation)

    let request = SFSpeechAudioBufferRecognitionRequest()
    // Partial results never leave this module. They are what tells the silence
    // timer that the learner is still speaking.
    request.shouldReportPartialResults = true
    if recognizer.supportsOnDeviceRecognition {
      request.requiresOnDeviceRecognition = true
    }
    self.request = request

    let input = audioEngine.inputNode
    let format = input.outputFormat(forBus: 0)
    input.removeTap(onBus: 0)
    input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
      request.append(buffer)
      self?.recordLevel(of: buffer)
    }

    audioEngine.prepare()
    try audioEngine.start()

    task = recognizer.recognitionTask(with: request) { [weak self] result, error in
      self?.stateQueue.async {
        self?.handle(result: result, error: error)
      }
    }

    startSilenceTimer(waiting: Self.firstWordTimeout)
    startDeadlineTimer()
  }

  /// The loudness of one buffer, as a number between 0 and 1.
  ///
  /// Speech sits roughly between -50 dB and -10 dB once it reaches the
  /// microphone, so that range is what the bar heights are spread across:
  /// quieter than -50 is silence, louder than -10 is already at the top.
  private func recordLevel(of buffer: AVAudioPCMBuffer) {
    guard let channel = buffer.floatChannelData?[0] else { return }

    let count = Int(buffer.frameLength)
    guard count > 0 else { return }

    var sum: Float = 0
    for index in 0..<count {
      let sample = channel[index]
      sum += sample * sample
    }

    let meanSquare = sum / Float(count)
    guard meanSquare > 0 else {
      setLevel(0)
      return
    }

    let decibels = 10 * log10f(meanSquare)
    let level = min(max((decibels + 50) / 40, 0), 1)

    setLevel(level)
  }

  private func setLevel(_ level: Float) {
    levelLock.lock()
    latestLevel = level
    levelLock.unlock()
  }

  private func currentLevel() -> Float {
    levelLock.lock()
    defer { levelLock.unlock() }
    return latestLevel
  }

  @objc(level:reject:)
  func level(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(NSNumber(value: currentLevel()))
  }

  private func handle(result: SFSpeechRecognitionResult?, error: Error?) {
    guard pendingResolve != nil else { return }

    if let result {
      if result.isFinal {
        settleResolving(with: Self.transcriptions(from: result))
        return
      }

      // The recogniser reports partial results before it has heard a word, and
      // an empty one is not something said.
      let spoken = !result.bestTranscription.formattedString
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .isEmpty
      guard spoken else { return }

      heardAnything = true
      // Something was said, so the countdown to silence starts again, now
      // measured as a pause rather than as a wait for the first word.
      startSilenceTimer(waiting: Self.silenceTimeout)
      return
    }

    guard let error else { return }

    // A recogniser that ends without hearing anything reports an error, which
    // is a silent attempt rather than a failure worth showing.
    if !heardAnything {
      settleRejecting(
        code: ErrorCode.noMatch,
        message: "No speech was recognised.",
        error: nil
      )
      return
    }

    settleRejecting(
      code: ErrorCode.recognition,
      message: "Speech recognition failed.",
      error: error
    )
  }

  private func finishAfterSilence() {
    guard pendingResolve != nil else { return }

    // Ending the audio makes the recogniser deliver its final result, which is
    // what the pending promise is waiting for.
    stopAudio()

    guard heardAnything else {
      settleRejecting(
        code: ErrorCode.noMatch,
        message: "No speech was recognised.",
        error: nil
      )
      return
    }

    // The final transcription arrives after the audio ends. If the recogniser
    // never delivers it, the attempt is closed rather than left hanging.
    request?.endAudio()
    startFinalResultTimer()
  }

  private static func transcriptions(from result: SFSpeechRecognitionResult) -> [String] {
    var seen = Set<String>()
    var ordered: [String] = []

    for transcription in result.transcriptions {
      let text = transcription.formattedString.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !text.isEmpty, seen.insert(text.lowercased()).inserted else { continue }

      ordered.append(text)
      if ordered.count == maximumResults { break }
    }

    if ordered.isEmpty {
      let best = result.bestTranscription.formattedString
        .trimmingCharacters(in: .whitespacesAndNewlines)
      if !best.isEmpty { ordered.append(best) }
    }

    return ordered
  }

  // MARK: - Timers and teardown

  private func startSilenceTimer(waiting timeout: TimeInterval) {
    silenceTimer?.cancel()
    let timer = DispatchSource.makeTimerSource(queue: stateQueue)
    timer.schedule(deadline: .now() + timeout)
    timer.setEventHandler { [weak self] in self?.finishAfterSilence() }
    timer.resume()
    silenceTimer = timer
  }

  /// Waits a moment for the final transcription after the audio was ended.
  private func startFinalResultTimer() {
    deadlineTimer?.cancel()
    let timer = DispatchSource.makeTimerSource(queue: stateQueue)
    timer.schedule(deadline: .now() + Self.finalResultTimeout)
    timer.setEventHandler { [weak self] in
      self?.settleRejecting(
        code: ErrorCode.noMatch,
        message: "No speech was recognised.",
        error: nil
      )
    }
    timer.resume()
    deadlineTimer = timer
    silenceTimer?.cancel()
    silenceTimer = nil
  }

  private func startDeadlineTimer() {
    deadlineTimer?.cancel()
    let timer = DispatchSource.makeTimerSource(queue: stateQueue)
    timer.schedule(deadline: .now() + Self.maximumRecordingTime)
    timer.setEventHandler { [weak self] in self?.finishAfterSilence() }
    timer.resume()
    deadlineTimer = timer
  }

  private func stopAudio() {
    if audioEngine.isRunning {
      audioEngine.stop()
      audioEngine.inputNode.removeTap(onBus: 0)
    }
  }

  /// Every exit runs through these two: timers cancelled, microphone
  /// released, and the pending promise answered exactly once.
  private func settleResolving(with transcriptions: [String]) {
    guard let resolve = pendingResolve else { return }

    teardown()
    resolve(transcriptions)
  }

  private func settleRejecting(code: String, message: String, error: Error?) {
    guard let reject = pendingReject else { return }

    teardown()
    reject(code, message, error)
  }

  private func teardown() {
    setLevel(0)
    silenceTimer?.cancel()
    silenceTimer = nil
    deadlineTimer?.cancel()
    deadlineTimer = nil

    stopAudio()
    request?.endAudio()
    request = nil
    task?.cancel()
    task = nil
    recognizer = nil

    pendingResolve = nil
    pendingReject = nil

    try? AVAudioSession.sharedInstance().setActive(
      false,
      options: .notifyOthersOnDeactivation
    )
  }

  // MARK: - Permissions

  private static func requestSpeechAuthorization(_ completion: @escaping (Bool) -> Void) {
    switch SFSpeechRecognizer.authorizationStatus() {
    case .authorized:
      completion(true)
    case .notDetermined:
      SFSpeechRecognizer.requestAuthorization { status in
        completion(status == .authorized)
      }
    default:
      completion(false)
    }
  }

  private static func requestMicrophoneAuthorization(_ completion: @escaping (Bool) -> Void) {
    if #available(iOS 17.0, *) {
      switch AVAudioApplication.shared.recordPermission {
      case .granted:
        completion(true)
      case .undetermined:
        AVAudioApplication.requestRecordPermission(completionHandler: completion)
      default:
        completion(false)
      }
      return
    }

    let session = AVAudioSession.sharedInstance()
    switch session.recordPermission {
    case .granted:
      completion(true)
    case .undetermined:
      session.requestRecordPermission(completion)
    default:
      completion(false)
    }
  }
}
