# ADR-0009: Apple Vision as the iOS detector

- Status: Accepted
- Date: 2026-08-25
- Owners: project maintainers
- Supersedes on iOS: [ADR-0004](0004-mediapipe-efficientdet-lite0.md)

## Context

[ADR-0004](0004-mediapipe-efficientdet-lite0.md) chose MediaPipe with a bundled
EfficientDet-Lite0 int8 model, and Android runs it well. Bringing the
experience to iOS forced a choice between two paths.

The first is parity: add the MediaPipe Tasks pod, ship the same 4.4 MB model in
the iOS bundle, and recognise exactly what Android recognises. The second is to
use what the platform already carries.

What decided it is not latency. It is the label set. COCO names 80 things, and
a learner points the camera at whatever is in front of them: a mug, a desk, a
plant, a pair of glasses, a phone. Everything outside those 80 classes gets no
box at all today, which reads to the learner as the camera being broken rather
than the vocabulary being finite. Apple's Vision framework carries a 1303-label
taxonomy in the operating system, and it is already installed on every device
the app can run on.

## Decision

On iOS, recognition is Apple's Vision framework, read in two phases per frame:

1. `VNGenerateObjectnessBasedSaliencyImageRequest` returns class-agnostic boxes
   around the salient objects. This phase knows where things are and does not
   care what they are.
2. `VNClassifyImageRequest`, one request per box with the box as its
   `regionOfInterest`, names each one against Vision's taxonomy. Results are
   filtered with Apple's own precision and recall curves.

No model, no inference dependency, and no extra bytes ship in the iOS build.
The pod declares the `Vision` system framework and nothing else.

Vision identifiers are not COCO labels, so `VisionTaxonomy` maps 109 Vision
identifiers onto 72 of the 80 labels the dictionary is keyed by — every entry
taken from `VNClassifyImageRequest.knownClassifications`, none guessed. When several labels pass the filter for one box, the one the
dictionary knows wins over a more confident one it does not: a known label
carries a meaning, a pronunciation, and an example, and an unknown one carries
a word alone. An unrecognised identifier still reaches JavaScript, under its
own name, and gets the generic card.

Vision is told the frame's orientation and answers in the upright image's
coordinate space, so the iOS batch reports a rotation of zero and the
JavaScript rotation path is left to Android.

Android keeps MediaPipe and EfficientDet-Lite0. ADR-0004 stands there.

## Consequences

### Positive

- The iOS download grows by nothing: no model file, no inference framework.
- No third-party inference licence enters the iOS build.
- 1303 possible labels instead of 80, and a box for objects the dictionary has
  never heard of, which is the limit that hurts the experience most today.
- Vision routes the work to the Neural Engine, the GPU, or the CPU by itself,
  so there is no delegate to choose and no delegate that can abort the process,
  which is the failure Android had to defend against.
- The on-device promise in the model card holds: Vision classification runs
  locally.

### Negative and risks

- The two platforms now recognise different things. The same object can be
  named on one and missed on the other, and evidence gathered on Android no
  longer describes iOS.
- Objectness saliency reports the objects that stand out, not every object in
  view. A cluttered scene may produce fewer boxes than the Android detector
  would.
- Naming costs a second pass, one request per box, where MediaPipe names
  everything in a single inference.
- The dictionary describes 80 labels, and only those get a full card. The other
  1200-odd Vision labels reach the learner as a bare English word on a generic
  card until the vocabulary catalogue grows.
- Eight curated labels have no Vision identifier at all: baseball glove, hair
  drier, parking meter, remote, stop sign, tennis racket, toothbrush, and wine
  glass. Those objects can still be boxed, under whatever Vision does call
  them.
- The alias table is a maintenance surface, and Apple can revise the taxonomy.

## Alternatives considered

- MediaPipe with the same bundled model on iOS: rejected. It buys exact parity
  and costs 4.4 MB, a third-party dependency, and keeps the 80-label ceiling
  that motivated the change.
- Converting EfficientDet-Lite0 to Core ML: rejected for the same ceiling, plus
  a conversion step to maintain.
- `VNDetectRectanglesRequest` or contour requests for phase one: rejected, they
  find geometry rather than objects.
- A single `VNClassifyImageRequest` over the whole frame: rejected, it names
  the scene without saying where anything is, and the product is built on a
  card anchored over an object.

## Validation

- Measure on a physical iPhone: latency percentiles for each phase separately,
  end-to-end result freshness, and sustained throughput over a five-minute
  session.
- Compare the number and stability of boxes against the Android detector on the
  same scene.
- Record the share of frames whose chosen label lands in the dictionary, which
  is what tells us whether the alias table is worth extending or the vocabulary
  catalogue is.
- Extend `VisionTaxonomy` only from identifiers actually observed on a device.

## Follow-up not decided here

The same two-phase shape is available on Android through ML Kit's
class-agnostic object detector followed by a classifier. If that is adopted, it
supersedes ADR-0004 on Android too and is recorded as its own ADR with its own
device evidence.

## References

- [Vision classification and saliency](https://developer.apple.com/documentation/vision)
- [Classifying images with Vision](https://developer.apple.com/documentation/vision/classifying-images-for-categorization-and-search)
- [Cropping to salient regions](https://developer.apple.com/documentation/vision/cropping-images-to-a-region-of-interest)
