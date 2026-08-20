# SpellForMe

SpellForMe is an Android-first React Native side project that turns the camera
into an interactive English-learning experience.

Point the device at everyday objects, see an English label anchored over each
object, and tap a label to learn its meaning and pronunciation.

> Status: architecture and repository foundation. Product code and runtime
> dependencies have intentionally not been introduced yet.

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
  app/                    Application shell and dependency composition
  features/learning/      Domain, use cases, adapters, and presentation
  shared/                 Proven cross-feature primitives only

modules/
  vision-object-detector/ Android Nitro/Kotlin boundary

docs/
  adr/                    Architecture Decision Records
```

The directories currently contain documentation instead of placeholder code.
Implementation structure will grow alongside real types and tests.

## Roadmap

The work is split into evidence-producing milestones: repository foundation,
Android baseline, camera pipeline, native detection, interactive overlay,
learning experience, and public release.

See the [roadmap and acceptance criteria](docs/ROADMAP.md).

## Documentation

- [Architecture and dependency rules](docs/ARCHITECTURE.md)
- [Architecture Decision Records](docs/adr/README.md)
- [Roadmap](docs/ROADMAP.md)
- [Contribution workflow](CONTRIBUTING.md)

## Contributing

The project will be public and welcomes technical discussion. Before opening a
change, read [CONTRIBUTING.md](CONTRIBUTING.md), preserve the dependency rule,
and keep commits small and semantic.

## License

A license will be selected before the first public release. Until then, no
permission to copy, modify, or redistribute the code is granted by default.
