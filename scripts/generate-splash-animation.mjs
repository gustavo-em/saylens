/**
 * Builds the launch animation from the mark's own geometry.
 *
 * The numbers below are the ones in src/assets/lesingo-mark.svg, not a second
 * drawing of it: the animation and the app icon cannot drift apart, because
 * changing the mark and running this script again is what produces both.
 *
 *   node scripts/generate-splash-animation.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(
  new URL('../src/assets/splashMark.json', import.meta.url),
);

const SIZE = 1024;
const FPS = 60;
/** 1.4 seconds. Long enough to read as an opening, short enough that nobody
 * waits through it twice. */
const END = 84;

const CREAM = [0.968_6, 0.956_9, 0.933_3];
const PURPLE = [0.368_6, 0.254_9, 0.823_5];

/**
 * The three bars, in the order they are written: the two cream lines first and
 * the accent last, so the colour lands as the punctuation rather than as the
 * opening.
 */
const bars = [
  { name: 'bar-lower', x: 342, y: 622, width: 272, colour: CREAM, start: 0 },
  { name: 'bar-middle', x: 336, y: 454, width: 412, colour: CREAM, start: 7 },
  { name: 'bar-upper', x: 374, y: 286, width: 272, colour: PURPLE, start: 14 },
];

const HEIGHT = 120;
/** How long one bar takes to be written. */
const WRITE = 24;
/** The last stretch of the write, where the bar overruns its width and comes
 * back. A line drawn by a hand does not stop dead. */
const SETTLE = 5;
/** The bar leaves its cap behind before it has any length, so it grows out of
 * a dot rather than appearing as a sliver. */
const CAP = HEIGHT;

/** Out of the gate fast, arriving slowly: the shape of something thrown rather
 * than something dragged. */
const easeOut = { o: { x: [0.16], y: [0] }, i: { x: [0.12], y: [1] } };
const easeInOut = { o: { x: [0.4], y: [0] }, i: { x: [0.6], y: [1] } };

function keyframes(entries) {
  return {
    a: 1,
    k: entries.map(({ t, value, ease = easeOut }, index) =>
      index === entries.length - 1
        ? { t, s: value }
        : { t, s: value, o: ease.o, i: ease.i },
    ),
  };
}

function bar({ name, x, y, width, colour, start }) {
  const centreY = y + HEIGHT / 2;
  // The left cap is nailed down and the bar grows out of it, so the stack is
  // written from its spine outwards instead of expanding from its middle.
  const at = length => x + length / 2;
  const written = start + WRITE;
  const overrun = width + 16;

  return {
    ty: 4,
    nm: name,
    sr: 1,
    ks: { o: { a: 0, k: 100 }, p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] } },
    ao: 0,
    ip: 0,
    op: END,
    st: 0,
    bm: 0,
    shapes: [
      {
        ty: 'gr',
        nm: name,
        it: [
          {
            ty: 'rc',
            d: 1,
            r: { a: 0, k: HEIGHT / 2 },
            s: keyframes([
              { t: start, value: [CAP, HEIGHT] },
              { t: written - SETTLE, value: [overrun, HEIGHT] },
              { t: written, value: [width, HEIGHT], ease: easeInOut },
            ]),
            p: keyframes([
              { t: start, value: [at(CAP), centreY] },
              { t: written - SETTLE, value: [at(overrun), centreY] },
              { t: written, value: [at(width), centreY], ease: easeInOut },
            ]),
          },
          { ty: 'fl', c: { a: 0, k: [...colour, 1] }, o: { a: 0, k: 100 } },
          {
            ty: 'tr',
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            // The cap fades in over three frames rather than appearing, which
            // is what keeps the first frame of each line from popping.
            o: keyframes([
              { t: 0, value: [0] },
              { t: start, value: [0] },
              { t: start + 3, value: [100] },
            ]),
          },
        ],
      },
    ],
  };
}

/**
 * The mark's own transform, lifted from the SVG: the whole stack is anchored on
 * the middle bar's centre, turned, and enlarged. Lottie applies position,
 * rotation, scale and anchor in that order, which is the order the SVG's
 * transform list is written in.
 */
const stack = {
  ty: 3,
  nm: 'mark',
  sr: 1,
  ks: {
    o: { a: 0, k: 100 },
    r: { a: 0, k: -38 },
    p: { a: 0, k: [SIZE / 2, SIZE / 2] },
    a: { a: 0, k: [542, 514] },
    // One breath after the last line lands, so the mark arrives rather than
    // stopping. It ends where it started, which is where the app icon is.
    s: keyframes([
      { t: 38, value: [125, 125] },
      { t: 56, value: [129.5, 129.5], ease: easeInOut },
      { t: 74, value: [125, 125], ease: easeInOut },
    ]),
  },
  ao: 0,
  ip: 0,
  op: END,
  st: 0,
  bm: 0,
};

const animation = {
  v: '5.7.4',
  fr: FPS,
  ip: 0,
  op: END,
  w: SIZE,
  h: SIZE,
  nm: 'Lesingo launch',
  ddd: 0,
  assets: [],
  // Lottie draws the first layer on top and parents by index, so the stack's
  // transform layer is declared last and every bar is parented to it.
  layers: [
    ...bars.map((entry, index) => ({
      ...bar(entry),
      ind: index + 1,
      parent: 4,
    })),
    { ...stack, ind: 4 },
  ],
};

writeFileSync(OUT, `${JSON.stringify(animation, null, 2)}\n`);
console.log(`Wrote ${OUT}`);
