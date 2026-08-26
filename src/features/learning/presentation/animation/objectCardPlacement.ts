export interface Size {
  width: number;
  height: number;
}

export interface ObjectBox extends Size {
  left: number;
  top: number;
}

export type CardSide = 'left' | 'right' | 'above' | 'below';

export interface CardPlacement {
  /** Both offsets are relative to the object's box, which is what the card is
   * rendered inside. */
  left: number;
  top: number;
  side: CardSide;
  transformOrigin: [string, string, number];
  /** Which way the card opens away from the object: around the vertical axis
   * when it stands beside it, around the horizontal one when it sits above or
   * below. */
  hingeAxis: 'x' | 'y';
  hingeDirection: 1 | -1;
}

export const OBJECT_CARD_WIDTH = 208;
/** What the card actually measures once it holds a word, a translation, an
 * example, a rule, the pronunciation, and two buttons. The old estimate of 76
 * was the height of its first two lines, which is why cards kept ending up
 * under the controls at the bottom of the screen. */
export const OBJECT_CARD_ESTIMATED_HEIGHT = 196;
/** How close the card may come to the edge of the screen. It leaves room for
 * the turn as well as the card: a panel hinged on one edge swings the other
 * one outwards. */
const EDGE_INSET = 14;
/** Space between the object's box and the card standing next to it. */
const GAP = 10;
/** The camera screen's own furniture: the logo and menu at the top, the
 * language bar at the bottom. */
const TOP_SAFE_INSET = 92;
/** Room for the dock, its margin, and the home indicator under it. */
const BOTTOM_SAFE_INSET = 132;

/**
 * Places the card against the object on whichever side has room for it —
 * beside it, above it, or below it — and reports how to hinge it there and
 * how to draw the line back to the object.
 *
 * Whatever side is chosen, the card is then held inside the screen, so an
 * object at the edge of the frame still gets a readable card.
 */
export function getObjectCardPlacement(
  object: ObjectBox,
  viewport: Size,
  scale: number,
  /** What is being placed: a full card by default, a small label when only
   * the word is shown. */
  size: Size = {
    width: OBJECT_CARD_WIDTH,
    height: OBJECT_CARD_ESTIMATED_HEIGHT,
  },
): CardPlacement {
  const width = size.width * scale;
  const height = size.height * scale;

  const side = chooseSide(object, viewport, width, height);
  const preferred = preferredPosition(side, object, width, height);

  const left = clamp(
    preferred.left,
    EDGE_INSET,
    viewport.width - EDGE_INSET - width,
  );
  const top = clamp(
    preferred.top,
    TOP_SAFE_INSET,
    viewport.height - BOTTOM_SAFE_INSET - height,
  );

  // Holding the card inside the screen can leave it somewhere other than the
  // side chosen for it, and everything that points at it follows where it
  // actually is rather than where it was meant to go.
  const placed = { left, top, width, height };
  const settled = settledSide(side, placed, object);

  return {
    left: left - object.left,
    top: top - object.top,
    side: settled,
    ...hingeFor(settled),
  };
}

function settledSide(
  side: CardSide,
  card: { left: number; top: number; width: number; height: number },
  object: ObjectBox,
): CardSide {
  if (side === 'above' || side === 'below') {
    return card.top + card.height / 2 < object.top + object.height / 2
      ? 'above'
      : 'below';
  }

  return card.left + card.width / 2 >= object.left + object.width / 2
    ? 'right'
    : 'left';
}

/**
 * The hinge is the card edge that faces the object, so the card opens away
 * from it: around the vertical axis when it stands beside the object, around
 * the horizontal one when it sits above or below.
 */
function hingeFor(side: CardSide) {
  switch (side) {
    case 'right':
      return {
        transformOrigin: ['0%', '100%', 0] as [string, string, number],
        hingeAxis: 'y' as const,
        hingeDirection: 1 as 1 | -1,
      };
    case 'left':
      return {
        transformOrigin: ['100%', '100%', 0] as [string, string, number],
        hingeAxis: 'y' as const,
        hingeDirection: -1 as 1 | -1,
      };
    case 'above':
      return {
        transformOrigin: ['50%', '100%', 0] as [string, string, number],
        hingeAxis: 'x' as const,
        hingeDirection: 1 as 1 | -1,
      };
    case 'below':
      return {
        transformOrigin: ['50%', '0%', 0] as [string, string, number],
        hingeAxis: 'x' as const,
        hingeDirection: -1 as 1 | -1,
      };
  }
}

/**
 * Beside the object reads better than over it, so a horizontal side wins
 * whenever one can hold the whole card, and only then is above or below
 * considered. Between two sides of the same pair, the roomier one wins.
 *
 * When nothing fits, the side that comes closest to fitting is used and the
 * card is held inside the screen from there.
 */
function chooseSide(
  object: ObjectBox,
  viewport: Size,
  width: number,
  height: number,
): CardSide {
  const room: Record<CardSide, number> = {
    right: viewport.width - (object.left + object.width) - EDGE_INSET - GAP,
    left: object.left - EDGE_INSET - GAP,
    below:
      viewport.height - (object.top + object.height) - BOTTOM_SAFE_INSET - GAP,
    above: object.top - TOP_SAFE_INSET - GAP,
  };
  const needed: Record<CardSide, number> = {
    right: width,
    left: width,
    below: height,
    above: height,
  };
  const roomiest = (sides: CardSide[]) =>
    sides.reduce((best, candidate) =>
      room[candidate] > room[best] ? candidate : best,
    );

  const beside = (['right', 'left'] as CardSide[]).filter(
    candidate => room[candidate] >= needed[candidate],
  );
  if (beside.length > 0) return roomiest(beside);

  const overOrUnder = (['below', 'above'] as CardSide[]).filter(
    candidate => room[candidate] >= needed[candidate],
  );
  if (overOrUnder.length > 0) return roomiest(overOrUnder);

  return (['right', 'left', 'below', 'above'] as CardSide[]).reduce(
    (best, candidate) =>
      room[candidate] / needed[candidate] > room[best] / needed[best]
        ? candidate
        : best,
  );
}

function preferredPosition(
  side: CardSide,
  object: ObjectBox,
  width: number,
  height: number,
) {
  const centredLeft = object.left + object.width / 2 - width / 2;

  switch (side) {
    case 'right':
      return {
        left: object.left + object.width + GAP,
        // The card's base lines up with the object's, so both read as
        // standing on the same surface.
        top: object.top + object.height - height,
      };
    case 'left':
      return {
        left: object.left - width - GAP,
        top: object.top + object.height - height,
      };
    case 'above':
      return { left: centredLeft, top: object.top - GAP - height };
    case 'below':
      return { left: centredLeft, top: object.top + object.height + GAP };
  }
}

/** A viewport narrower than the card leaves no room to respect both insets, so
 * the lower bound wins and the card starts at the left edge. */
function clamp(value: number, lowest: number, highest: number) {
  return Math.max(lowest, Math.min(value, Math.max(lowest, highest)));
}
