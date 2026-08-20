# Contributing to SpellForMe

Thanks for helping improve SpellForMe. The repository is intentionally built in
small, evidence-producing stages so that decisions and trade-offs remain easy
to review.

## Before changing code

1. Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
2. Check the relevant [Architecture Decision Records](docs/adr/README.md).
3. Keep platform dependencies inside infrastructure or the native module.
4. Add a new ADR when a change reverses or materially extends an accepted
   decision.

## Branches

Use a short branch name that describes one outcome:

- `feat/camera-preview`
- `feat/object-detector`
- `fix/frame-disposal`
- `docs/performance-notes`

Avoid mixing dependency upgrades, refactors, and product behavior in one branch.

## Semantic commits

Commits follow Conventional Commits:

```text
type(optional-scope): imperative summary
```

Common types:

- `feat`: user-visible capability;
- `fix`: defect correction;
- `docs`: documentation only;
- `test`: test coverage or fixtures;
- `refactor`: behavior-preserving restructuring;
- `perf`: measured performance improvement;
- `build`: build system or dependency changes;
- `ci`: automation and continuous integration;
- `chore`: repository maintenance.

Examples:

```text
feat(camera): render Android preview
feat(detector): return normalized object bounds
fix(camera): dispose rejected frames
perf(overlay): move box interpolation to UI thread
docs(architecture): record detector delegate decision
```

Each commit should compile or leave the repository in an intentionally
documented planning state. Stage explicit paths and review the staged diff
before committing.

## Pull requests

- Explain the problem and the chosen boundary.
- Link an issue or ADR when one exists.
- Include validation evidence and physical-device details for camera or ML work.
- Add images or a short recording for visual behavior changes.
- Record performance before and after a `perf` change.
- Keep generated files, secrets, signing keys, and machine-specific paths out of
  the repository.

## Quality expectations

Once the Android baseline is introduced, every implementation pull request is
expected to pass formatting, linting, type checking, unit tests, and the Android
debug build. Camera and detector changes additionally require a physical-device
check because an emulator is not sufficient evidence for the full pipeline.

## Model and dataset changes

Any model binary must include its source, version, license, checksum, input and
output contract, label map, and measured target-device behavior. Do not commit a
model whose redistribution terms are unclear.
