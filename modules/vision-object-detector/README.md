# Vision object detector module

This directory will contain the Android-only Nitro module that connects
VisionCamera frames to the on-device object detector.

## Responsibilities

- accept a VisionCamera frame and monotonic timestamp;
- execute on-device object detection outside the JavaScript thread;
- return labels, confidence scores, and frame-space bounding boxes;
- load and close model resources safely;
- expose stable typed data through the Nitro contract.

## Explicit non-responsibilities

- rendering overlays;
- tracking presentation identity;
- loading vocabulary definitions;
- playing pronunciation;
- navigation, analytics, or product state.

No implementation or model binary is committed during the repository planning
phase.
