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
- `presentation` uses MVVM: ViewModels invoke application behavior and expose
  view-ready state; Views render that state and report user intent. Neither
  side calls VisionCamera, MediaPipe, storage, or speech SDKs directly.
- `app` is the composition root. It creates concrete adapters and injects them
  into the feature. Its shell ViewModel owns app-level navigation and settings.
- `shared` contains intentionally generic primitives. Feature-specific behavior
  must not be moved there for convenience.

## Repository map

```text
src/
  app/                              Shell, theme, navigation, and app ViewModel
  features/
    learning/
      domain/                       Business rules and stable types
      application/                  Use cases and ports
      infrastructure/               Camera, detector, dictionary, speech adapters
      presentation/
        screens/                    Thin feature composition and dependency binding
        views/                      Declarative UI without platform SDK imports
        view-models/                Presentation state, effects, and user actions
        models/                     View-facing contracts
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

The implemented core values are `DetectedObject`, normalized bounds,
`DetectionFrame`, and `VocabularyEntry`.

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

### Presentation with MVVM

Presentation owns the camera screen, animated object overlays, selection
interaction, and object details sheet through three explicit responsibilities:

- a **View** renders props and emits user actions;
- a **ViewModel** coordinates presentation state, effects, and application
  ports without returning JSX or importing native SDKs;
- a **Screen** binds the ViewModel to the View and receives concrete renderers
  from the application composition root when a native view is required.

This is MVVM inside Clean Architecture, not an alternative to it. Clean
Architecture controls dependencies between layers; MVVM structures the
presentation layer.

`styled-components` owns static, theme-driven presentation styles. Components
are defined at module scope. Native camera surfaces stay in infrastructure;
dynamic box geometry is applied as a plain native style after frame-to-preview
coordinate mapping.

Detector metadata is capped before it enters React state, and repeated empty
frames do not render again. UI-thread smoothing remains planned for tracking
polish; raw camera-frequency values must not drive the React tree.

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
  -> local vocabulary lookup
  -> live compact learning overlay
```

Only compact detection metadata crosses the native boundary. Pixel buffers stay
outside the React Native thread.

## Concurrency and backpressure

- Camera preview and inference are independent outputs.
- FrameOutput copies an accepted frame into native-owned memory and returns
  without waiting for model inference.
- Four dedicated native workers each accept at most one in-flight frame. When
  all are busy, the new frame is discarded instead of queued.
- Only the newest completed batch is published, so an older worker cannot move
  the overlay backwards when it finishes later.
- Native resources are released in success and failure paths.
- The JavaScript thread never performs pixel conversion or model inference.
- Detection metadata updates are capped at 30 per second; repeated-empty
  diagnostics update at most once per second.

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
