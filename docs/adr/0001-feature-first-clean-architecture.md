# ADR-0001: Feature-first Clean Architecture

- Status: Accepted
- Date: 2026-08-20
- Owners: project maintainers

## Context

SayLens combines high-frequency camera data, an Android native detector,
English-learning rules, speech, and interactive React Native UI. Organizing the
repository only by technical type would make one user journey span unrelated
top-level folders and make platform details easy to leak into business rules.

The project also needs to remain understandable as public technical evidence,
without adding abstractions before they have a purpose.

## Decision

Use a feature-first Clean Architecture. The initial `learning` feature contains
four explicit layers: `domain`, `application`, `infrastructure`, and
`presentation`.

Dependencies point inward. The `app` directory is the composition root, and the
Android detector remains a separate local native module.

Create deeper folders only alongside real implementations. Do not create
generic base classes, repository wrappers, barrel exports, or a dependency
injection framework during the planning phase.

## Consequences

### Positive

- The camera and ML libraries can change without rewriting learning rules.
- Pure domain and application tests do not require a device.
- Public readers can follow one product journey in one feature boundary.
- The native module has a small, reviewable contract.

### Negative and risks

- Small use cases require more explicit mapping between layers.
- Incorrectly treating `shared` as a convenience folder would erode boundaries.
- The team must review imports, not merely trust directory names.

## Alternatives considered

- Type-first folders such as global `components`, `hooks`, and `services`:
  rejected because feature ownership becomes unclear as the product grows.
- A single feature folder without layers: rejected because native camera and ML
  details would become difficult to isolate and test.
- A framework-heavy Clean Architecture template: rejected because generated
  abstractions would precede actual requirements.

## Validation

- Domain and application tests execute without React Native or Android.
- Only infrastructure imports camera, speech, storage, or native detector SDKs.
- A detector replacement changes adapters and composition, not use-case APIs.
