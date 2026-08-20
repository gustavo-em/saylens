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

Status: next

- create the React Native Android application with the New Architecture;
- pin Node, Java, Gradle, Android SDK, React Native, and package-manager versions;
- add linting, formatting, type checking, and unit-test commands;
- create a minimal application shell through the `app` composition root;
- verify a debug build on a physical Android device.

Acceptance criteria:

- a clean checkout can follow documented setup steps;
- all quality commands run locally;
- the Android debug app launches without camera or ML dependencies.

## Milestone 2: Camera pipeline

Status: planned

- integrate VisionCamera 5 and camera permission handling;
- render the back-camera preview;
- configure a low-resolution FrameOutput independently from the preview;
- add asynchronous frame backpressure and lifecycle instrumentation;
- document frame disposal and orientation behavior.

Acceptance criteria:

- preview remains responsive for a five-minute session;
- busy processing drops frames rather than creating a queue;
- no raw pixel buffer reaches the JavaScript thread.

## Milestone 3: Native object detection

Status: planned

- scaffold the Android Nitro detector module;
- record the selected model source, version, license, and checksum;
- integrate MediaPipe Tasks and EfficientDet-Lite0 int8;
- map native results to the typed detector contract;
- measure inference latency on physical hardware.

Acceptance criteria:

- common test objects produce labels, scores, and bounding boxes;
- model resources close correctly across reload and camera deactivation;
- latency percentiles and device details are documented.

## Milestone 4: Stable interactive overlay

Status: planned

- convert frame coordinates into preview coordinates;
- assign stable track identities using label and bounding-box overlap;
- smooth visual position and size on the UI thread;
- render accessible, clickable labels;
- handle stale detections and selection deterministically.

Acceptance criteria:

- overlays align through orientation and preview crop scenarios;
- labels remain visually stable during ordinary hand movement;
- tapping the visible target selects the expected object.

## Milestone 5: Learning experience

Status: planned

- define the first curated vocabulary catalog for supported detector labels;
- show word, pronunciation, meaning, and example sentence;
- integrate device text-to-speech;
- add loading, unknown-label, permission, and failure states;
- polish motion, haptics, and visual hierarchy.

Acceptance criteria:

- the critical journey works offline after installation;
- every supported visible label has reviewed learning content;
- pronunciation and details remain usable with the camera paused.

## Milestone 6: Public technical release

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
