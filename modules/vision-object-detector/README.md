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

| Platform | Implementation     | Recognition                                         |
| -------- | ------------------ | --------------------------------------------------- |
| Android  | `android/`, Kotlin | MediaPipe Tasks, EfficientDet-Lite0 int8, 80 labels |
| iOS      | `ios/`, Swift      | MediaPipe Tasks, EfficientDet-Lite0 int8, 80 labels |

Both platforms bundle the same model file and ask it for the same number of
results above the same score. A difference between them is a difference in
hardware rather than in what was asked of the model. The iOS build used Apple's
Vision framework for a while; the device evidence that ended that is in
[ADR-0009](../../docs/adr/0009-ios-vision-detector.md) and
[ADR-0010](../../docs/adr/0010-ios-shares-the-android-detector.md), and the iOS
layer is described in [docs/IOS.md](../../docs/IOS.md).

Both answer the same `NativeDetectionBatch`, so the JavaScript side has no
platform branch. iOS stands the frame up before inference and therefore reports
a rotation of zero against the size of the image the model actually read;
Android hands the model the camera's own buffer and reports the rotation for
JavaScript to apply.

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
