import { useEffect } from 'react';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import styled from 'styled-components/native';

interface AppSplashProps {
  /** True once the app has read back what it stored and can be shown. */
  isReady: boolean;
  onFinished: () => void;
}

/** The mark holds for at least this long, so a fast start still reads as an
 * opening rather than a flash. */
const MINIMUM_MS = 900;
const FADE_MS = 380;
const MARK_SIZE = 112;
/** One half of a breath of the S. */
const BREATH_MS = 620;

/**
 * The mark drawn for a dark ground: no field behind it, and the arc that is
 * near-black on the icon turned white so it can be seen. The geometry is the
 * icon's own — two arcs of one circle, turned against each other, inside the
 * viewfinder.
 */
function DarkMark({ size }: { size: number }) {
  return (
    <Svg height={size} viewBox="0 0 192 192" width={size}>
      <Path
        d="M30.5 52.5V36.5H46.5M143.5 36.5H159.5V52.5M30.5 137.5V153.5H46.5M143.5 153.5H159.5V137.5"
        fill="none"
        stroke="rgba(255, 255, 255, 0.9)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={5}
      />
    </Svg>
  );
}

/** The S alone, which is the part that breathes. */
function BreathingS({ size }: { size: number }) {
  return (
    <Svg height={size} viewBox="0 0 192 192" width={size}>
      <Path
        d="M64.19 84A31 31 0 0 1 124.3 68.96"
        fill="none"
        stroke="#4153FB"
        strokeLinecap="round"
        strokeWidth={14}
      />
      <Path
        d="M124.81 108A31 31 0 0 1 64.7 123.04"
        fill="none"
        stroke="#ffffff"
        strokeLinecap="round"
        strokeWidth={14}
      />
    </Svg>
  );
}

/**
 * What the app shows while it wakes up.
 *
 * It continues the picture the system already put on screen: the same mark, at
 * the same size, in the middle of the same dark ground. The system's launch
 * image cannot move, so this one takes over and gives it a breath — the mark
 * settles, the corner brackets open around it, and the whole thing steps back
 * to reveal the camera.
 */
export function AppSplash({ isReady, onFinished }: AppSplashProps) {
  const cover = useSharedValue(1);
  const breath = useSharedValue(0);
  const brackets = useSharedValue(0);

  useEffect(() => {
    // The S beats while the app wakes up. The viewfinder around it stays put:
    // one thing moving reads as a heartbeat, two read as a wobble.
    breath.value = withRepeat(
      withTiming(1, {
        duration: BREATH_MS,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
    );
    brackets.value = withDelay(
      120,
      withTiming(1, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [brackets, breath]);

  useEffect(() => {
    if (!isReady) return;

    cover.value = withDelay(
      MINIMUM_MS,
      withTiming(
        0,
        {
          duration: FADE_MS,
          easing: Easing.in(Easing.quad),
          reduceMotion: ReduceMotion.System,
        },
        finished => {
          if (finished) runOnJS(onFinished)();
        },
      ),
    );
  }, [cover, isReady, onFinished]);

  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.value }));
  const breathStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + breath.value * 0.45,
    transform: [{ scale: 0.94 + breath.value * 0.06 }],
  }));
  const bracketStyle = useAnimatedStyle(() => ({
    opacity: brackets.value,
    transform: [{ scale: 0.9 + brackets.value * 0.1 }],
  }));

  return (
    <Cover pointerEvents="none" style={coverStyle} testID="app-splash">
      <Stage>
        <Layer style={bracketStyle}>
          <DarkMark size={MARK_SIZE} />
        </Layer>
        <Layer style={breathStyle}>
          <BreathingS size={MARK_SIZE} />
        </Layer>
      </Stage>
    </Cover>
  );
}

const Cover = styled(Animated.View)`
  position: absolute;
  inset: 0px;
  align-items: center;
  justify-content: center;
  background-color: #070e18;
  z-index: 20;
`;

const Stage = styled.View`
  width: ${MARK_SIZE}px;
  height: ${MARK_SIZE}px;
  align-items: center;
  justify-content: center;
`;

const Layer = styled(Animated.View)`
  position: absolute;
`;
