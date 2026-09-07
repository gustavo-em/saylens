export interface NormalizedBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedObject {
  id: string;
  label: string;
  confidence: number;
  bounds: NormalizedBounds;
  /**
   * The better name for the same object, when a classifier had one.
   *
   * `label` is the identity and has to hold still: tracks are matched within a
   * label, so a name that changes breaks the track and throws away the
   * readings it had gathered. The classifier reads a thousand classes against
   * the detector's eighty, which makes it the name worth showing and the wrong
   * thing to be recognised by. Display reads this and falls back to `label`.
   */
  refinedLabel?: string;
  /**
   * True while the object is only remembered rather than seen.
   *
   * The tracker keeps a confirmed object on screen for a moment after the
   * detector stops reporting it, so a hand reaching for the practise button
   * does not take the card away at the moment it is tapped. Anything choosing
   * between objects has to know which of them the camera can actually see:
   * a remembered object keeps the bounds it had when it left, and those are
   * usually the largest in frame, so by size alone it outranks whatever the
   * camera has since been pointed at.
   *
   * Absent means seen. Only the tracker sets this.
   */
  isMissing?: boolean;
}

export interface DetectionFrame {
  objects: DetectedObject[];
  sourceWidth: number;
  sourceHeight: number;
  inferenceTimeMs: number;
}

/**
 * The name to show a learner for an object.
 *
 * The classifier's reading when there is one, the detector's otherwise. Every
 * screen and every lookup goes through here, so identity and display can never
 * drift apart by accident: `label` is what a track is matched on, and this is
 * what gets taught.
 */
export function displayLabel(object: DetectedObject): string {
  return object.refinedLabel ?? object.label;
}
