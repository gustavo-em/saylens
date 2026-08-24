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
    useSharedValue: initialValue => ({ value: initialValue }),
    withTiming: targetValue => targetValue,
  };
});

beforeEach(async () => {
  // Preferences now survive a reload, so each test starts from a clean store.
  await require('@react-native-async-storage/async-storage').default.clear();
});
