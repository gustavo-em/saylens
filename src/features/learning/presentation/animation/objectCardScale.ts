interface Size {
  width: number;
  height: number;
}

/** The card is drawn at its natural size and then scaled, so a single factor
 * shrinks text, padding, and icons together. */
export const OBJECT_CARD_BASE_SCALE = 0.9;
const OBJECT_CARD_SCALE_RANGE = 0.22;
/** How wide the object is on screen, as a share of the viewport. Below the far
 * mark the card is at its smallest, above the near mark at its largest. */
const OBJECT_FAR_SIZE = 0.08;
const OBJECT_NEAR_SIZE = 0.55;
/** Sizes settle on steps, so a box that jitters by a pixel leaves the card be. */
const SCALE_STEPS_PER_UNIT = 50;
/** How far the card turns to face the middle of the screen, in degrees. */
const MAXIMUM_TILT_DEGREES = 16;

/**
 * A nearby object fills more of the frame than a distant one, so the size of
 * the tracked box stands in for distance: the card grows as the learner walks
 * up to the object and shrinks as they step away.
 */
export function getObjectCardScale(object: Size, viewport: Size) {
  return (
    OBJECT_CARD_BASE_SCALE +
    OBJECT_CARD_SCALE_RANGE * (getNearness(object, viewport) * 2 - 1)
  );
}

/**
 * How close the object reads, from 0 at the far mark to 1 at the near one.
 * Rounded into steps so a box that breathes by a pixel does not animate the
 * card, and shared by everything that depends on distance.
 */
export function getNearness(object: Size, viewport: Size) {
  const viewportArea = viewport.width * viewport.height;
  const objectArea = Math.max(object.width, 0) * Math.max(object.height, 0);

  if (viewportArea <= 0 || objectArea <= 0) return 0.5;

  const relativeSize = Math.sqrt(objectArea / viewportArea);
  const progress = Math.min(
    Math.max(
      (relativeSize - OBJECT_FAR_SIZE) / (OBJECT_NEAR_SIZE - OBJECT_FAR_SIZE),
      0,
    ),
    1,
  );

  return Math.round(progress * SCALE_STEPS_PER_UNIT) / SCALE_STEPS_PER_UNIT;
}

/**
 * How far the card opens away from the object, in degrees.
 *
 * The card is hinged on the edge that faces the object, so the turn is always
 * away from it and the direction is decided by which side the card ended up
 * on. What is decided here is only how much: a near object gets the full
 * turn, because perspective is stronger up close, and a distant one barely
 * turns at all.
 */
export function getObjectCardTilt(object: Size, viewport: Size) {
  if (viewport.width <= 0 || viewport.height <= 0) return 0;

  const strength = 0.35 + 0.65 * getNearness(object, viewport);

  return Math.round(MAXIMUM_TILT_DEGREES * strength * 10) / 10;
}
