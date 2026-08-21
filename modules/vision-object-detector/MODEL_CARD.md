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

The upstream task guide describes EfficientDet-Lite0 as its recommended balance
between latency and accuracy. It also documents that the model is trained on
COCO and therefore recognizes only its supported categories. SpellForMe must
not imply recognition of arbitrary objects.

References:

- <https://developers.google.com/edge/mediapipe/solutions/vision/object_detector#models>
- <https://developers.google.com/edge/mediapipe/solutions/vision/object_detector/android>
