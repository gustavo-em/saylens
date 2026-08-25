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

### The same model as Android

iOS runs MediaPipe Tasks with the EfficientDet-Lite0 int8 model already in this
repository, read from the same file the Android build packages. The reasoning,
and the Vision-based design it replaced, are in
[ADR-0010](adr/0010-ios-shares-the-android-detector.md) and
[ADR-0009](adr/0009-ios-vision-detector.md).

Recognition is therefore identical on both platforms: the same 80 COCO labels,
the same score threshold, the same result ceiling, and every label backed by a
curated word, meaning, pronunciation, and example.

### What happens to a frame

```text
VisionCamera hands over a CMSampleBuffer on its frame queue
  → the pool offers it to the first idle worker, or drops it
  → the worker copies it: stood upright, shrunk to 640 on the long side
  → MediaPipe reads the copy and returns boxes in that copy's pixels
  → the pool carries names and boxes forward from the last frame
  → the batch reports the copy's size and no rotation
```

Three of those steps were bought with device evidence rather than reasoning,
and each one hid the next while it was wrong.

**The copy owns its pixels.** The camera recycles its buffer the moment the
frame callback returns, so the pixels are copied on the calling queue before
inference is dispatched. Each worker keeps one destination buffer and resizes
it only when the camera resolution or the way the phone is held changes.

**The copy stands the image up, by hand.** The sensor delivers landscape
buffers while the learner holds the phone in portrait, and a detector reads a
scene lying on its side far worse than one the right way up. The rotation is a
plain loop over pixels: the Accelerate path that would have done it produced a
black buffer on the device while behaving correctly on a Mac, and a loop that
can be read is worth more here than one that cannot be explained.

**The rotation direction is not the Core Graphics one.** VisionCamera names the
turn that stands a frame up rather than naming where the top of the picture
ended up, so a frame reported as `left` needs a quarter turn clockwise. This
was settled by capturing a frame off the device and rotating it both ways until
one matched the preview.

**The copy is also shrunk**, to 640 pixels on the long side. The model reads
320 by 320, so two megapixels of camera frame are thrown away by its own
preprocessing anyway, and the rotation loop costs proportionally less.

**Boxes belong to the copy, not to the camera frame.** The batch reports the
copy's dimensions and a rotation of zero, because the image was already stood
up before the model saw it. Reporting the camera's own size here, or a rotation
on top of one already applied, is what put every card in the same corner of the
screen.

### Scheduling

The pool offers a frame to each worker in turn, starting after the one that
took the previous frame. If every worker is busy the frame is dropped on
purpose: a queue would only make results older, and an overlay drawn from an
old result is what makes a card look detached from the object under it.
`detect` never waits — it returns whatever finished in the meantime, and each
finished batch is delivered exactly once.

Results can finish out of order when several workers run at once, so a batch
carries the sequence number of the frame it came from; an older one never
replaces a newer one already published, and never disturbs what is being
tracked.

### Steadiness

The model reads every frame from scratch, so the same still object comes back
with edges a few pixels apart and, now and then, a different name. The pool
carries the last published frame forward: a new box that overlaps an old one by
40% or more is the same object, its position is the average of the two, and its
name only changes when the model is at least 0.1 more confident than it was.
One bad frame no longer renames the object under the learner's card.

### Maximum performance

The performance profile arrives from the app's settings screen and maps to the
worker count:

| Profile             | Workers                         | Queue quality of service |
| ------------------- | ------------------------------- | ------------------------ |
| Maximum performance | every logical core, capped at 6 | `userInitiated`          |
| Power saving        | 1                               | `utility`                |

Every worker runs on the CPU. MediaPipe's iOS delegate is Metal rather than the
OpenCL path that aborted processes on Android, so it is a reasonable next
experiment, but it is not one this build has measured.

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

Working on a physical iPhone 13 (A15, iOS 18.6.2), Release build:

- the camera, the detector, and the overlay run end to end, and objects are
  recognised and named as they are on Android;
- measured at 49.9 detections delivered per second, median inference 33 ms,
  p95 38 ms, with six workers — against 19.7 per second and 114 ms median for
  the Vision design that preceded it;
- the two native modules build and register, and their permission flows have
  been exercised as far as the camera and microphone prompts.

Not measured yet:

- thermals and battery over a sustained session;
- MediaPipe's Metal delegate, which is offered nowhere until it is;
- speech recognition and pronunciation over a long session on the device.

The app icon is still the empty one from the React Native template, so the
build installs without artwork.
