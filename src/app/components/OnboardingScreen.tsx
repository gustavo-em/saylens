import {
  useCallback,
  useRef,
  useState,
  type ComponentRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Platform,
  StyleSheet,
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
import { AppleButton } from '@invertase/react-native-apple-authentication';

import type { AuthenticatedUser } from '../../features/learning/application/ports/Authenticator';
import type { VocabularyRepository } from '../../features/learning/application/ports/VocabularyRepository';
import {
  languageFlags,
  learningLanguages,
  type LearningLanguage,
  type LearningLanguageSettings,
} from '../../features/learning/domain/LearningLanguage';
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
  /** The languages the first step sets. They are written the moment they are
   * tapped rather than on leaving the step, so the rest of the walk-through is
   * already in the language that was chosen. */
  onLearningLanguageChange: (language: LearningLanguage) => void;
  onNativeLanguageChange: (language: LearningLanguage) => void;
  onOpenEmail?: () => void;
  onSignInWithApple?: () => void | Promise<void>;
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
  id: 'languages' | 'camera' | 'speak' | 'words' | 'account';
  /** Absent on the step that asks a question rather than showing an answer:
   * that one puts the real controls where the picture goes. */
  Print?: (props: PrintProps) => ReactElement;
}

/**
 * The languages first, because every step after it is written in the one that
 * was chosen and every print shows the pair. Then the order the app itself
 * works in — find a word, say it, get it back — and last the one thing it asks
 * for in return, once it has shown what it is for.
 */
