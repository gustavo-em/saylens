# ADR-0006: Bounded synchronous FrameOutput for the first detector

- Status: Superseded by
  [ADR-0007](0007-parallel-native-inference-workers.md)
- Date: 2026-08-20
- Owners: project maintainers
- Supersedes: the async-runner execution detail in ADR-0003 and the initial
  detector runtime configuration in ADR-0004

## Context

The first implementation validated VisionCamera 5, React Native Worklets,
Nitro, and MediaPipe together on Android. Passing the native result callback
through a second Worklets runtime created by `AsyncRunner` did not preserve the
React Native remote function with the pinned dependency combination.

MediaPipe's `MediaImageBuilder` path also rejected the camera's YUV media image
and required an Android `RGBA_8888` image. The initial decision therefore needs
an evidence-based runtime refinement without moving pixels onto the JavaScript
thread.

## Decision

For the first public Android slice:

- use VisionCamera FrameOutput at a 640 by 360 target resolution;
- request RGB so CameraX provides the RGBA media image required by MediaPipe;
- run one synchronous detector call on the FrameOutput worklet callback;
- enable `dropFramesWhileBusy` so frames are discarded, never queued;
- always dispose the frame in a `finally` path;
- use MediaPipe `IMAGE` mode with CPU delegate, five maximum results, and a
  0.55 score threshold;
- send only labels, scores, dimensions, rotation, boxes, and latency to React;
- ignore repeated empty batches and cap non-empty React updates at five hertz.

## Consequences

### Positive

- The validated path is deterministic and keeps raw pixels out of React.
- Frame lifetime and queue behavior remain bounded.
- The model produces typed metadata without a backend or model download.
- The implementation can be replaced behind the same domain mapper.

### Negative and risks

- RGB conversion costs more memory bandwidth than YUV.
- Synchronous inference occupies the FrameOutput callback for the duration of
  each detector call.
- Preview responsiveness, sustained thermals, and latency percentiles still
  require a five-minute physical-device run.
- A future custom native output or native async callback may outperform this
  first integration.

## Alternatives considered

- Keep the second Worklets runtime and use private scheduler APIs: rejected
  because private runtime globals are not a stable application contract.
- Copy YUV into a bitmap in Kotlin: rejected for this milestone because it adds
  another per-frame allocation and conversion path.
- Send pixels to JavaScript: rejected because it violates the architecture and
  performance boundary.

## Validation

- Android reports the camera owned by the application while detection runs.
- The UI receives successful empty detection batches instead of a detector
  failure state.
- A physical Samsung SM-M536B produced a 195 ms inference sample.
- Mapping and click-to-details behavior are covered by deterministic tests.

## References

- [VisionCamera FrameOutput](https://visioncamera.margelo.com/docs/frame-output)
- [VisionCamera asynchronous frame processing](https://visioncamera.margelo.com/docs/async-frame-processing)
- [MediaPipe Object Detector for Android](https://developers.google.com/edge/mediapipe/solutions/vision/object_detector/android)
