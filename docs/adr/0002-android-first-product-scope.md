# ADR-0002: Android-first product scope

- Status: Accepted
- Date: 2026-08-20
- Owners: project maintainers

## Context

The first objective is a polished, technically credible side project rather
than immediate platform parity. Camera permissions, orientations, native ML
integration, frame formats, and performance behavior differ by platform.

Attempting Android and iOS simultaneously would double integration surfaces
before the product interaction is validated.

## Decision

Build and validate the first public milestone on Android only.

- Use a physical Android device as the reference environment.
- Set the minimum supported Android SDK to 24 because that is the minimum for
  MediaPipe Tasks.
- Keep domain and application APIs platform-neutral where doing so requires no
  speculative abstraction.
- Do not create placeholder iOS native code during the Android milestone.

## Consequences

### Positive

- Faster feedback on camera and detector performance.
- One native toolchain and one coordinate system to validate initially.
- More time for tracking stability and visual polish.

### Negative and risks

- The first public release is unavailable to iOS users.
- Some Android-specific assumptions may need extraction when iOS begins.
- Device fragmentation still requires testing on more than one Android device.

## Alternatives considered

- Cross-platform from the first commit: rejected because it expands scope before
  the interaction is proven.
- iOS first: rejected because Android is the selected initial target.

## Validation

- The critical learning journey runs on a physical Android device.
- Camera preview remains responsive during sustained inference.
- Platform dependencies remain inside infrastructure and the native module.

## References

- [MediaPipe Tasks setup for Android](https://developers.google.com/edge/mediapipe/solutions/setup_android)
