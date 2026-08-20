# Architecture

## Purpose

SpellForMe follows a feature-first Clean Architecture. The goal is to keep the
English-learning behavior independent from React Native, VisionCamera,
MediaPipe, Kotlin, storage, and text-to-speech implementations.

The first product slice is the `learning` feature: detect an object, keep its
visual identity stable, select it, and present vocabulary content.

## Dependency rule

Dependencies point inward:

```text
presentation ────────┐
                     ├──> application ───> domain
infrastructure ──────┘

app ──> presentation + application + infrastructure
native module ──> infrastructure adapter contract
```

- `domain` imports no React Native, framework, platform, or infrastructure
  modules.
- `application` depends only on `domain` and declares the ports required by use
  cases.
- `infrastructure` implements those ports using libraries and platform APIs.
- `presentation` invokes application use cases and renders state. It does not
  call VisionCamera, MediaPipe, storage, or speech SDKs directly.
- `app` is the composition root. It creates concrete adapters and injects them
  into the feature.
- `shared` contains intentionally generic primitives. Feature-specific behavior
  must not be moved there for convenience.

## Repository map

```text
src/
  app/                              Composition root and application shell
  features/
    learning/
      domain/                       Business rules and stable types
      application/                  Use cases and ports
      infrastructure/               Camera, detector, dictionary, speech adapters
      presentation/                 Screens, components, hooks, and UI state
  shared/                           Small cross-feature primitives

modules/
  vision-object-detector/           Android Nitro/Kotlin detector boundary

docs/
  adr/                              Architecture Decision Records
```

Folders deeper than these layers are created only when the first real type of
that category is introduced. The project avoids speculative directories and
barrel files.

## Learning feature boundaries

### Domain

The domain owns concepts that remain valid even if the UI and detector change:

- detected object identity;
- object label and confidence;
- normalized bounding box;
- vocabulary entry;
- pronunciation request;
- detection track lifecycle rules.

Expected examples include `DetectedObject`, `BoundingBox`, `VocabularyEntry`,
and repository interfaces. These names are illustrative, not pre-created code.

### Application

The application layer coordinates user intentions and external capabilities:

- observe object detections;
- stabilize or filter detection results;
- load vocabulary details;
- pronounce a selected word;
- start and stop a learning session.

Use cases depend on ports, never concrete adapters. A use case returns plain
domain data and does not return React elements, native frames, or SDK objects.

### Infrastructure

Infrastructure translates external representations into domain types:

- VisionCamera frame source;
- Nitro object-detector bridge;
- detector result mapper;
- local vocabulary repository;
- device text-to-speech adapter.

Raw camera frames must not cross into the application or domain layers.
Platform errors are mapped to application-level failures at this boundary.

### Presentation

Presentation owns the camera screen, animated object overlays, selection
interaction, and object details sheet. It receives view-ready state from feature
controllers/hooks and reports user actions back to application use cases.

High-frequency box positions should use UI-thread animation values. React state
is reserved for lower-frequency changes such as tracks appearing/disappearing
and the selected object changing.

## Native boundary

The Android detector is a local Nitro module, kept outside `src/` so its Kotlin
implementation cannot leak into the feature layers.

Its public contract should remain narrow:

```text
camera frame + timestamp -> label + score + frame-space bounding boxes
```

The native module owns model loading, inference, and resource cleanup. It does
not own UI, navigation, vocabulary content, analytics, or learning rules.

## Runtime data flow

```text
Camera frame
  -> native detector adapter
  -> raw detections
  -> coordinate mapping
  -> track stabilization
  -> presentation state
  -> clickable overlay
  -> selected object
  -> vocabulary lookup and pronunciation
```

Only compact detection metadata crosses the native boundary. Pixel buffers stay
outside the React Native thread.

## Concurrency and backpressure

- Camera preview and inference are independent outputs.
- At most one inference runs at a time.
- A frame is dropped when the inference runner is busy; frames are never queued.
- Native resources are released in success and failure paths.
- The JavaScript thread never performs pixel conversion or model inference.
- UI animation does not depend on React rendering every camera frame.

## Testing boundaries

- `domain`: pure unit tests for values and tracking rules.
- `application`: use-case tests with in-memory fakes.
- `infrastructure`: contract and mapping tests around native payloads.
- `presentation`: component and interaction tests with deterministic state.
- `modules/vision-object-detector`: Kotlin tests for mapping and lifecycle;
  physical-device checks for camera and inference behavior.

End-to-end tests cover the smallest critical journey: grant camera permission,
detect a known object, select its overlay, open details, and request speech.

## Architectural guardrails

1. No platform type outside infrastructure.
2. No business rule inside a React component or Kotlin bridge.
3. No direct SDK import from domain or application.
4. No queue of camera frames.
5. No network dependency for the first vocabulary experience.
6. No `shared` abstraction until at least two concrete consumers exist.
7. Each dependency is pinned and reviewed before adoption.
