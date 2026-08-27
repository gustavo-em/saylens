/* eslint-env jest */

jest.mock('@react-native-async-storage/async-storage', () => {
  // The mock shipped by the package is ESM and is not transformed here, so the
  // suite uses a minimal in-memory store with the same contract.
  const store = new Map();

  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async key => (store.has(key) ? store.get(key) : null)),
      setItem: jest.fn(async (key, value) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async key => {
        store.delete(key);
      }),
      clear: jest.fn(async () => {
        store.clear();
      }),
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const { Animated, Easing } = require('react-native');

  return {
    __esModule: true,
    default: Animated,
    Easing,
    ReduceMotion: { System: 'system' },
    useAnimatedStyle: updater => updater(),
    useAnimatedProps: updater => updater(),
    useAnimatedScrollHandler: handler => handler,
    useSharedValue: initialValue => ({ value: initialValue }),
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    // The suite reads resting values, so a point that lands exactly on an
    // input reads its own output and anything else reads the middle of the
    // range.
    interpolate: (value, input, output) => {
      const index = input.indexOf(value);

      return index >= 0 ? output[index] : output[Math.floor(output.length / 2)];
    },
    // The animation helpers all resolve to the value they animate towards, so
    // a test sees the finished state rather than a frame of the transition.
    withTiming: targetValue => targetValue,
    withSpring: targetValue => targetValue,
    withDelay: (_delay, animation) => animation,
    withRepeat: animation => animation,
    withSequence: (...animations) => animations[animations.length - 1],
    // The suite reads finished values, so a colour interpolation resolves to
    // the end of its range.
    interpolateColor: (_value, _input, output) => output[output.length - 1],
  };
});

// The suite is not testing animation, and a count that rolls up would leave
// state updates landing after each test's act block.
jest.mock(
  'react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo',
  () => ({
    __esModule: true,
    default: {
      isReduceMotionEnabled: jest.fn(async () => true),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      announceForAccessibility: jest.fn(),
    },
  }),
);

beforeEach(async () => {
  // Preferences now survive a reload, so each test starts from a clean store.
  await require('@react-native-async-storage/async-storage').default.clear();
});
