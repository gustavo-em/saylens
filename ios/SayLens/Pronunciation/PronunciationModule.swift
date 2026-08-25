//
//  PronunciationModule.swift
//  SayLens
//
//  Speaks a single word with the system voice. The contract is the one the
//  Android module already answers, so the JavaScript adapter does not branch
//  per platform: speak resolves once the utterance is accepted, not once it
//  finishes playing.
//

import AVFoundation
import Foundation
import React

@objc(SayLensPronunciation)
final class PronunciationModule: NSObject {
  private let synthesizer = AVSpeechSynthesizer()

  /// The rate arriving from JavaScript is a multiple of a normal speaking
  /// pace, which is what Android's `setSpeechRate` takes. On iOS the normal
  /// pace is `AVSpeechUtteranceDefaultSpeechRate`, so the multiple is applied
  /// to it instead of being used as-is.
  private static let minimumRate = 0.5
  private static let maximumRate = 1.5

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(speak:languageTag:rate:resolve:reject:)
  func speak(
    _ text: String,
    languageTag: String,
    rate: NSNumber,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let word = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !word.isEmpty else {
      reject("E_PRONUNCIATION_INVALID_TEXT", "The pronunciation text cannot be empty.", nil)
      return
    }

    guard let voice = Self.resolveVoice(for: languageTag) else {
      reject(
        "E_PRONUNCIATION_LANGUAGE",
        "The requested speech language is not installed on this device.",
        nil
      )
      return
    }

    let utterance = AVSpeechUtterance(string: word)
    utterance.voice = voice
    utterance.rate = Self.utteranceRate(from: rate.doubleValue)

    DispatchQueue.main.async { [weak self] in
      guard let self else {
        reject("E_PRONUNCIATION_SPEAK", "The system speech engine is closed.", nil)
        return
      }

      do {
        try Self.activatePlaybackSession()
      } catch {
        reject("E_PRONUNCIATION_SPEAK", "The audio session could not be configured.", error)
        return
      }

      // A new word replaces the previous one rather than queueing behind it,
      // which is what QUEUE_FLUSH does on Android.
      if self.synthesizer.isSpeaking {
        self.synthesizer.stopSpeaking(at: .immediate)
      }
      self.synthesizer.speak(utterance)
      resolve(nil)
    }
  }

  @objc(stop:reject:)
  func stop(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async { [weak self] in
      self?.synthesizer.stopSpeaking(at: .immediate)
      resolve(nil)
    }
  }

  /// A voice is asked for the exact tag first, so `en-GB` is not answered with
  /// a US voice, and only then for the language behind it.
  private static func resolveVoice(for languageTag: String) -> AVSpeechSynthesisVoice? {
    if let exact = AVSpeechSynthesisVoice(language: languageTag) {
      return exact
    }

    let language = languageTag.split(separator: "-").first.map(String.init)
    return language.flatMap(AVSpeechSynthesisVoice.init(language:))
  }

  private static func utteranceRate(from requestedRate: Double) -> Float {
    let clamped = min(max(requestedRate, minimumRate), maximumRate)
    let rate = Double(AVSpeechUtteranceDefaultSpeechRate) * clamped
    return Float(min(max(rate, Double(AVSpeechUtteranceMinimumSpeechRate)), Double(AVSpeechUtteranceMaximumSpeechRate)))
  }

  /// Pronunciation is the point of the screen, so it plays through the silent
  /// switch, and it ducks other audio rather than stopping it.
  private static func activatePlaybackSession() throws {
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
    try session.setActive(true, options: [])
  }
}
