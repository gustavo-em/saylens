# ADR-0005: MVVM presentation with styled-components

- Status: Accepted
- Date: 2026-08-20
- Owners: project maintainers

## Context

SayLens needs presentation boundaries that remain understandable as camera
permissions, live overlays, object selection, and learning details become more
complex. It also needs a recognizable React Native styling system with a shared
theme and strong ecosystem adoption.

Clean Architecture defines the direction between feature layers but does not
prescribe how presentation state and UI composition are separated.

## Decision

Use MVVM inside the presentation layer while retaining feature-first Clean
Architecture for the repository as a whole.

- Views are declarative and receive state plus actions through props.
- ViewModels own presentation state, effects, and application interactions.
- Screens are thin binders between a View and its ViewModel.
- The `app` ViewModel owns shell-level navigation and preferences.
- Native SDK adapters remain in infrastructure and are injected at the
  composition root.

Use styled-components 6 for theme-driven, static React Native UI. Components
are declared at module scope. Camera surfaces and future high-frequency overlay
coordinates do not flow through the styling library.

The selection was checked against current package adoption on 2026-08-20.
styled-components had substantially more weekly npm downloads than the leading
React Native utility-style alternative and officially documents React Native
usage.

## Consequences

### Positive

- Views can be reviewed and tested independently from native camera APIs.
- Permission and lifecycle behavior has a clear presentation owner.
- Theme tokens keep camera and settings visuals consistent.
- The architecture remains ready for detector and vocabulary use cases.

### Negative and risks

- MVVM adds naming and file-boundary overhead to a small application.
- styled-components adds a runtime dependency and must not be used for
  per-frame values.
- The team must avoid turning ViewModels into business-rule containers.

## Alternatives considered

- Component-local state only: rejected because camera lifecycle and future
  selection behavior would become coupled to rendering.
- Redux Toolkit: deferred because there is no shared server state or complex
  event graph that justifies a global store yet.
- NativeWind: a strong alternative, but styled-components currently has broader
  package adoption and provides the requested component-scoped styling model.

## Validation

- A View imports no native camera SDK.
- A ViewModel returns no JSX and imports no platform SDK.
- Switching tabs pauses and resumes the camera through injected state.
- Presentation tests replace the native viewport with a deterministic mock.

## References

- [styled-components React Native documentation](https://styled-components.com/docs/basics#react-native)
- [styled-components package](https://www.npmjs.com/package/styled-components)
- [NativeWind package](https://www.npmjs.com/package/nativewind)
