import {
  useCallback,
  useRef,
  useState,
  type ComponentRef,
  type ReactElement,
} from 'react';
import {
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

import type { AuthenticatedUser } from '../../features/learning/application/ports/Authenticator';
import type { VocabularyRepository } from '../../features/learning/application/ports/VocabularyRepository';
import type { LearningLanguageSettings } from '../../features/learning/domain/LearningLanguage';
import type { LearningCopy } from '../../features/learning/presentation/localization/learningCopy';
import {
  AccountPrint,
  CameraPrint,
  GoogleMark,
  PRINT_HEIGHT,
  PRINT_WIDTH,
  PrintFrame,
  SpeakPrint,
  WordsPrint,
  type PrintProps,
} from './OnboardingPrints';

interface OnboardingScreenProps {
  copy: LearningCopy;
  languageSettings: LearningLanguageSettings;
  /** Called when the walk-through is finished or skipped. Either way it is the
   * last time it is shown. */
  onFinish: () => void;
  /** Absent until an identity provider is configured, and then the last step
   * says what is true instead of failing into a dead end. */
  onSignInWithGoogle?: () => void | Promise<void>;
  /** What went wrong on the last attempt, if anything did. */
  signInError?: string | null;
  /** Who is signed in, when anybody is. */
  user?: AuthenticatedUser | null;
  vocabularyRepository: VocabularyRepository;
}

interface OnboardingStep {
  id: 'camera' | 'speak' | 'words' | 'account';
  Print: (props: PrintProps) => ReactElement;
}

/**
 * The order the app itself works in — find a word, say it, get it back — and
 * then the one thing it asks for in return, once it has shown what it is for.
 */
const steps: readonly OnboardingStep[] = [
  { id: 'camera', Print: CameraPrint },
  { id: 'speak', Print: SpeakPrint },
  { id: 'words', Print: WordsPrint },
  { id: 'account', Print: AccountPrint },
];

/** First guess at what the text, the dots and the button take, used for the
 * frame before the page has been laid out. After that the slot measures
 * itself, because the sentence under the print wraps to a different number of
 * lines in every language and at every text size. */
const CHROME_HEIGHT = 380;

/** How far the print lags behind the page carrying it. */
const PARALLAX = 0.3;

/**
 * What a learner sees the first time the app opens.
 *
 * Four steps, swiped sideways, each one showing the screen it is talking
 * about. It follows the same direction as the rest of the app away from the
 * camera: one surface, one action colour, large type and a lot of air, so the
 * pictures are the only thing making noise.
 *
 * Leaving is available on every step, including the last one: an account is
 * offered, never required.
 */
export function OnboardingScreen({
  copy,
  languageSettings,
  onFinish,
  onSignInWithGoogle,
  signInError,
  user,
  vocabularyRepository,
}: OnboardingScreenProps) {
  const { height, width } = useWindowDimensions();
  const pages = useRef<ComponentRef<typeof Pages> | null>(null);
  const [step, setStep] = useState(0);
  const [slotHeight, setSlotHeight] = useState(
    Math.max(height - CHROME_HEIGHT, 200),
  );
  // The finger's own position drives everything that moves, so the pictures
  // follow the swipe rather than playing an animation of their own.
  const scrollX = useSharedValue(0);
  const handleScroll = useAnimatedScrollHandler(event => {
    scrollX.value = event.contentOffset.x;
  });

  // The print takes whatever the text and the button leave behind, and never
  // more than its drawn size, so a small screen shrinks it instead of cropping
  // it and a tablet does not blow it up.
  const scale = Math.min(
    (width - 96) / PRINT_WIDTH,
    slotHeight / PRINT_HEIGHT,
    1,
  );
  const isAccount = step === steps.length - 1;
  const isSignInAvailable = onSignInWithGoogle != null;

  const goTo = useCallback(
    (index: number) => {
      setStep(index);
      pages.current?.scrollTo({ x: index * width, animated: true });
    },
    [width],
  );

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = event.nativeEvent.contentOffset.x;
      const index = Math.round(offset / Math.max(width, 1));

      setStep(Math.min(Math.max(index, 0), steps.length - 1));
    },
    [width],
  );

  return (
    <Container testID="onboarding">
      <OnboardingSafeArea edges={['top', 'bottom']}>
        <Header>
          {/* Leaving is one tap away on every step, so nothing here can feel
              like a gate. */}
          <Skip
            accessibilityRole="button"
            hitSlop={10}
            onPress={onFinish}
            testID="onboarding-skip"
          >
            <SkipText>{copy.onboarding.skip}</SkipText>
          </Skip>
        </Header>

        <Pages
          horizontal
          onMomentumScrollEnd={handleMomentumEnd}
          onScroll={handleScroll}
          pagingEnabled
          ref={pages}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          testID="onboarding-pages"
        >
          {steps.map(({ id, Print }, index) => (
            <Page key={id} style={{ width }}>
              <PrintSlot
                onLayout={event =>
                  setSlotHeight(event.nativeEvent.layout.height)
                }
              >
                {/* The print is lifted out of the flow so its own size never
                    feeds back into the height being measured. */}
                <PrintCentre>
                  <MovingPrint index={index} scrollX={scrollX} width={width}>
                    <PrintFrame scale={scale}>
                      <Print
                        copy={copy}
                        languageSettings={languageSettings}
                        vocabularyRepository={vocabularyRepository}
                      />
                    </PrintFrame>
                  </MovingPrint>
                </PrintCentre>
              </PrintSlot>

              <MovingWords index={index} scrollX={scrollX} width={width}>
                <Title accessibilityRole="header">
                  {copy.onboarding[id].title}
                </Title>
                <Body>{copy.onboarding[id].body}</Body>
              </MovingWords>
            </Page>
          ))}
        </Pages>

        <Footer>
          <Dots
            accessibilityLabel={copy.onboarding.stepOf(step + 1, steps.length)}
            accessible
          >
            {steps.map((entry, index) => (
              <Dot
                index={index}
                key={entry.id}
                scrollX={scrollX}
                width={width}
              />
            ))}
          </Dots>

          {signInError != null ? <Problem>{signInError}</Problem> : null}

          {!isAccount || user != null ? (
            <Advance
              accessibilityRole="button"
              onPress={() => (isAccount ? onFinish() : goTo(step + 1))}
              testID="onboarding-advance"
            >
              <AdvanceText>
                {isAccount ? copy.onboarding.start : copy.onboarding.next}
              </AdvanceText>
            </Advance>
          ) : (
            <>
              <GoogleButton
                accessibilityLabel={copy.account.google}
                accessibilityRole="button"
                accessibilityState={{ disabled: !isSignInAvailable }}
                onPress={onSignInWithGoogle}
                testID="onboarding-google"
                $available={isSignInAvailable}
              >
                <GoogleMark size={19} />
                <GoogleText>{copy.account.google}</GoogleText>
              </GoogleButton>

              {isSignInAvailable ? null : <Soon>{copy.account.soon}</Soon>}

              {/* Doing it later is a real answer, not a way out of the step. */}
              <Later
                accessibilityRole="button"
                onPress={onFinish}
                testID="onboarding-later"
              >
                <LaterText>{copy.account.later}</LaterText>
              </Later>
            </>
          )}
        </Footer>
      </OnboardingSafeArea>
    </Container>
  );
}

