# The iOS native layer

This document is about the Swift half of SayLens: what runs natively on iOS,
why it is shaped the way it is, and what has and has not been proven on a
device.

## Where the code lives

```text
ios/
  SayLens.xcodeproj/                Application project
  SayLens/
    AppDelegate.swift               React Native entry point
    Info.plist                      Camera, microphone, and speech usage strings
    Pronunciation/                  SayLensPronunciation native module
    Speech/                         SayLensSpeechRecognition native module
  Podfile                           Autolinked pods for the application target

modules/vision-object-detector/
  ios/                              The Nitro detector, in Swift
  SayLensObjectDetector.podspec     Pod for the detector, linked from node_modules
```

## How this fits the app's architecture

SayLens is a React Native app with a feature-first Clean Architecture and MVVM
inside its presentation layer ([ADR-0001](adr/0001-feature-first-clean-architecture.md),
[ADR-0005](adr/0005-mvvm-and-styled-components.md)). The Swift code here is not
a second app beside it. It is the iOS implementation of ports the learning
feature already declares:

```text
domain          LearningLanguage, DetectedObject, PronunciationAttempt …
application     CameraAccess, PronunciationPlayer, SpeechRecognizer, …  (ports)
presentation    Views + ViewModels                                      (MVVM)
infrastructure  TypeScript adapters ─┬─ Android: Kotlin
                                     └─ iOS: the Swift in this document
```

So there is no `CameraViewModel.swift` and no SwiftUI view, and that absence is
deliberate. The ViewModels are the app's, they already exist once in
TypeScript, and every screen is rendered by React Native. Writing a second set
in Swift would mean two implementations of the same state machine to keep in
step, which is the failure MVVM is supposed to prevent, not cause.

What MVVM does dictate here is the boundary. The Swift code answers questions
and returns typed values. It holds no product state, decides nothing about
navigation, keeps no vocabulary, and never talks to a view. Each module is one
adapter behind one port:

| Port (TypeScript)     | iOS module                 | Native API           |
| --------------------- | -------------------------- | -------------------- |
| detector contract     | `SayLensObjectDetector`    | Vision               |
| `SpeechRecognizer`    | `SayLensSpeechRecognition` | Speech, AVFoundation |
| `PronunciationPlayer` | `SayLensPronunciation`     | AVFoundation         |
| `CameraAccess`        | VisionCamera               | AVFoundation         |

Within the detector the same separation is applied again, so the scheduling
rules can be read without reading inference code:

```text
SayLensVisionDetector   the Nitro boundary: unwrap a frame, orient it, hand it over
DetectorWorkerPool      which worker gets a frame, which result is current
DetectorWorker          one Vision pipeline on one serial queue
FrameCopier             pixels the capture session is about to reuse
VisionTaxonomy          Vision identifiers to the app's vocabulary labels
DetectionMapper         Vision coordinates to the contract JavaScript reads
DetectorConfiguration   the numbers, in one place
```

## The detector

### Why Vision and not the Android model

Recorded in full in [ADR-0009](adr/0009-ios-vision-detector.md). In short: the
Android build bundles EfficientDet-Lite0 and its 80 COCO labels, every one of
them curated in the dictionary; iOS reads Apple's Vision taxonomy of 1303
labels that already ships with the operating system, 72 of which map onto that
same dictionary. Nothing is added to the download, and a learner pointing at a mug, a
desk, or a plant gets a box instead of nothing.

### Two phases per frame

1. **Where.** `VNGenerateObjectnessBasedSaliencyImageRequest` returns
   class-agnostic boxes around whatever stands out. This phase does not care
   what the objects are, which is exactly why the app is no longer limited to a
   fixed class list.
2. **What.** One `VNClassifyImageRequest` per box, with the box as its
   `regionOfInterest`, run together in a single `perform` call. Results are
   filtered by Apple's precision and recall curves rather than a raw confidence
   number.

Boxes are inflated by 6% before classification: objectness boxes hug the
subject, and a classifier reads a little context better than a tight crop.

When several labels survive the filter for one box, the one the app's
dictionary knows wins over a more confident one it does not. A known label
carries a meaning, a pronunciation, and an example; an unknown one carries a
word alone.

### Frame ownership

`detect` is called on VisionCamera's frame queue with a `CMSampleBuffer` the
capture session owns and recycles the moment the call returns. Inference
outlives that call, so the pixels are copied first, on the calling queue, into
a buffer this module owns. Each worker keeps one destination buffer and resizes
it only when the camera resolution changes, because allocating a megabyte per
frame at thirty frames a second is work for nothing.

### Scheduling

The pool offers a frame to each worker in turn, starting after the one that
took the previous frame. If every worker is busy the frame is dropped on
purpose: a queue would only make results older, and an overlay drawn from an
old result is what makes a card look detached from the object under it. `detect`
never waits — it returns whatever finished in the meantime, and each finished
batch is delivered exactly once.

Results can finish out of order when several workers run at once, so a batch
carries the sequence number of the frame it came from and an older one never
replaces a newer one already published.

