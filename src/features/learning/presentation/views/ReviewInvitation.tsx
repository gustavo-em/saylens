import { useState } from 'react';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import styled, { useTheme } from 'styled-components/native';

import type { LearningCopy } from '../localization/learningCopy';

interface ReviewInvitationProps {
  copy: LearningCopy;
  onDismiss: () => void;
  onNever: () => void;
  onRate: () => void;
}

const STARS = [1, 2, 3, 4, 5];
/** Five stars sends the learner to the store's own prompt; anything less is
 * taken as something to fix rather than something to publish. */
const STARS_THAT_RATE = 5;

function Star({ filled, colour }: { filled: boolean; colour: string }) {
  return (
    <Svg height={38} viewBox="0 0 24 24" width={38}>
      <Path
        d="M12 3.5l2.6 5.3 5.9.9-4.3 4.2 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z"
        fill={filled ? colour : 'none'}
        stroke={colour}
        strokeLinejoin="round"
        strokeWidth={1.6}
      />
    </Svg>
  );
}

/**
 * Asks what the learner thinks, once the app has already helped them a few
 * times.
 *
 * Five stars hands over to the platform's own rating prompt rather than to a
 * link: that is what the store's rules ask for, and it keeps the learner
 * inside the app. Fewer stars are answered with thanks and nothing else — a
 * rating screen that argues with its answer is worse than no rating screen.
 */
export function ReviewInvitation({
  copy,
  onDismiss,
  onNever,
  onRate,
}: ReviewInvitationProps) {
  const theme = useTheme();
  const [chosen, setChosen] = useState<number | null>(null);
  const entrance = useSharedValue(0);

  if (entrance.value === 0) {
    entrance.value = withDelay(
      80,
      withSpring(1, {
        damping: 14,
        stiffness: 160,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * 30 }],
  }));

  function choose(stars: number) {
    setChosen(stars);

    if (stars >= STARS_THAT_RATE) {
      onRate();
      return;
    }

    // Thanks, and out: the learner said their piece and does not owe a form.
    entrance.value = withTiming(
      0,
      { duration: 260, easing: Easing.in(Easing.quad) },
      () => undefined,
    );
    setTimeout(onDismiss, 900);
  }

  return (
    <Backdrop testID="review-invitation">
      <Sheet style={sheetStyle}>
        <Title accessibilityRole="header">{copy.review.title}</Title>
        <Body>
          {chosen == null
            ? copy.review.body
            : chosen >= STARS_THAT_RATE
            ? copy.review.thanks
            : copy.review.feedbackThanks}
        </Body>

        <Stars>
          {STARS.map(stars => (
            <StarButton
              accessibilityLabel={`${stars}`}
              accessibilityRole="button"
              hitSlop={6}
              key={stars}
              onPress={() => choose(stars)}
              testID={`review-star-${stars}`}
            >
              <Star
                colour={
                  chosen != null && stars <= chosen
                    ? theme.colors.accent
                    : theme.colors.muted
                }
                filled={chosen != null && stars <= chosen}
              />
            </StarButton>
          ))}
        </Stars>

        <Quiet
          accessibilityRole="button"
          onPress={onDismiss}
          testID="review-later"
        >
          <QuietText>{copy.review.later}</QuietText>
        </Quiet>
        <Quiet
          accessibilityRole="button"
          onPress={onNever}
          testID="review-never"
        >
          <QuietText $faint>{copy.review.never}</QuietText>
        </Quiet>
      </Sheet>
    </Backdrop>
  );
}

const Backdrop = styled.View`
  position: absolute;
  inset: 0px;
  align-items: center;
  justify-content: flex-end;
  padding: 20px;
  background-color: rgba(3, 7, 14, 0.55);
  z-index: 10;
`;

const Sheet = styled(Animated.View)`
  align-self: stretch;
  align-items: center;
  padding: 26px 22px 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 26px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 21px;
  font-weight: 800;
`;

const Body = styled.Text`
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
  line-height: 20px;
  text-align: center;
`;

const Stars = styled.View`
  flex-direction: row;
  gap: 6px;
  margin: 20px 0px 8px;
`;

const StarButton = styled.Pressable`
  padding: 2px;
`;

const Quiet = styled.Pressable`
  padding: 10px;
`;

const QuietText = styled.Text<{ $faint?: boolean }>`
  color: ${({ theme, $faint }) =>
    $faint ? theme.colors.muted : theme.colors.text};
  font-size: ${({ $faint }) => ($faint ? 12.5 : 14)}px;
  font-weight: 600;
`;
