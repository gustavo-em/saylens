# Vision object detector module

The Nitro module that connects VisionCamera frames to on-device object
recognition, with one implementation per platform behind a single contract.

## Responsibilities

- accept a VisionCamera frame and monotonic timestamp;
- execute on-device object recognition outside the JavaScript thread;
- return labels, confidence scores, and frame-space bounding boxes;
- load and close model resources safely;
- expose stable typed data through the Nitro contract.

## Explicit non-responsibilities

- rendering overlays;
- tracking presentation identity;
- loading vocabulary definitions;
- playing pronunciation;
- navigation, analytics, or product state.

## Platforms

| Platform | Implementation     | Recognition                                                         |
| -------- | ------------------ | ------------------------------------------------------------------- |
| Android  | `android/`, Kotlin | MediaPipe Tasks with a bundled EfficientDet-Lite0 int8, 80 labels   |
| iOS      | `ios/`, Swift      | Apple Vision: objectness saliency, then classification, 1303 labels |

The two platforms deliberately recognise different things. Android bundles a
model and answers with COCO labels; iOS uses the taxonomy already in the
operating system, ships no model, and can put a box around objects COCO never
had. The reasoning is in
[ADR-0004](../../docs/adr/0004-mediapipe-efficientdet-lite0.md) and
[ADR-0009](../../docs/adr/0009-ios-vision-detector.md), and the iOS layer is
described in [docs/IOS.md](../../docs/IOS.md).

Both answer the same `NativeDetectionBatch`, so the JavaScript side has no
platform branch. iOS reports a rotation of zero because Vision is told the
frame's orientation and answers upright; Android reports the camera's rotation
and JavaScript applies it.

## Development

The package is linked locally through the root `package.json`. Its Nitro
interfaces are generated and committed so consumers do not run code generation
during a build.

After changing a `*.nitro.ts` contract, run from the repository root:

```sh
npm run generate:detector
```

Then `pod install` for iOS and a Gradle sync for Android, since generation adds
files both build systems need to pick up.
