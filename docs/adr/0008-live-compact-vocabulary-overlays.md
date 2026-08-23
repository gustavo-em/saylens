# ADR-0008: Live compact vocabulary overlays

- Status: Accepted
- Date: 2026-08-23
- Owners: project maintainers
- Supersedes: the click-to-details presentation described by ADR-0003 and
  ADR-0006; their camera and detector decisions remain active

## Context

The first learning flow rendered a clickable detection label and opened a modal
with vocabulary details. That interaction hid most of the camera context and
required a tap before the user could connect an object with its English word.

The detector publishes at approximately 30 frames per second and returns at
most five objects. Vocabulary data is local and indexed by normalized detector
label, so enriching the compact metadata does not require network access or
pixel transfer to JavaScript.

## Decision

For every presented detection, the camera ViewModel will resolve its local
vocabulary entry and expose one presentation item containing the object and
word data. The overlay will show:

- the English word;
- the Portuguese meaning;
- a Brazilian Portuguese pronunciation hint;
- detector confidence.

The card remains anchored to the bounding box and does not require interaction.
Geometry and vocabulary presentation stay bounded at 30 Hz, matching the
validated camera and aggregate detector throughput. Repeated empty results stay
bounded at 1 Hz.

Long-form examples and text-to-speech remain separate future interactions so
the live camera view does not become visually overloaded.

## Consequences

### Positive

- Learning information appears immediately without obscuring the camera.
- Vocabulary lookup remains offline and outside native vision code.
- The View remains independent of the concrete vocabulary repository.
- Accessibility exposes the same word, meaning, pronunciation, and confidence
  available visually.

### Negative and risks

- Multiple nearby objects can produce overlapping cards.
- More text is reconciled while detection geometry updates at 30 Hz.
- Stable track identities and UI-thread smoothing are still needed to reduce
  visual jitter during rapid movement.
- Example sentences no longer appear in the primary live presentation.

## Alternatives considered

- Keep the modal as the primary flow: rejected because it interrupts the visual
  object-to-word association.
- Show one global card for the highest-confidence object: deferred because it
  loses the direct spatial relationship for simultaneous detections.
- Render vocabulary inside the native camera module: rejected because native
  vision infrastructure must not own learning content or product UI.

## Validation

- A deterministic presentation test injects a 91% `bottle` detection.
- The resulting live card exposes `Bottle`, `garrafa`, `BÓ-tl`, and `91%`
  without a press action or modal.
- Physical-device validation must confirm readability, overlap behavior, and
  sustained UI smoothness with multiple objects.
