# Presentation

Screens, overlays, components, hooks, and presentation state live here.

This layer renders application state and reports user intent. It must not call
MediaPipe or the Kotlin detector directly. High-frequency visual updates should
remain on the UI thread instead of causing React renders per camera frame.
