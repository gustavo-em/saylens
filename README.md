# SpellForMe

SpellForMe is an Android-first React Native side project that turns the camera
into an interactive English-learning experience.

Point the device at everyday objects, see an English label anchored over each
object, and tap a label to learn its meaning and pronunciation.

> Status: Milestone 2 in progress. The app opens directly on the live rear
> camera, with permission handling and Camera/Settings navigation validated on
> a physical Android device.

<p align="center">
  <img src="docs/assets/android-camera-settings.png" alt="SpellForMe camera settings running on a physical Samsung device" width="320" />
</p>

## Product journey

1. Detect common objects in the live camera preview.
2. Render a stable, clickable label over each detected object.
3. Select an object without losing its visual context.
4. Show the English word, pronunciation, meaning, and an example sentence.
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
- React Native overlays with UI-thread animation and native press handling.
- Local vocabulary content and device text-to-speech for the MVP.

These are recorded decisions rather than hidden assumptions. Read the
[architecture](docs/ARCHITECTURE.md) and the
[Architecture Decision Records](docs/adr/README.md) for context and trade-offs.

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

The first build may install the pinned Android SDK components and download the
Gradle distribution. See the reproducible baseline record in
[physical-device validation](docs/VALIDATION.md).

## Roadmap

The work is split into evidence-producing milestones: repository foundation,
Android baseline, camera pipeline, native detection, interactive overlay,
learning experience, and public release.

See the [roadmap and acceptance criteria](docs/ROADMAP.md).

## Documentation

- [Architecture and dependency rules](docs/ARCHITECTURE.md)
- [Architecture Decision Records](docs/adr/README.md)
- [Roadmap](docs/ROADMAP.md)
- [Physical-device validation](docs/VALIDATION.md)
- [Contribution workflow](CONTRIBUTING.md)

## Contributing

The project will be public and welcomes technical discussion. Before opening a
change, read [CONTRIBUTING.md](CONTRIBUTING.md), preserve the dependency rule,
and keep commits small and semantic.

## License

A license will be selected before the first public release. Until then, no
permission to copy, modify, or redistribute the code is granted by default.