### Orientation

Vision is told how the buffer is oriented and answers in the upright image's
coordinate space. That matters for accuracy — an upside-down chair is a much
harder chair — and it means the iOS batch reports a rotation of zero and swaps
the frame dimensions on a quarter turn. The rotation field stays in the shared
contract for Android, where the frame reaches JavaScript unrotated.

### Maximum performance

The performance profile arrives from the app's settings screen and maps to the
worker count, which is the only knob iOS has:

| Profile             | Workers                         | Queue quality of service |
| ------------------- | ------------------------------- | ------------------------ |
| Maximum performance | every logical core, capped at 6 | `userInitiated`          |
| Power saving        | 1                               | `utility`                |

There is no delegate to choose. Vision routes the work to the Neural Engine,
the GPU, or the CPU by itself, so `getSupportsGpuDelegate` answers `false` and
the settings screen does not offer a switch that changes nothing. A worker on
iOS is therefore a pipeline rather than a thread: extra workers overlap the
CPU-side work around inference — buffer copies, request setup, result mapping —
rather than multiplying inference itself, because the Neural Engine is shared.

No core is held back for the camera. AVFoundation runs capture on its own
real-time queues, which sit above the detector queues in quality of service, so
the scheduler already protects the preview from a saturated pool.

## Speech recognition

`SayLensSpeechRecognition` answers the same four calls as the Android module,
with the same error codes, so the TypeScript adapter has no platform branch.

Two behaviours are genuinely different and deliberate:

- **Permission.** On Android, JavaScript can request the microphone itself, so
  the native `hasPermission` only reports. iOS has no such call from
  JavaScript, so an undecided permission is requested here — speech
  authorisation first, then the microphone — and the answer is the outcome of
  that request.
- **Ending the recording.** Android's recogniser stops on silence by itself.
  Apple's does not, so this module runs the clock: 1.2 seconds without a new
  partial result ends the audio, a hard stop at 8 seconds protects a noisy
  room, and a further 2.5 seconds is allowed for the final transcription before
  the attempt is closed as silent. Partial results never leave the module —
  they exist to tell the silence timer that the learner is still speaking.

On-device recognition is requested wherever the language supports it, which
keeps the recording on the phone.

Every exit runs through one place that cancels the timers, releases the
microphone, deactivates the audio session, and answers the pending promise
exactly once.

## Pronunciation

`SayLensPronunciation` speaks one word with `AVSpeechSynthesizer`. The rate
arriving from JavaScript is a multiple of a normal speaking pace, which is what
Android's `setSpeechRate` takes; on iOS the normal pace is
`AVSpeechUtteranceDefaultSpeechRate`, so the multiple is applied to it rather
than used as-is.

A voice is looked up for the exact tag first, so `en-GB` is not answered in a
US accent, and only then for the language behind it. A new word replaces the
one playing rather than queueing behind it, matching `QUEUE_FLUSH` on Android.
The session is `playback` with `spokenAudio` and ducking, so pronunciation is
audible through the silent switch — it is the point of the screen — and other
audio is lowered rather than stopped.

## Building and running

Requirements: Xcode 26 or newer, CocoaPods, and the same Node toolchain the
Android build uses.

```sh
npm ci
cd ios && pod install
```

Then open `ios/SayLens.xcworkspace` — the workspace, not the project — or run:

```sh
npm start
npx react-native run-ios --device
```

The camera, the microphone, and speech recognition all need a physical device.
The simulator builds and launches, and its camera is a static image, so the
detector has nothing to recognise there.

To check that the whole native layer still compiles without opening Xcode:

```sh
xcodebuild -workspace ios/SayLens.xcworkspace -scheme SayLens \
  -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' build
```

## Status

Seen working on an iPhone 17 Pro simulator:

- the app builds, launches, and renders, and navigation and storage work;
- the detector is constructed on start-up and opens one worker per logical
  core;
- a worker that cannot run its Vision requests logs the failure and leaves the
  rest of the pool alone. The simulator proves that path by accident: it
  cannot create an Espresso context for these requests at all.

Written and compiling, not yet exercised:

- the two recognition phases, since Vision's models do not run in the
  simulator;
- both native modules and their permission flows, which need a real microphone;
- the taxonomy table, whose 109 identifiers come from Vision's own list and
  cover 72 of the dictionary's 80 labels.

Not yet done, and honest about it:

- no latency, throughput, or thermal numbers from a physical iPhone;
- the alias table has not been checked against what the classifier actually
  returns in a room, only against the identifiers Vision publishes;
- the app's dictionary describes 80 labels, so recognitions outside that set
  reach the learner as a bare English word on a generic card;
- eight curated labels have no Vision identifier at all: baseball glove, hair
  drier, parking meter, remote, stop sign, tennis racket, toothbrush, and wine
  glass;
- the app icon is still the empty one from the React Native template, so the
  build installs without artwork.

The evidence to collect first is in [ADR-0009](adr/0009-ios-vision-detector.md)
under Validation.
