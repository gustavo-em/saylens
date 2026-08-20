# ADR-0004: MediaPipe EfficientDet-Lite0 for the first detector

- Status: Accepted
- Date: 2026-08-20
- Owners: project maintainers

## Context

The first version needs detailed common-object labels such as `bottle`, `chair`,
and `cup` without training a model. The detector must run on-device, return
bounding boxes, and be practical on consumer Android devices.

The default ML Kit object classifier exposes only broad categories, which is
insufficient for a vocabulary-learning experience.

## Decision

Use MediaPipe Tasks Object Detector with the pre-trained EfficientDet-Lite0
int8 model and its COCO label set.

Initial configuration:

- delegate: CPU;
- running mode: `VIDEO`;
- input model size: 320 by 320;
- maximum results: 3;
- score threshold: start at 0.50 and tune using device evidence;
- detector execution: synchronous inside VisionCamera's asynchronous runner;
- product tracking IDs: assigned outside the detector using label and bounding
  box overlap.

The model binary will be added only in the implementation milestone with its
source, license, checksum, and version recorded.

## Consequences

### Positive

- No training pipeline or backend is required for the first version.
- MediaPipe handles model preprocessing and detection postprocessing.
- The int8 model offers a practical CPU latency and simple deployment path.
- The 80 COCO labels create a finite vocabulary catalog for the MVP.

### Negative and risks

- COCO recognizes only its predefined object classes.
- Object identity is not stable across frames without an application tracker.
- Accuracy can degrade for small, obscured, or domain-specific objects.
- CPU behavior and thermals vary across Android hardware.

## Alternatives considered

- ML Kit default object detector and classifier: rejected because its labels are
  coarse product categories.
- EfficientDet-Lite2: deferred because it is more accurate but materially slower
  and more memory intensive.
- SSD MobileNetV2: retained as a fallback for devices where Lite0 misses the
  frame-rate target.
- A custom-trained model: deferred until real usage demonstrates a vocabulary
  gap worth the maintenance cost.

## Validation

- Record detector latency percentiles on physical devices.
- Verify the selected vocabulary objects across varied light and backgrounds.
- Confirm no frame queue growth and acceptable device temperature during a
  five-minute session.
- Reconsider model or delegate only from measured evidence.

## References

- [MediaPipe Object Detector for Android](https://developers.google.com/edge/mediapipe/solutions/vision/object_detector/android)
- [MediaPipe object detector models and benchmarks](https://developers.google.com/edge/mediapipe/solutions/vision/object_detector#models)
- [ML Kit object detection classification limits](https://developers.google.com/ml-kit/vision/object-detection)
