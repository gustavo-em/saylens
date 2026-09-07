import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import LottieView from 'lottie-react-native';
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
import Svg, { G, Rect } from 'react-native-svg';
import styled from 'styled-components/native';

import splashMark from '../../assets/splashMark.json';

interface AppSplashProps {
  /** True once the app has read back what it stored and can be shown. */
  isReady: boolean;
  onFinished: () => void;
}

/** The mark holds for at least this long, so the launch animation is never cut
 * off halfway by an app that finished loading before it did. It is the
 * animation's own length plus the moment it rests at the end. */
const MINIMUM_MS = 1500;
const FADE_MS = 380;
const MARK_SIZE = 112;
/** The square the animation is drawn on. The animation's own canvas carries
 * margin around the mark, and this factor is what cancels it out: the mark ends
 * up exactly the size the still one above is drawn at, so reduced motion and
 * full motion open at the same scale. */
const STAGE_SIZE = Math.round(MARK_SIZE * 1.25);
/** One half of the mark's quiet pulse, used only where motion is reduced. */
const PULSE_MS = 720;

/**
 * The production Wordstack geometry on a transparent field. A tighter
 * viewBox is intentional: launch marks need optical framing, not a shrunken
 * copy of the full app-icon canvas.
 */
function WordstackMark({ size }: { size: number }) {
  return (
    <Svg height={size} viewBox="104 104 816 816" width={size}>
      <G transform="translate(512,512) rotate(-38) scale(1.25) translate(-542,-514)">
        <Rect fill="#5E41D2" height="120" rx="60" width="272" x="374" y="286" />
        <Rect fill="#F7F4EE" height="120" rx="60" width="412" x="336" y="454" />
        <Rect fill="#F7F4EE" height="120" rx="60" width="272" x="342" y="622" />
      </G>
    </Svg>
  );
}

/**
 * What the app shows while it wakes up.
 *
 * It continues the picture the system already put on screen: the same mark, in
 * the middle of the same dark ground. The system's launch image cannot move,
 * so this one takes over and writes the mark out line by line, the accent last,
 * before stepping back to reveal the camera.
 *
 * The animation is built from the mark's own geometry rather than drawn
 * separately — see scripts/generate-splash-animation.mjs — so the icon and the
 * launch cannot drift apart.
 *
 * Where the system is set to reduce motion, the mark is drawn at rest with the
 * quiet pulse it had before instead: an opening is not worth a headache.
 */
export function AppSplash({ isReady, onFinished }: AppSplashProps) {
  const cover = useSharedValue(1);
  const pulse = useSharedValue(0);
  // Null until the system has been asked. The animation is held back rather
  // than started and swapped, so nobody sees a frame of what they asked not to
  // be shown.
  const [isMotionReduced, setIsMotionReduced] = useState<boolean | null>(null);

  useEffect(() => {
    let isCurrent = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduced => {
        if (isCurrent) setIsMotionReduced(reduced);
      })
      .catch(() => {
        if (isCurrent) setIsMotionReduced(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, {
        duration: PULSE_MS,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
    );
  }, [pulse]);

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
  const markStyle = useAnimatedStyle(() => ({
    opacity: 0.82 + pulse.value * 0.18,
    transform: [{ scale: 0.975 + pulse.value * 0.025 }],
  }));

  return (
    <Cover pointerEvents="none" style={coverStyle} testID="app-splash">
      <Stage>
        {isMotionReduced === false ? (
          <Launch
            autoPlay
            loop={false}
            resizeMode="contain"
            source={splashMark}
            testID="app-splash-animation"
          />
        ) : null}
        {isMotionReduced === true ? (
          <Layer style={markStyle}>
            <WordstackMark size={MARK_SIZE} />
          </Layer>
        ) : null}
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
  width: ${STAGE_SIZE}px;
  height: ${STAGE_SIZE}px;
  align-items: center;
  justify-content: center;
`;

const Launch = styled(LottieView)`
  width: ${STAGE_SIZE}px;
  height: ${STAGE_SIZE}px;
`;

const Layer = styled(Animated.View)`
  position: absolute;
`;
