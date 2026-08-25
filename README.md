# SayLens

SayLens is an Android-first React Native side project that turns the camera
into an interactive English-learning experience.

Point the device at everyday objects and see a compact English-learning card
anchored over each object with its meaning and pronunciation.

> Status: the first on-device learning slice is operational. The Android app
> streams camera frames to EfficientDet and maps detections into live vocabulary
> overlays without sending images to a server.

<p align="center">
  <img src="docs/assets/android-camera-settings.png" alt="SayLens camera settings running on a physical Samsung device" width="320" />
</p>

## Screens

Captured on a physical Samsung SM-M536B running Android 14.

<table>
  <tr>
    <td align="center" width="20%">
      <img src="docs/assets/android-camera-card.png" alt="Learning card anchored over a detected laptop" width="180" /><br />
      <sub><b>Camera</b><br />A card per detected object, with the example sentence in the language being learned</sub>
    </td>
    <td align="center" width="20%">
      <img src="docs/assets/android-collection.png" alt="Collection screen with rooms and progress" width="180" /><br />
      <sub><b>Collection</b><br />Streak, level, and one room per set of objects to find</sub>
    </td>
    <td align="center" width="20%">
      <img src="docs/assets/android-history.png" alt="History coloured by pronunciation outcome" width="180" /><br />
      <sub><b>History</b><br />Words coloured by pronunciation outcome, filtered by it</sub>
    </td>
    <td align="center" width="20%">
      <img src="docs/assets/android-speak.png" alt="Speaking practice screen" width="180" /><br />
      <sub><b>Speak</b><br />Say the word and compare it with the device recogniser</sub>
    </td>
    <td align="center" width="20%">
      <img src="docs/assets/android-quiz.png" alt="Practice round asking a word by its definition" width="180" /><br />
      <sub><b>Practice</b><br />A round of ten questions drawn from words already met</sub>
    </td>
  </tr>
</table>

## Product journey

1. Detect common objects in the live camera preview.
2. Render a stable learning card over each detected object.
3. Show the English word, pronunciation, meaning, and confidence in real time.
4. Preserve the object and learning context in the same camera view.
5. Pronounce the word using the device speech service.

The first experience is designed to work on-device and without a backend.

## Technical direction

- Android first, tested on physical devices.
- React Native using a feature-first Clean Architecture.
- MVVM inside the presentation layer, with views free of platform SDKs.
- styled-components for the shared theme and declarative UI styling.
- VisionCamera 5 for the camera session and frame output.
- A local Android Nitro/Kotlin adapter for inference.
- MediaPipe Tasks with EfficientDet-Lite0 int8 for the first detector.
- React Native learning overlays with metadata presentation bounded at 30 Hz.
- A local vocabulary catalog for the first common-object labels.
- Reanimated UI-thread interpolation for live detection geometry.
- Stable object tracking, adaptive detector scheduling, and device
  text-to-speech as the next product and performance steps.

These are recorded decisions rather than hidden assumptions. Read the
[architecture](docs/ARCHITECTURE.md) and the
[Architecture Decision Records](docs/adr/README.md) for context and trade-offs.

### Physical-device performance snapshot

The performance-first debug configuration was measured on a Samsung SM-M536B
running Android 14. Four bounded native workers processed 29.8 to 30.2 detector
frames per second while the camera preview remained at approximately 30 FPS.
This intentionally favors modern hardware: the measured process cost was about
324% to 339% CPU and 529 to 533 MB resident memory. Reproducible context and
limitations are in [physical-device validation](docs/VALIDATION.md).

### Performance engineering lab

The next phase treats this workload as a mobile performance case study rather
than optimizing for a single FPS number. It will compare worker counts,
allocation pressure, result freshness, React and UI-thread cost, sustained
thermals, startup, and release size using repeatable physical-device runs.

See the [performance engineering strategy](docs/PERFORMANCE.md).

## Repository layout

```text
src/
  app/                    Shell, theme, navigation, and app ViewModel
  features/learning/      Domain, use cases, adapters, Views, and ViewModels
  shared/                 Proven cross-feature primitives only

android/                  Android application and native build configuration

modules/
  vision-object-detector/ Android Nitro/Kotlin boundary

docs/
  adr/                    Architecture Decision Records
  assets/                 Visual evidence captured from physical devices
```

The camera SDK is isolated in the learning infrastructure layer. Presentation
Views receive plain state and callbacks from ViewModels, while `app` composes
the concrete camera adapter, navigation, and theme.

## Run the Android app

Requirements:

- Node.js 24.11.1 (pinned in `.nvmrc`) and npm 11.6.2;
- JDK 17;
- Android SDK Platform 37 and Build Tools 37.0.0;
- an Android device with USB debugging enabled.

Install dependencies and run the complete local quality gate:

```sh
nvm use
npm ci
npm run validate
```

Start Metro in one terminal:

```sh
npm start
```

List devices, forward Metro to the selected physical device, and run the app in
another terminal:

```sh
adb devices -l
adb -s <device-serial> reverse tcp:8081 tcp:8081
npm run android -- --device <device-serial>
```

The first launch requests camera permission. Switching to Settings pauses the
native camera session; returning to Camera resumes it without remounting the
feature screen.

Object detection runs locally. The first Android build packages the pinned
EfficientDet model, so no model download or backend is required at runtime.
The model source, limitations, and checksum are recorded in the
[model card](modules/vision-object-detector/MODEL_CARD.md).

The first build may install the pinned Android SDK components and download the
Gradle distribution. See the reproducible baseline record in
[physical-device validation](docs/VALIDATION.md).

## Roadmap

The work is split into evidence-producing milestones: repository foundation,
Android baseline, camera pipeline, native detection, interactive overlay,
learning experience, performance engineering, and public release.

See the [roadmap and acceptance criteria](docs/ROADMAP.md).

## Documentation

- [Architecture and dependency rules](docs/ARCHITECTURE.md)
- [Architecture Decision Records](docs/adr/README.md)
- [Roadmap](docs/ROADMAP.md)
- [Physical-device validation](docs/VALIDATION.md)
- [Performance engineering strategy](docs/PERFORMANCE.md)
- [Contribution workflow](CONTRIBUTING.md)

## Contributing

The project will be public and welcomes technical discussion. Before opening a
change, read [CONTRIBUTING.md](CONTRIBUTING.md), preserve the dependency rule,
and keep commits small and semantic.

## License

A license will be selected before the first public release. Until then, no
permission to copy, modify, or redistribute the code is granted by default.
