# ADR-0003: VisionCamera 5 FrameOutput with a Nitro adapter

- Status: Accepted
- Date: 2026-08-20
- Owners: project maintainers

## Context

SayLens needs direct access to camera frames without transferring pixel
buffers to the JavaScript thread. VisionCamera 5 offers FrameOutput, worklet
runtimes, asynchronous frame processing, coordinate conversion, and native
Nitro extension points.

A fully custom CameraOutput would require implementing and maintaining a
CameraX `UseCase`, resolution negotiation, and output lifecycle before those
capabilities are needed.

## Decision

Use VisionCamera 5 `FrameOutput` as the frame source and implement a narrow
Android Nitro plugin in Kotlin for object detection.

Use VisionCamera's asynchronous runner as the single backpressure owner:

- accept at most one inference task at a time;
- immediately drop a frame when the runner is busy;
- dispose every frame in success, failure, and rejection paths;
- transfer only compact detection metadata to React Native.

Use VisionCamera coordinate conversion APIs to move bounding-box corners from
frame space to normalized camera space and then to preview space.

## Consequences

### Positive

- Pixel buffers remain off the JavaScript thread.
- Frame lifetime and dropping behavior are explicit.
- React Native owns the clickable overlay without requiring a native view.
- The native detector contract remains replaceable.

### Negative and risks

- Nitro and worklet setup adds native build complexity.
- Incorrect disposal can stall the camera pipeline.
- Coordinate conversion must be tested for orientation, crop, and mirroring.
- VisionCamera 5 API changes must be reviewed before dependency upgrades.

## Alternatives considered

- Custom native CameraOutput: deferred because it is a lower-level CameraX
  integration than the first milestone requires.
- VisionCamera 4 with a public TFLite example: rejected because version 4 is no
  longer the active architecture.
- Sending frame buffers through the React Native bridge: rejected because of
  latency, allocation, and frame-rate risks.

## Validation

- No pixel array is materialized on the JavaScript thread.
- Busy inference causes dropped input, not a growing queue.
- Preview continues at its target frame rate while detection is active.
- Bounding boxes align in portrait and landscape test scenarios.

## References

- [VisionCamera FrameOutput](https://visioncamera.margelo.com/docs/frame-output)
- [VisionCamera asynchronous frame processing](https://visioncamera.margelo.com/docs/async-frame-processing)
- [VisionCamera native Frame Processor plugins](https://visioncamera.margelo.com/docs/native-frame-processor-plugins)
- [VisionCamera coordinate systems](https://visioncamera.margelo.com/docs/coordinate-systems)