const steps: readonly OnboardingStep[] = [
  { id: 'languages' },
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

/** Air kept above and below the print, taken out of the slot before the print
 * is fitted into it. Without it a screen tall enough to draw the print at its
 * full size leaves the phone in the picture touching the heading under it. */
const PRINT_GAP = 24;

/**
 * What a learner sees the first time the app opens.
 *
 * Five steps, swiped sideways. The first asks which two languages the app is
 * for, and the four after it show the screen each one is talking about. It
 * follows the same direction as the rest of the app away from the camera: one
 * surface, one action colour, large type and a lot of air, so the pictures are
 * the only thing making noise.
 *
 * Leaving is available from the second step on, including the last one: an
 * account is offered, never required. The languages are the one thing the app
 * cannot guess its way out of, so that step has no way past it until the
 * learner has said what they came to learn.
 */
export function OnboardingScreen({
  copy,
  languageSettings,
  onFinish,
  onLearningLanguageChange,
  onNativeLanguageChange,
  onOpenEmail,
  onSignInWithApple,
  onSignInWithGoogle,
  signInError,
  user,
  vocabularyRepository,
}: OnboardingScreenProps) {
  const { height, width } = useWindowDimensions();
  const pages = useRef<ComponentRef<typeof Pages> | null>(null);
  const [step, setStep] = useState(0);
  // Every page measures its own slot, because the sentence under the print
  // wraps to a different number of lines on each one. The print is drawn at a
  // single size, so it is the tightest page that decides it.
  const [slotHeights, setSlotHeights] = useState<Record<number, number>>({});
  /** The device's own language seeds both choices, which means a pair is
   * already selected before anybody has looked at it. This records the tap
   * that turns that guess into an answer. */
  const [hasChosenLearning, setHasChosenLearning] = useState(false);
  const measuredSlots = Object.values(slotHeights);
  const slotHeight =
    measuredSlots.length > 0
      ? Math.min(...measuredSlots)
      : Math.max(height - CHROME_HEIGHT, 200);
  // The finger's own position drives everything that moves, so the pictures
  // follow the swipe rather than playing an animation of their own.
  const scrollX = useSharedValue(0);
  const handleScroll = useAnimatedScrollHandler(event => {
    scrollX.value = event.contentOffset.x;
  });

  // The print takes whatever the text and the button leave behind, and never
  // more than its drawn size, so a small screen shrinks it instead of cropping
  // it and a tablet does not blow it up.
  const scale = Math.max(
    Math.min(
      (width - 96) / PRINT_WIDTH,
      (slotHeight - PRINT_GAP * 2) / PRINT_HEIGHT,
      1,
    ),
    // A slot shorter than the air it is asked to keep would otherwise fold the
    // print inside out.
    0.2,
  );
  const isLanguages = steps[step]?.id === 'languages';
  const isAccount = step === steps.length - 1;
  const isBlocked = isLanguages && !hasChosenLearning;
  // Apple only signs anybody in on its own platform, so on Android the button
  // is absent rather than present and broken.
  const appleSignIn = Platform.OS === 'ios' ? onSignInWithApple : undefined;
  const isSignInAvailable = appleSignIn != null || onSignInWithGoogle != null;

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
        {/* The header keeps its height on every step, so the pages below it do
            not shift when the way out appears. */}
        <Header>
          {/* Leaving is one tap away from the second step on. It is withheld
              only where skipping would leave the app guessing which languages
              it is for. */}
          {isLanguages ? null : (
            <Skip
              accessibilityRole="button"
              hitSlop={10}
              onPress={onFinish}
              testID="onboarding-skip"
            >
              <SkipText>{copy.onboarding.skip}</SkipText>
            </Skip>
          )}
        </Header>

        <Pages
          horizontal
          onMomentumScrollEnd={handleMomentumEnd}
          onScroll={handleScroll}
          pagingEnabled
          ref={pages}
          // Swiping is held back with the button rather than left as a way
          // around it, so the step reads as one gate and not as a locked door
          // beside an open one.
          scrollEnabled={!isBlocked}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          testID="onboarding-pages"
        >
          {steps.map(({ id, Print }, index) => (
            <Page key={id} style={{ width }}>
              <PrintSlot
                onLayout={event => {
                  const measured = event.nativeEvent.layout.height;

                  setSlotHeights(current =>
                    current[index] === measured
                      ? current
                      : { ...current, [index]: measured },
                  );
                }}
              >
                {/* The print is lifted out of the flow so its own size never
                    feeds back into the height being measured. */}
                <PrintCentre>
                  <MovingPrint index={index} scrollX={scrollX} width={width}>
                    {Print == null ? (
                      <LanguageChoice
                        copy={copy}
                        languageSettings={languageSettings}
                        onLearningChosen={() => setHasChosenLearning(true)}
                        onLearningLanguageChange={onLearningLanguageChange}
                        onNativeLanguageChange={onNativeLanguageChange}
                        width={width}
                      />
                    ) : (
                      <PrintFrame scale={scale}>
                        <Print
                          copy={copy}
                          languageSettings={languageSettings}
                          vocabularyRepository={vocabularyRepository}
                        />
                      </PrintFrame>
                    )}
                  </MovingPrint>
                </PrintCentre>
              </PrintSlot>

              <MovingWords index={index} scrollX={scrollX} width={width}>
                <Title accessibilityRole="header">
                  {copy.onboarding[id].title}
                </Title>
                <Body>{copy.onboarding[id].body}</Body>
                {/* Said here rather than the first time it happens, so a wrong
                    word reads as a limit that was declared and not as the app
                    lying. */}
                {copy.onboarding[id].note != null ? (
                  <Note>{copy.onboarding[id].note}</Note>
                ) : null}
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
              accessibilityState={{ disabled: isBlocked }}
              disabled={isBlocked}
              onPress={() => (isAccount ? onFinish() : goTo(step + 1))}
              testID="onboarding-advance"
              $available={!isBlocked}
            >
              <AdvanceText>
                {isAccount ? copy.onboarding.start : copy.onboarding.next}
              </AdvanceText>
            </Advance>
          ) : (
            <>
              {appleSignIn != null ? (
                <AppleButton
                  buttonStyle={AppleButton.Style.BLACK}
                  buttonText={copy.account.apple}
                  buttonType={AppleButton.Type.CONTINUE}
                  cornerRadius={16}
                  onPress={appleSignIn}
                  style={appleButtonStyles.button}
                  testID="onboarding-apple"
                />
              ) : null}
              <GoogleButton
                accessibilityLabel={copy.account.google}
                accessibilityRole="button"
                accessibilityState={{ disabled: onSignInWithGoogle == null }}
                onPress={onSignInWithGoogle}
                testID="onboarding-google"
                $available={onSignInWithGoogle != null}
              >
                <GoogleMark size={19} />
                <GoogleText>{copy.account.google}</GoogleText>
              </GoogleButton>
              {onOpenEmail != null ? (
                <EmailButton
                  accessibilityRole="button"
                  onPress={onOpenEmail}
                  testID="onboarding-email"
                >
                  <EmailText>{copy.account.continueWithEmail}</EmailText>
                </EmailButton>
              ) : null}

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

/**
 * The one step that asks instead of shows.
 *
 * It takes the room a print would have taken, and uses the same pills the
 * settings screen uses for the same two questions, so the choice made here is
 * recognisably the one that can be changed there later. The labels are the
 * settings screen's own, rather than a second wording of the same thing.
 *
 * A choice lands the moment it is tapped: the copy, the flags and every print
 * after this step are already in the chosen pair by the time the learner
 * swipes on.
 */
function LanguageChoice({
  copy,
  languageSettings,
  onLearningChosen,
  onLearningLanguageChange,
  onNativeLanguageChange,
  width,
}: {
  copy: LearningCopy;
  languageSettings: LearningLanguageSettings;
  /** Called for every tap in the second group, the already-selected pill
   * included: confirming the guess is as much of an answer as changing it. */
  onLearningChosen: () => void;
  onLearningLanguageChange: (language: LearningLanguage) => void;
  onNativeLanguageChange: (language: LearningLanguage) => void;
  width: number;
}) {
  const { learningLanguage, nativeLanguage } = languageSettings;

  // Learning the language you already speak is not a lesson, so the two never
  // hold the same value. Picking one that is already on the other side trades
  // places with it, which keeps the tap meaningful instead of refusing it.
  const chooseNative = (language: LearningLanguage) => {
    if (language === nativeLanguage) return;
    if (language === learningLanguage) onLearningLanguageChange(nativeLanguage);
    onNativeLanguageChange(language);
  };

  const chooseLearning = (language: LearningLanguage) => {
    onLearningChosen();

    if (language === learningLanguage) return;
    if (language === nativeLanguage) onNativeLanguageChange(learningLanguage);
    onLearningLanguageChange(language);
  };

  return (
    <Choice style={{ width: Math.min(width - 56, 340) }}>
      <ChoiceGroup>
        <ChoiceLabel>{copy.settings.nativeLanguageTitle}</ChoiceLabel>
        <ChoiceOptions accessibilityRole="radiogroup">
          {learningLanguages.map(language => (
            <ChoiceOption
              accessibilityRole="radio"
              accessibilityState={{ checked: nativeLanguage === language }}
              key={language}
              onPress={() => chooseNative(language)}
              testID={`onboarding-native-${language}`}
              $selected={nativeLanguage === language}
            >
              <ChoiceFlag>{languageFlags[language]}</ChoiceFlag>
              <ChoiceOptionText
                numberOfLines={1}
                $selected={nativeLanguage === language}
              >
                {copy.languageShortName(language)}
              </ChoiceOptionText>
            </ChoiceOption>
          ))}
        </ChoiceOptions>
      </ChoiceGroup>

      <ChoiceGroup>
        <ChoiceLabel>{copy.settings.learningLanguageTitle}</ChoiceLabel>
        <ChoiceOptions accessibilityRole="radiogroup">
          {learningLanguages.map(language => (
            <ChoiceOption
              accessibilityRole="radio"
              accessibilityState={{ checked: learningLanguage === language }}
              key={language}
              onPress={() => chooseLearning(language)}
              testID={`onboarding-learning-${language}`}
              $selected={learningLanguage === language}
            >
              <ChoiceFlag>{languageFlags[language]}</ChoiceFlag>
              <ChoiceOptionText
                numberOfLines={1}
                $selected={learningLanguage === language}
              >
                {copy.languageShortName(language)}
              </ChoiceOptionText>
            </ChoiceOption>
          ))}
        </ChoiceOptions>
      </ChoiceGroup>
    </Choice>
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
  children: ReactNode;
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

/** A card rather than a bare stack, because it is the one thing on the page
 * that can be touched and it should read that way against four steps of
 * pictures. */
const Choice = styled.View`
  gap: 22px;
  padding: 22px 20px;
  border-radius: 24px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.card};
`;

const ChoiceGroup = styled.View`
  gap: 12px;
`;

const ChoiceLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
`;

const ChoiceOptions = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

/** The settings screen's pill, a size up: here it is the step's only action
 * rather than one row of a long list. */
const ChoiceOption = styled.Pressable<{ $selected: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 7px;
  padding: 11px 14px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.accent : theme.colors.borderSubtle};
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.accent : 'transparent'};
`;

const ChoiceFlag = styled.Text`
  font-size: 15px;
`;

const ChoiceOptionText = styled.Text<{ $selected: boolean }>`
  color: ${({ theme, $selected }) =>
    $selected ? '#ffffff' : theme.colors.text};
  font-size: 14px;
  font-weight: 600;
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

/** Smaller and quieter than the sentence above it: it is a caveat, not part
 * of the promise. */
const Note = styled.Text`
  max-width: 300px;
  margin-top: 10px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  line-height: 16px;
  text-align: center;
  opacity: 0.85;
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

/** Dimmed rather than hidden while the languages are unanswered: the way on
 * stays where it will be, and what is missing is the choice above it. */
const Advance = styled.Pressable<{ $available: boolean }>`
  align-items: center;
  justify-content: center;
  padding: 15px 18px;
  border-radius: 16px;
  opacity: ${({ $available }) => ($available ? 1 : 0.4)};
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

const EmailButton = styled.Pressable`
  align-items: center;
  justify-content: center;
  padding: 13px 18px;
  border-radius: 16px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.card};
`;

const EmailText = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
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

const appleButtonStyles = StyleSheet.create({
  button: { width: '100%', height: 50 },
});
