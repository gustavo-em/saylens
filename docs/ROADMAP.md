# Roadmap

The roadmap favors small, reviewable milestones that each produce visible
technical evidence. Dates are intentionally omitted until the foundation is
validated on a physical Android device.

## Milestone 0: Repository foundation

Status: complete

- initialize the local Git repository;
- document the product intent;
- define feature-first Clean Architecture boundaries;
- record the initial Android camera and ML decisions;
- establish semantic commits and contribution guidance.

Evidence: documentation, ADRs, repository structure, and atomic history.

## Milestone 1: Android React Native baseline

Status: complete

- create the React Native Android application with the New Architecture;
- pin Node, Java, Gradle, Android SDK, React Native, and package-manager versions;
- add linting, formatting, type checking, and unit-test commands;
- create a minimal application shell through the `app` composition root;
- verify a debug build on a physical Android device.

Acceptance criteria:

- a clean checkout can follow documented setup steps;
- all quality commands run locally;
- the Android debug app launches without camera or ML dependencies.

Evidence: React Native 0.87 app with the New Architecture and Hermes, automated
quality gate, successful debug build, installation, launch, process check, UI
hierarchy check, and screenshot from a physical Android 14 device. See the
[validation record](VALIDATION.md).

## Milestone 2: Camera pipeline

Status: in progress

- [x] integrate VisionCamera 5 and camera permission handling;
- [x] render the back-camera preview;
- [x] add Camera and Settings navigation with camera lifecycle control;
- [x] structure presentation with MVVM and a shared styled-components theme;
- [ ] validate a continuous five-minute preview session;
- [x] configure a low-resolution FrameOutput independently from the preview;
- [x] drop busy frames and dispose them on success and failure paths;
- [x] document frame disposal and orientation mapping behavior.

Acceptance criteria:

- preview remains responsive for a five-minute session;
- busy processing drops frames rather than creating a queue;
- no raw pixel buffer reaches the JavaScript thread.

## Milestone 3: Native object detection

Status: in progress

- [x] scaffold the Android Nitro detector module;
- [x] record the selected model source, version, license, and checksum;
- [x] integrate MediaPipe Tasks and EfficientDet-Lite0 int8;
- [x] map native results to the typed detector contract;
- [x] measure an initial inference sample on physical hardware;
- [ ] record latency percentiles and a known-object physical test set.

Acceptance criteria:

- common test objects produce labels, scores, and bounding boxes;
- model resources close correctly across reload and camera deactivation;
- latency percentiles and device details are documented.

## Milestone 4: Stable interactive overlay

Status: in progress

- [x] convert frame coordinates into preview coordinates;
- [ ] assign stable track identities using label and bounding-box overlap;
- [x] smooth visual position and size on the UI thread;
- [x] render accessible live vocabulary cards;
- [ ] handle stale detections deterministically.

Acceptance criteria:

- overlays align through orientation and preview crop scenarios;
- labels remain visually stable during ordinary hand movement;
- each visible target shows the expected word, meaning, pronunciation, and
  confidence without interaction.

## Milestone 5: Learning experience

Status: in progress

- [x] define the first curated vocabulary catalog for common detector labels;
- [x] show word, pronunciation, meaning, and confidence in the camera layer;
- [ ] integrate device text-to-speech;
- [x] add scanning, unknown-label, permission, and failure states;
- [ ] polish motion, haptics, and visual hierarchy.

Acceptance criteria:

- the critical journey works offline after installation;
- every supported visible label has reviewed learning content;
- pronunciation and details remain usable with the camera paused.

## Milestone 6: Performance engineering evidence

Status: planned

- add a repeatable release benchmark and structured metric capture;
- record detector latency percentiles and end-to-end result freshness;
- measure native allocation pressure and bitmap reuse;
- compare worker counts and detector resolutions against CPU, memory, battery,
  and thermal cost;
- profile React commits and verify UI-thread interpolation behavior;
- validate ten- and thirty-minute physical-device sessions;
- measure cold startup, release size, R8 impact, and 16 KB alignment.

Acceptance criteria:

- before-and-after runs use the same device, scene, build type, and protocol;
- published numbers include distributions and resource costs, not only FPS;
- the chosen configuration is justified by an efficiency curve;
- raw evidence, failed experiments, and limitations are reproducible;
- claims satisfy the [performance publication gate](PERFORMANCE.md).

## Milestone 7: Public technical release

Status: planned

- select and add an open-source license;
- add automated Android and JavaScript quality checks;
- test setup from a clean clone;
- publish performance measurements and known limitations;
- record a concise demo and prepare the technical write-up;
- create the public GitHub repository using the intended personal account.

Acceptance criteria:

- repository history is understandable commit by commit;
- no secret, signing material, or personal local configuration is tracked;
- README explains architecture, setup, trade-offs, and evidence;
- release artifacts link back to reproducible source.
