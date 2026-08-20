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

## Development

The package is linked locally through the root `package.json`. Its Nitro
interfaces are generated and committed so consumers do not run code generation
during an Android build.

After changing a `*.nitro.ts` contract, run from the repository root:

```sh
npm run generate:detector
```

The initial scaffold exposes the selected model name. Frame input, MediaPipe,
and model loading are added as separate, device-validated changes.
