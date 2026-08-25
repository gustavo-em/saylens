interface Size {
  width: number;
  height: number;
}

/** The card is drawn at its natural size and then scaled, so a single factor
 * shrinks text, padding, and icons together. */
export const OBJECT_CARD_BASE_SCALE = 0.9;
const OBJECT_CARD_SCALE_RANGE = 0.12;
/** How wide the object is on screen, as a share of the viewport. Below the far
 * mark the card is at its smallest, above the near mark at its largest. */
const OBJECT_FAR_SIZE = 0.1;
const OBJECT_NEAR_SIZE = 0.5;
/** Sizes settle on steps, so a box that jitters by a pixel leaves the card be. */
const SCALE_STEPS_PER_UNIT = 50;

/**
 * A nearby object fills more of the frame than a distant one, so the size of
 * the tracked box stands in for distance: the card grows as the learner walks
 * up to the object and shrinks as they step away.
 */
export function getObjectCardScale(object: Size, viewport: Size) {
  const viewportArea = viewport.width * viewport.height;
  const objectArea = Math.max(object.width, 0) * Math.max(object.height, 0);

  if (viewportArea <= 0 || objectArea <= 0) return OBJECT_CARD_BASE_SCALE;

  const relativeSize = Math.sqrt(objectArea / viewportArea);
  const progress = Math.min(
    Math.max(
      (relativeSize - OBJECT_FAR_SIZE) / (OBJECT_NEAR_SIZE - OBJECT_FAR_SIZE),
      0,
    ),
    1,
  );
  const scale =
    OBJECT_CARD_BASE_SCALE + OBJECT_CARD_SCALE_RANGE * (progress * 2 - 1);

  return Math.round(scale * SCALE_STEPS_PER_UNIT) / SCALE_STEPS_PER_UNIT;
}
