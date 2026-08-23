/* eslint-env jest */

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
