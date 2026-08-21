# ADR-0007: Parallel native inference workers

- Status: Accepted
- Date: 2026-08-21
- Owners: project maintainers
- Supersedes: the synchronous detector execution detail in ADR-0004 and
  ADR-0006

## Context

Physical-device profiling showed that a synchronous MediaPipe call constrained
both useful detector throughput and the camera preview. The Samsung SM-M536B
initially delivered about 10 preview frames per second while one CPU detector
reported a 195 ms inference sample.

VisionCamera 5 can discard analyzer frames while busy, but a long synchronous
native call still occupies its FrameOutput callback. MediaPipe GPU delegation
was also tested with both int8 and float32 EfficientDet-Lite0 variants. On this
device, the int8 graph rejected the GPU tensor path and the float32 graph did
not complete reliably. Shipping that path would claim acceleration without a
usable result.

## Decision

For the performance-first Android slice:

- request the highest regular camera rate exposed by the selected device, up
  to 60 FPS, and prefer a binned camera format;
- copy each accepted 640 by 360 RGBA frame into native-owned memory before the
  VisionCamera frame is disposed;
- run four independent MediaPipe `IMAGE`-mode CPU detectors on dedicated native
  executors;
- initialize MediaPipe graphs serially because concurrent graph construction
  caused a native race in the pinned library on the validation device;
- allow at most one in-flight frame per worker and discard frames when all
  workers are busy;
- publish only the newest completed detection batch so out-of-order worker
  completion cannot move the overlay backwards;
- keep raw pixels and model execution outside the JavaScript thread;
- cap React presentation updates at 15 Hz and repeated-empty diagnostics at
  1 Hz;
- ask Android for the display's highest refresh mode, while respecting the
  device owner's system-level refresh-rate policy.

## Consequences

### Positive

- Preview work no longer waits for model inference.
- The detector has bounded memory and no stale-frame queue.
- Multiple CPU cores are used on the explicitly performance-oriented target.
- The implementation retains the existing Nitro metadata contract and MVVM
  presentation boundary.

### Negative and risks

- Four model instances increase CPU, memory, battery, and thermal pressure.
- Each accepted frame requires an RGBA bitmap copy because VisionCamera owns
  the original frame lifetime.
- The configuration intentionally does not target low-end devices.
- GPU delegation remains a future optimization that needs a different model or
  inference runtime on the validated Samsung hardware.
- Android and OEM display policies can keep the panel at 60 Hz even when the
  app requests its advertised 120 Hz mode.

## Validation

On the Samsung SM-M536B running Android 14, the final debug configuration
produced approximately 30 preview FPS and 29.8 to 30.2 detector FPS. Warm
inference latency samples were 70 to 112 ms, process CPU ranged from about 324%
to 339%, and resident memory ranged from about 529 to 533 MB. No fatal error
appeared during the final run.

The same scene and debug build measured about 10 preview FPS and a 195 ms
single-worker inference sample before this change.

## References

- [VisionCamera FrameOutput](https://visioncamera.margelo.com/docs/frame-output)
- [VisionCamera constraints](https://visioncamera.margelo.com/docs/guides/formats)
- [MediaPipe Object Detector for Android](https://developers.google.com/edge/mediapipe/solutions/vision/object_detector/android)
