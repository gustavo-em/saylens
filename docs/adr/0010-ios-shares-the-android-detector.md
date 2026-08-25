# ADR-0010: iOS runs the same detector as Android

- Status: Accepted
- Date: 2026-08-25
- Owners: project maintainers
- Supersedes: [ADR-0009](0009-ios-vision-detector.md)

## Context

[ADR-0009](0009-ios-vision-detector.md) chose Apple's Vision framework for iOS:
objectness saliency to find boxes, then classification to name them. It bought
a 1303-label taxonomy and cost nothing in the download. It was written from
Apple's documentation and a local reading of the taxonomy, and it was never run
on a phone.

Running it on an iPhone 13 answered the question the documentation could not.

Objectness saliency does not find objects. It finds attention: the region a
person would look at. On a photograph of a desk with a laptop, a cable, and a
connector, the request returned exactly one box, around the laptop. On the
device, a keyboard filling half the frame got a card and the mouse beside it
never did, at any threshold. The classifier knows `computer_mouse` perfectly
well; it was never handed a crop of the mouse to name.

Two further findings came from the same run:

- Vision's taxonomy is hierarchical, and a parent is by construction at least
  as confident as its child. `structure 0.90, wood_processed 0.90,
consumer_electronics 0.71, machine 0.71, computer 0.71` sat above
  `laptop 0.69` on a photo of a laptop. Any rule that reads the top of the list
  reads a word no learner can use.
- The pipeline was not slow: 19.7 inferences per second at a median of 114 ms,
  p95 301 ms, with three pipelines on an iPhone 13.

And the promise itself turned out to be thinner than it looked. The vocabulary
catalogue describes 80 words. Those 80 are exactly the COCO labels the Android
model already emits. The 1303-label taxonomy could name more things, but the
app has nothing to teach about them, so the gain was a bare English word on a
generic card — while the loss, a box per object, is the product.

## Decision

iOS runs the same detector as Android: MediaPipe Tasks with the
EfficientDet-Lite0 int8 model already in this repository, read from the same
file the Android build packages, with the same maximum results and score
threshold.

The image is handed to the model upright, using the orientation VisionCamera
reports, so boxes come back measured against the upright frame and the iOS
batch reports no rotation.

What the Vision work built around recognition is kept, because none of it was
wrong: the worker pool, the frame copy that outlives the capture session's
buffer, the frame-dropping scheduler, and the tracking that carries a box and
its name from one frame to the next.

## Consequences

### Positive

- The two platforms recognise the same 80 things, so evidence from one is
  worth something on the other and a learner's experience does not depend on
  the phone in their hand.
- Every label the detector emits has a curated word, pronunciation, meaning,
  and example. Nothing falls back to a generic card.
- Boxes are per object and tight, which is what the card is anchored to.

### Negative and risks

- The iOS download grows by the 4.4 MB model, and a third-party inference
  dependency enters the build. ADR-0009 avoided both.
- Recognition is limited to COCO's 80 classes again. Pointing at a mug, a desk,
  or a plant gets nothing, which is the limit ADR-0009 set out to remove.
- MediaPipe's iOS delegate is Metal rather than the OpenCL path that aborted
  processes on Android, but this build has not measured it: every worker runs
  on the CPU.

## Alternatives considered

- **Grid classification**: tile the frame, classify each tile, merge
  neighbours. Keeps the download at zero and finds smaller objects, but the
  boxes are tile-shaped rather than object-shaped and a frame costs nine to
  sixteen classifications, which puts detections near four per second.
- **Keep saliency**: honest and cheap, but one prominent object per frame is
  not an app whose premise is pointing at anything.
- **Boxes from the detector, names from Vision**: the detector supplies tight
  boxes and Vision names them from its larger taxonomy. This is the shape the
  original recommendation proposed for Android with ML Kit, and it stays
  available now that the detector is in place: it is an addition to this
  decision rather than an alternative to it, and it needs its own evidence.

## Validation

- Run on a physical iPhone and confirm that several objects are recognised at
  once, including small ones beside large ones, which is the case that failed.
- Record latency percentiles and throughput, and compare them with the Android
  numbers for the same model.
- Measure the Metal delegate before offering it in the settings screen.
