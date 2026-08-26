import { useEffect } from 'react';
import LottieView from 'lottie-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import styled from 'styled-components/native';

import successCelebration from '../../../../assets/successCelebration.json';

interface PronunciationCelebrationProps {
  cameraLabel: string;
  detail: string;
  historyLabel: string;
  onOpenHistory: () => void;
  onReturnToCamera: () => void;
  returningLabel: string;
  title: string;
  word: string;
}

const BADGE_SIZE = 108;
const RING_SIZE = BADGE_SIZE + 44;
/** The fireworks are drawn well beyond the badge, so their stage is wider than
 * the badge that sits in the middle of it. */
const FIREWORKS_SIZE = 320;

/**
 * The moment a word is pronounced correctly.
 *
 * It is the one screen in the app that celebrates rather than informs, so it
 * takes the whole space and moves: a ring opens outwards, the badge lands with
 * a spring, sparks fly once, and the words rise into place underneath.
 */
export function PronunciationCelebration({
  cameraLabel,
  detail,
  historyLabel,
  onOpenHistory,
  onReturnToCamera,
  returningLabel,
  title,
  word,
}: PronunciationCelebrationProps) {
  const entrance = useSharedValue(0);
  const badge = useSharedValue(0);
  const ring = useSharedValue(0);

  useEffect(() => {
    entrance.value = withTiming(1, {
      duration: 340,
      easing: Easing.out(Easing.cubic),
    });
    badge.value = withSequence(
      withSpring(1, { damping: 8, stiffness: 160 }),
      withDelay(320, withRepeat(withTiming(1.05, { duration: 700 }), 2, true)),
    );
    ring.value = withDelay(
      80,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
    );
  }, [badge, entrance, ring]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * 20 }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badge.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: (1 - ring.value) * 0.5,
    transform: [{ scale: 0.7 + ring.value * 0.6 }],
  }));

  return (
    <Panel testID="speak-celebration">
      <Stage>
        <Fireworks
          autoPlay
          loop
          resizeMode="contain"
          source={successCelebration}
          testID="speak-celebration-fireworks"
        />
        <Ring pointerEvents="none" style={ringStyle} />
        <Badge style={badgeStyle}>
          <Svg height={52} viewBox="0 0 24 24" width={52}>
            <Path
              d="M5 12.5 10 17.5 19 7"
              fill="none"
              stroke="#ffffff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.8}
            />
          </Svg>
        </Badge>
      </Stage>

      <Words style={contentStyle}>
        <Title accessibilityRole="header">{title}</Title>
        <Word numberOfLines={1}>{word}</Word>
        <Detail>{detail}</Detail>
      </Words>

      <Actions style={contentStyle}>
        <PrimaryButton
          accessibilityRole="button"
          onPress={onReturnToCamera}
          testID="speak-celebration-camera"
        >
          <PrimaryText>{cameraLabel}</PrimaryText>
          <ReturningText>{returningLabel}</ReturningText>
        </PrimaryButton>

        <SecondaryButton
          accessibilityRole="button"
          onPress={onOpenHistory}
          testID="speak-celebration-history"
        >
          <SecondaryText>{historyLabel}</SecondaryText>
        </SecondaryButton>
      </Actions>
    </Panel>
  );
}

/** The panel takes the whole space under the header and turns the colour of a
 * word said right. Keeping it inside the screen's own margins, rather than
 * bleeding to the edges, leaves the back button readable on the app's own
 * background. */
const Panel = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 20px 16px 18px;
  border-radius: 28px;
  gap: 18px;
  background-color: ${({ theme }) => theme.colors.success};
`;

const Stage = styled.View`
  width: ${RING_SIZE}px;
  height: ${RING_SIZE}px;
  align-items: center;
  justify-content: center;
`;

const Fireworks = styled(LottieView)`
  position: absolute;
  width: ${FIREWORKS_SIZE}px;
  height: ${FIREWORKS_SIZE}px;
`;

const Ring = styled(Animated.View)`
  position: absolute;
  width: ${RING_SIZE}px;
  height: ${RING_SIZE}px;
  border-radius: ${RING_SIZE / 2}px;
  border: 3px solid #ffffff;
`;

const Badge = styled(Animated.View)`
  width: ${BADGE_SIZE}px;
  height: ${BADGE_SIZE}px;
  border-radius: ${BADGE_SIZE / 2}px;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.18);
  border: 2px solid rgba(255, 255, 255, 0.7);
`;

const Words = styled(Animated.View)`
  align-items: center;
  gap: 4px;
`;

const Title = styled.Text`
  color: #ffffff;
  font-size: 30px;
  font-weight: 800;
`;

const Word = styled.Text`
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  opacity: 0.95;
`;

const Detail = styled.Text`
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
  text-align: center;
`;

const Actions = styled(Animated.View)`
  align-self: stretch;
  gap: 10px;
  padding: 0px 12px;
`;

const PrimaryButton = styled.Pressable`
  padding: 15px 18px;
  border-radius: 16px;
  align-items: center;
  background-color: #ffffff;
`;

const PrimaryText = styled.Text`
  color: ${({ theme }) => theme.colors.success};
  font-size: 16px;
  font-weight: 800;
`;

const ReturningText = styled.Text`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.success};
  font-size: 12px;
  font-weight: 600;
  opacity: 0.75;
`;

const SecondaryButton = styled.Pressable`
  padding: 13px 18px;
  border-radius: 16px;
  align-items: center;
  border: 1.5px solid rgba(255, 255, 255, 0.75);
`;

const SecondaryText = styled.Text`
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
`;
