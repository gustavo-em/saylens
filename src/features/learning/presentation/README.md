# Presentation

The learning presentation layer follows MVVM:

- `views/` contains declarative, prop-driven UI;
- `view-models/` owns presentation state, effects, and user actions;
- `screens/` binds ViewModels to Views and injected native renderers;
- `models/` contains contracts used across those presentation roles.

Views and ViewModels must not import VisionCamera, MediaPipe, or the Kotlin
detector. The app composition root injects native renderers and infrastructure
implements application ports.

Static UI uses theme-driven styled-components defined at module scope.
Detector metadata is bounded before entering React state, and repeated empty
results do not render again. Future high-frequency smoothing belongs on the UI
thread instead of causing a React render for every camera frame.
