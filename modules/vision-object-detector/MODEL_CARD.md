# EfficientDet-Lite0 int8 model card

This card covers the Android detector. iOS bundles no model at all: it reads
Apple's Vision framework, which ships with the operating system, so there is
nothing to record here for it beyond that. See
[ADR-0009](../../docs/adr/0009-ios-vision-detector.md) and
[docs/IOS.md](../../docs/IOS.md).

SayLens bundles Google's recommended pre-trained MediaPipe Object Detector
model for its Android build.

- Model: EfficientDet-Lite0 int8
- Input: 320 × 320 RGB
- Dataset: COCO, 80 object labels
- Downloaded: 2026-08-20
- Source: <https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/latest/efficientdet_lite0.tflite>
- SHA-256: `0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb`
- Size: 4,602,671 bytes

The model is used only for on-device inference. Camera pixels are not uploaded
or copied to the React Native JavaScript thread.

The int8 variant supports two runtime performance profiles on every device.
Maximum Performance combines one GPU worker with a CPU pool that can grow to
the device's complete logical processor count. It warms up and measures 2, 4,
and the device-specific maximum CPU worker count, then keeps the smallest pool
that reaches at least 95% of measured peak throughput. Each candidate gets a
1.5-second warm-up and a 2.5-second measurement window. The GPU worker is
prewarmed independently and remains active throughout CPU calibration on
compatible 64-bit Android runtimes. A 32-bit runtime does not start the GPU
delegate because some legacy drivers terminate the process natively before an
application-level fallback is possible. When a compatible runtime reports a
recoverable MediaPipe GPU error, that worker falls back to CPU without disabling
the other workers.

Power Saving uses one background-priority CPU worker without GPU or calibration.
It limits the camera to 15 FPS and requests 320 × 180 detector output before the
model's own input preprocessing to reduce RGB conversion, memory bandwidth,
heat, and battery usage. Both profiles keep camera preview work independent from
recognition and avoid queuing stale frames.

The upstream task guide describes EfficientDet-Lite0 as its recommended balance
between latency and accuracy. It also documents that the model is trained on
COCO and therefore recognizes only its supported categories. SayLens must
not imply recognition of arbitrary objects.

References:

- <https://developers.google.com/edge/mediapipe/solutions/vision/object_detector#models>
- <https://developers.google.com/edge/mediapipe/solutions/vision/object_detector/android>
