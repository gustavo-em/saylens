# Source organization

The React Native source is organized by feature first and Clean Architecture
layer second. See [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for dependency
rules and runtime flow.

Only `app` may assemble concrete infrastructure implementations. Feature layers
must preserve their documented boundaries.
