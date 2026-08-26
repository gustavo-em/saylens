import {
  getObjectCardPlacement,
  OBJECT_CARD_WIDTH,
} from '../src/features/learning/presentation/animation/objectCardPlacement';

describe('object card placement', () => {
  const viewport = { width: 390, height: 844 };
  const scale = 1;
  const width = OBJECT_CARD_WIDTH * scale;

  function absolute(object: {
    left: number;
    top: number;
    width: number;
    height: number;
  }) {
    const placement = getObjectCardPlacement(object, viewport, scale);
    return {
      ...placement,
      absoluteLeft: object.left + placement.left,
      absoluteTop: object.top + placement.top,
    };
  }

  it('stands the card beside an object with room on its right', () => {
    const object = { left: 40, top: 300, width: 90, height: 120 };
    const { absoluteLeft, side } = absolute(object);

    expect(absoluteLeft).toBeGreaterThanOrEqual(object.left + object.width);
    expect(side).toBe('right');
  });

  it('crosses to the other side when the near edge has no room', () => {
    const object = { left: 250, top: 300, width: 120, height: 140 };
    const { absoluteLeft, side } = absolute(object);

    expect(absoluteLeft + width).toBeLessThanOrEqual(object.left);
    expect(side).toBe('left');
  });

  it('keeps the card on screen for an object against the left edge', () => {
    const object = { left: 0, top: 300, width: 60, height: 90 };
    const { absoluteLeft } = absolute(object);

    expect(absoluteLeft).toBeGreaterThanOrEqual(0);
    expect(absoluteLeft + width).toBeLessThanOrEqual(viewport.width);
  });

  it('keeps the card on screen for an object against the right edge', () => {
    const object = { left: 330, top: 300, width: 60, height: 90 };
    const { absoluteLeft } = absolute(object);

    expect(absoluteLeft).toBeGreaterThanOrEqual(0);
    expect(absoluteLeft + width).toBeLessThanOrEqual(viewport.width);
  });

  it('keeps the card on screen for an object filling the frame', () => {
    const object = { left: 0, top: 100, width: viewport.width, height: 600 };
    const { absoluteLeft } = absolute(object);

    expect(absoluteLeft).toBeGreaterThanOrEqual(0);
    expect(absoluteLeft + width).toBeLessThanOrEqual(viewport.width);
  });

  it('hinges the card on the edge that faces the object', () => {
    const onTheRight = absolute({ left: 20, top: 300, width: 80, height: 100 });
    const onTheLeft = absolute({ left: 280, top: 300, width: 90, height: 100 });

    expect(onTheRight.transformOrigin).toEqual(['0%', '100%', 0]);
    expect(onTheRight.hingeAxis).toBe('y');
    expect(onTheRight.hingeDirection).toBe(1);
    expect(onTheLeft.transformOrigin).toEqual(['100%', '100%', 0]);
    expect(onTheLeft.hingeDirection).toBe(-1);
  });

  it('goes under a wide object that leaves no room at either side', () => {
    const object = { left: 20, top: 200, width: 350, height: 120 };
    const placement = absolute(object);

    expect(placement.side).toBe('below');
    expect(placement.hingeAxis).toBe('x');
    expect(placement.absoluteTop).toBeGreaterThanOrEqual(
      object.top + object.height,
    );
  });

  it('goes over a wide object sitting at the bottom of the frame', () => {
    const object = { left: 20, top: 500, width: 350, height: 220 };
    const placement = absolute(object);

    expect(placement.side).toBe('above');
    expect(placement.hingeAxis).toBe('x');
    expect(placement.hingeDirection).toBe(1);
  });

  it('keeps the card clear of the screen furniture', () => {
    const high = absolute({ left: 40, top: 0, width: 80, height: 40 });
    const low = absolute({ left: 40, top: 800, width: 80, height: 44 });

    expect(high.absoluteTop).toBeGreaterThanOrEqual(92);
    expect(low.absoluteTop).toBeLessThanOrEqual(844 - 116);
  });

  it('survives a viewport narrower than the card', () => {
    const narrow = getObjectCardPlacement(
      { left: 10, top: 100, width: 40, height: 40 },
      { width: 120, height: 400 },
      1,
    );

    expect(Number.isFinite(narrow.left)).toBe(true);
    expect(10 + narrow.left).toBeGreaterThanOrEqual(0);
  });
});
