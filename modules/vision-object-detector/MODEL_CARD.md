# EfficientDet-Lite0 int8 model card

SpellForMe bundles Google's recommended pre-trained MediaPipe Object Detector
model for its Android-first proof of concept.

- Model: EfficientDet-Lite0 int8
- Input: 320 × 320 RGB
- Dataset: COCO, 80 object labels
- Downloaded: 2026-08-20
- Source: <https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/latest/efficientdet_lite0.tflite>
- SHA-256: `0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb`
- Size: 4,602,671 bytes

The model is used only for on-device inference. Camera pixels are not uploaded
or copied to the React Native JavaScript thread.

The int8 variant supports three runtime performance profiles: four parallel CPU
inference workers for high-performance devices, two CPU workers for lower-end
devices, and an opt-in Ultra profile with four CPU workers plus one GPU worker.
All profiles keep camera preview work independent from recognition and avoid
queuing stale frames; the lower-end profile reduces concurrent CPU and memory
pressure. Ultra intentionally prioritizes throughput over CPU, GPU, memory,
thermal, and battery usage. When MediaPipe cannot initialize or execute the GPU
delegate, that worker falls back to CPU without disabling the other workers.
Android devices limited to 32-bit ABIs or classified as low-RAM start in the
lower-end profile; Ultra remains an explicit user choice.

The upstream task guide describes EfficientDet-Lite0 as its recommended balance
between latency and accuracy. It also documents that the model is trained on
COCO and therefore recognizes only its supported categories. SpellForMe must
not imply recognition of arbitrary objects.

References:

- <https://developers.google.com/edge/mediapipe/solutions/vision/object_detector#models>
- <https://developers.google.com/edge/mediapipe/solutions/vision/object_detector/android>