/** How far the page at this index is from the one being read, in pages. */
function pageOffset(
  scrollX: SharedValue<number>,
  index: number,
  width: number,
) {
  'worklet';
  return (scrollX.value - index * width) / Math.max(width, 1);
}

/** The print lags behind its page and shrinks as it leaves, which is what
 * makes a swipe read as depth rather than as a slide. */
function MovingPrint({
  children,
  index,
  scrollX,
  width,
}: {
  children: ReactElement;
  index: number;
  scrollX: SharedValue<number>;
  width: number;
}) {
  const style = useAnimatedStyle(() => {
    const offset = pageOffset(scrollX, index, width);

    return {
      opacity: interpolate(offset, [-1, 0, 1], [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: offset * width * PARALLAX },
        {
          scale: interpolate(
            offset,
            [-1, 0, 1],
            [0.86, 1, 0.86],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return <Moving style={style}>{children}</Moving>;
}

/** The words settle a moment after the picture, so the two do not arrive as
 * one block. */
function MovingWords({
  children,
  index,
  scrollX,
  width,
}: {
  children: ReactElement | ReactElement[];
  index: number;
  scrollX: SharedValue<number>;
  width: number;
}) {
  const style = useAnimatedStyle(() => {
    const distance = Math.abs(pageOffset(scrollX, index, width));

    return {
      opacity: interpolate(distance, [0, 0.55], [1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            distance,
            [0, 1],
            [0, 20],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return <Words style={style}>{children}</Words>;
}

/** The step in hand is a bar rather than a bigger circle: the same ink, more
 * of it, which reads as progress instead of as a second control. It grows with
 * the swipe rather than after it. */
function Dot({
  index,
  scrollX,
  width,
}: {
  index: number;
  scrollX: SharedValue<number>;
  width: number;
}) {
  const style = useAnimatedStyle(() => {
    const distance = Math.abs(pageOffset(scrollX, index, width));

    return {
      width: interpolate(distance, [0, 1], [20, 6], Extrapolation.CLAMP),
    };
  });
  const fillStyle = useAnimatedStyle(() => {
    const distance = Math.abs(pageOffset(scrollX, index, width));

    return {
      opacity: interpolate(distance, [0, 1], [1, 0], Extrapolation.CLAMP),
    };
  });

  return (
    <DotTrack style={style}>
      <DotFill style={fillStyle} />
    </DotTrack>
  );
}

const Container = styled.View`
  position: absolute;
  inset: 0px;
  background-color: ${({ theme }) => theme.colors.background};
  z-index: 10;
`;

const OnboardingSafeArea = styled(SafeAreaView)`
  flex: 1;
`;

const Header = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  padding: 4px 20px 0px;
  height: 34px;
`;

const Skip = styled.Pressable`
  padding: 6px 4px;
`;

const SkipText = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
  font-weight: 600;
`;

/** The row of pages fills the scroll view, so a page can stretch to its full
 * height and give the print the room the text does not use. */
const Pages = styled(Animated.ScrollView).attrs({
  contentContainerStyle: { flexGrow: 1 },
})`
  flex: 1;
`;

const Page = styled.View`
  align-items: center;
  padding: 0px 28px;
`;

const PrintSlot = styled.View`
  flex: 1;
  align-self: stretch;
`;

const PrintCentre = styled.View`
  position: absolute;
  inset: 0px;
  align-items: center;
  justify-content: center;
`;

const Moving = styled(Animated.View)`
  align-items: center;
  justify-content: center;
`;

const Words = styled(Animated.View)`
  align-items: center;
  padding-bottom: 8px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 28px;
  line-height: 33px;
  font-weight: 800;
  letter-spacing: -0.6px;
  text-align: center;
`;

const Body = styled.Text`
  max-width: 320px;
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 15px;
  line-height: 21px;
  text-align: center;
`;

const Footer = styled.View`
  padding: 0px 20px 20px;
  gap: 8px;
`;

const Dots = styled.View`
  flex-direction: row;
  align-self: center;
  align-items: center;
  gap: 6px;
  padding: 18px 0px 10px;
`;

const DotTrack = styled(Animated.View)`
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.border};
`;

const DotFill = styled(Animated.View)`
  position: absolute;
  inset: 0px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const Advance = styled.Pressable`
  align-items: center;
  justify-content: center;
  padding: 15px 18px;
  border-radius: 16px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const AdvanceText = styled.Text`
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
`;

/** White with the Google mark, which is what their brand guidance asks of a
 * sign-in button. */
const GoogleButton = styled.Pressable<{ $available: boolean }>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 15px 18px;
  border-radius: 16px;
  opacity: ${({ $available }) => ($available ? 1 : 0.55)};
  background-color: #ffffff;
`;

const GoogleText = styled.Text`
  color: #1f1f1f;
  font-size: 15px;
  font-weight: 700;
`;

const Soon = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  line-height: 17px;
  text-align: center;
`;

const Later = styled.Pressable`
  padding: 10px;
  align-items: center;
`;

const LaterText = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
  font-weight: 600;
`;

const Problem = styled.Text`
  color: ${({ theme }) => theme.colors.danger};
  font-size: 13px;
  line-height: 19px;
  text-align: center;
`;
