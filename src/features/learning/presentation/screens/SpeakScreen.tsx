import { useCallback, useEffect, useState } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import styled, { useTheme } from 'styled-components/native';

import type { PronunciationPlayer } from '../../application/ports/PronunciationPlayer';
import type { SpeechRecognizer } from '../../application/ports/SpeechRecognizer';
import type { VocabularyRepository } from '../../application/ports/VocabularyRepository';
import type { LearningLanguageSettings } from '../../domain/LearningLanguage';
import {
  isResting,
  type PronunciationProgressEntry,
} from '../../domain/PronunciationProgress';
import {
  describeDivergence,
  scoreAttempt,
  type PronunciationAttempt,
} from '../../domain/PronunciationAttempt';
import type { LearningCopy } from '../localization/learningCopy';
import { PronunciationCelebration } from '../views/PronunciationCelebration';

interface SpeakScreenProps {
  copy: LearningCopy;
  label: string;
  languageSettings: LearningLanguageSettings;
  onAttempt: (label: string, matched: boolean) => void;
  onClose: () => void;
  onOpenHistory: () => void;
  onReturnToCamera: () => void;
  pronunciationProgress: readonly PronunciationProgressEntry[];
  pronunciationPlayer: PronunciationPlayer;
  speechRecognizer: SpeechRecognizer;
  vocabularyRepository: VocabularyRepository;
}

type Status = 'idle' | 'listening' | 'result' | 'blocked';

/** How long a spoken word is expected to take. The recogniser stops on its own
 * when the learner goes quiet, so this only paces the countdown on screen. */
const LISTEN_SECONDS = 5;
/** How long the celebration stays before the camera comes back on its own.
 * Long enough to read it, short enough that a learner on a roll is not kept
 * waiting for the next object. */
const CELEBRATION_SECONDS = 5;
/**
 * Where each bar sits in the wave while the microphone is open, and how tall
 * it rests once it closes.
 *
 * These are ornament, not measurement: the recogniser reports words, not
 * levels, so a real waveform is not something this app can draw. What the bars
 * say is true — the microphone is open, and then it was — and that is the
 * doubt they exist to answer.
 */
const LISTENING_BARS = [
  { phase: 0, weight: 0.42, rest: 10 },
  { phase: 0.16, weight: 0.68, rest: 21 },
  { phase: 0.32, weight: 0.94, rest: 30 },
  { phase: 0.48, weight: 0.6, rest: 18 },
  { phase: 0.64, weight: 1, rest: 33 },
  { phase: 0.8, weight: 0.5, rest: 14 },
  { phase: 0.96, weight: 0.82, rest: 25 },
  { phase: 1.12, weight: 1, rest: 34 },
  { phase: 1.28, weight: 0.64, rest: 20 },
  { phase: 1.44, weight: 0.46, rest: 12 },
  { phase: 1.6, weight: 0.76, rest: 23 },
  { phase: 1.76, weight: 0.38, rest: 8 },
];
/** How often the level is read while the microphone is open. */
const LEVEL_POLL_MS = 80;

function MicIcon({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M12 3.5A2.75 2.75 0 0 1 14.75 6.25v4.5a2.75 2.75 0 0 1-5.5 0v-4.5A2.75 2.75 0 0 1 12 3.5Z"
        fill={color}
      />
      <Path
        d="M6 10.75a6 6 0 0 0 12 0M12 16.75V20.5M8.5 20.5h7"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.9}
      />
    </Svg>
  );
}

function CameraIcon({ color }: { color: string }) {
  return (
    <Svg height={20} viewBox="0 0 24 24" width={20}>
      <Path
        d="M4 8.5h3l1.4-2h7.2l1.4 2H20a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"
        fill="none"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth={1.7}
      />
      <Path
        d="M12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        fill="none"
        stroke={color}
        strokeWidth={1.7}
      />
    </Svg>
  );
}

function SpeakerIcon({ color }: { color: string }) {
  return (
    <Svg height={16} viewBox="0 0 24 24" width={16}>
      <Path d="M4 9v6h4l5 4V5L8 9H4Z" fill={color} />
      <Path
        d="M16 8.2a5 5 0 0 1 0 7.6M18.7 5.5a9 9 0 0 1 0 13"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

/**
 * The microphone, which breathes while it is open.
 *
 * The movement is not driven by how loud the room is — the recogniser reports
 * words, not levels — so it says only what is true: this is on, and tapping it
 * again ends the recording.
 */
function ListeningMic({
  accessibilityLabel,
  disabled = false,
  listening,
  onPress,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  listening: boolean;
  onPress: () => void;
}) {
  const beat = useSharedValue(0);

  useEffect(() => {
    if (!listening) {
      beat.value = withTiming(0, { duration: 200 });
      return;
    }

    beat.value = withRepeat(
      withTiming(1, { duration: 760, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [beat, listening]);

  const buttonStyle = useAnimatedStyle(() => ({
    // A resting word dims its microphone rather than hiding it: the learner
    // should see that the word is still there, and why it cannot be tried.
    opacity: disabled ? 0.4 : 1,
    transform: [{ scale: 1 + beat.value * 0.07 }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * beat.value,
    transform: [{ scale: 1 + beat.value * 0.5 }],
  }));

  return (
    <MicSlot>
      <MicHalo pointerEvents="none" style={haloStyle} $listening={listening} />
      <MicButton
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        onPress={disabled ? undefined : onPress}
        style={buttonStyle}
        testID="speak-listen"
        $listening={listening}
      >
        <MicIcon color="#ffffff" />
      </MicButton>
    </MicSlot>
  );
}

/**
 * The level meter, driven by how loud the microphone actually is.
 *
 * The level is measured where the audio is: the root mean square of each
 * buffer on iOS, and Android's own reading of the same thing. The interface
 * reads it a dozen times a second, which is often enough to look alive and
 * rare enough to cost nothing.
 */
function ListeningBars({
  level,
  listening,
}: {
  level: { value: number };
  listening: boolean;
}) {
  return (
    <Bars pointerEvents="none">
      {LISTENING_BARS.map(bar => (
        <Bar
          key={bar.phase}
          level={level}
          listening={listening}
          resting={bar.rest}
          weight={bar.weight}
        />
      ))}
    </Bars>
  );
}

function Bar({
  level,
  listening,
  resting,
  weight,
}: {
  level: { value: number };
  listening: boolean;
  resting: number;
  weight: number;
}) {
  const style = useAnimatedStyle(() => {
    // Once the microphone closes the bars hold the shape they had, which reads
    // as a trace of what was said rather than a meter stuck at zero.
    if (!listening) return { height: resting };

    // Each bar answers to the same level with its own weight, so the row moves
    // as one voice instead of a block.
    return { height: 6 + level.value * 30 * weight };
  });

  return <BarShape style={style} />;
}

/** One task, one object: the word takes the middle of the screen and
 * everything else sits under it. */
export function SpeakScreen({
  copy,
  label,
  languageSettings,
  onAttempt,
  onClose,
  onOpenHistory,
  onReturnToCamera,
  pronunciationProgress,
  pronunciationPlayer,
  speechRecognizer,
  vocabularyRepository,
}: SpeakScreenProps) {
  const vocabulary = vocabularyRepository.findByLabel(label, languageSettings);
  const [status, setStatus] = useState<Status>('idle');
  const [attempt, setAttempt] = useState<PronunciationAttempt | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(LISTEN_SECONDS);
  const [returningIn, setReturningIn] = useState<number | null>(null);
  /** How loud the microphone is, read from the recogniser while it is open. */
  const level = useSharedValue(0);
  const theme = useTheme();
  const isCelebrating = status === 'result' && attempt?.matched === true;
  // Three misses in a row and the word is set aside until tomorrow. Repeating
  // it now is what does not work; every other word is still there.
  const resting = isResting(pronunciationProgress, label, Date.now());

  useEffect(() => {
    if (status !== 'listening') return;

    const meter = setInterval(() => {
      speechRecognizer
        .level()
        .then(value => {
          // Rising fast and falling slowly is what makes a meter readable: a
          // syllable should show, and the gap after it should not blink.
          level.value = withTiming(value, {
            duration: value > level.value ? 90 : 220,
          });
        })
        .catch(() => undefined);
    }, LEVEL_POLL_MS);

    setSecondsLeft(LISTEN_SECONDS);
    const startedAtMs = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
      setSecondsLeft(Math.max(LISTEN_SECONDS - elapsed, 0));
    }, 250);

    return () => {
      clearInterval(timer);
      clearInterval(meter);
      level.value = withTiming(0, { duration: 220 });
    };
  }, [level, speechRecognizer, status]);

  /** A correct word earns its moment, and then the camera comes back on its
   * own. Trying again, or leaving by either button, stops the countdown. */
  useEffect(() => {
    if (!isCelebrating) {
      setReturningIn(null);
      return;
    }

    setReturningIn(CELEBRATION_SECONDS);
    const startedAtMs = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
      const left = Math.max(CELEBRATION_SECONDS - elapsed, 0);
      setReturningIn(left);
      if (left === 0) {
        clearInterval(timer);
        onReturnToCamera();
      }
    }, 250);

    return () => clearInterval(timer);
  }, [isCelebrating, onReturnToCamera]);

  useEffect(() => {
    let isCurrent = true;

    speechRecognizer
      .isAvailable()
      .then(available => {
        if (isCurrent && !available) {
          setStatus('blocked');
          setBlockedMessage(copy.speak.unavailable);
        }
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
      speechRecognizer.cancel().catch(() => undefined);
    };
  }, [copy.speak.unavailable, speechRecognizer]);

  const handleListen = useCallback(async () => {
    if (resting) return;

    if (status === 'listening') {
      // The learner has finished the word. Waiting out a silence timer after
      // that is time spent for nothing.
      speechRecognizer.stop().catch(() => undefined);
      return;
    }

    setAttempt(null);

    if (!(await speechRecognizer.hasPermission())) {
      setStatus('blocked');
      setBlockedMessage(copy.speak.permission);
      return;
    }

    setStatus('listening');

    try {
      const heard = await speechRecognizer.listen(
        languageSettings.learningLanguage,
      );
      const scored = scoreAttempt(vocabulary.word, heard);
      setAttempt(scored);
      setStatus('result');

      // Only a real attempt counts. Hearing nothing says nothing about the
      // pronunciation, so it is never recorded as a miss.
      if (heard.length > 0) onAttempt(label, scored.matched);
    } catch (error) {
      // A missing language pack is a dead end, not a bad attempt: retrying
      // would fail identically, so it is reported instead of scored.
      if ((error as { code?: string })?.code === 'E_SPEECH_LANGUAGE') {
        setStatus('blocked');
        setBlockedMessage(copy.speak.languageUnavailable);
        return;
      }

      // Silence and a failed recognition land in the same place: nothing was
      // scored, so the learner is simply asked to try again.
      setAttempt(scoreAttempt(vocabulary.word, []));
      setStatus('result');
    }
  }, [
    copy.speak.languageUnavailable,
    copy.speak.permission,
    label,
    languageSettings.learningLanguage,
    onAttempt,
    resting,
    speechRecognizer,
    status,
    vocabulary.word,
  ]);

  const handleHear = useCallback(() => {
    pronunciationPlayer
      .speak(vocabulary.word, languageSettings.learningLanguage)
      .catch(() => undefined);
  }, [languageSettings.learningLanguage, pronunciationPlayer, vocabulary.word]);

  const heardBest = attempt?.heard[0] ?? '';
  // Where the spoken word parted from the written one. A percentage says how
  // wrong the attempt was; this says which part to say again.
  const divergence =
    heardBest.length > 0
      ? describeDivergence(vocabulary.word, heardBest)
      : null;

  return (
    <Container>
      <SpeakSafeArea edges={['top']}>
        <Header>
          <BackButton
            accessibilityLabel={copy.tabs.camera}
            accessibilityRole="button"
            onPress={onClose}
            testID="speak-close"
          >
            <BackChevron>‹</BackChevron>
          </BackButton>
        </Header>

        {isCelebrating ? (
          <PronunciationCelebration
            cameraLabel={copy.speak.backToCamera}
            detail={copy.speak.celebrationDetail(vocabulary.word)}
            historyLabel={copy.speak.seeInHistory}
            onOpenHistory={onOpenHistory}
            onReturnToCamera={onReturnToCamera}
            returningLabel={copy.speak.returningIn(
              returningIn ?? CELEBRATION_SECONDS,
            )}
            title={copy.speak.celebration}
            word={vocabulary.word}
          />
        ) : (
          <>
            <Stage>
              <Word numberOfLines={1}>
                {divergence == null ? (
                  vocabulary.word
                ) : (
                  <>
                    {divergence.expected.before}
                    <WordMissed>{divergence.expected.wrong}</WordMissed>
                    {divergence.expected.after}
                  </>
                )}
              </Word>
              <Ipa>{vocabulary.pronunciation}</Ipa>
              {vocabulary.pronunciationHint.length > 0 ? (
                <SyllableChip>
                  <SyllableText>{vocabulary.pronunciationHint}</SyllableText>
                </SyllableChip>
              ) : null}
              <Meaning numberOfLines={1}>{vocabulary.meaning}</Meaning>
              {/* The sentence is what turns a word into something a learner
                  can use, and an empty middle into a page worth reading. */}
              <Example numberOfLines={3}>{vocabulary.example}</Example>

              {status === 'result' && heardBest.length > 0 ? (
                <HeardBox testID="speak-heard">
                  <HeardLabel>{copy.speak.heardLabel}</HeardLabel>
                  <HeardWord numberOfLines={1}>
                    {divergence == null ? (
                      heardBest
                    ) : (
                      <>
                        {divergence.heard.before}
                        <WordMissed>{divergence.heard.wrong}</WordMissed>
                        {divergence.heard.after}
                      </>
                    )}
                  </HeardWord>
                  {/* The guide is the catalogue's own hint, not a phrase made
                      up for the occasion. */}
                  <HeardGuide>
                    {copy.speak.guide(vocabulary.pronunciationHint)}
                  </HeardGuide>
                </HeardBox>
              ) : null}

              {status === 'listening' || status === 'result' ? (
                <ListeningBars
                  level={level}
                  listening={status === 'listening'}
                />
              ) : null}
            </Stage>

            <Status testID="speak-status">
              {resting
                ? copy.speak.restingUntil
                : status === 'blocked'
                ? blockedMessage
                : status === 'listening'
                ? secondsLeft > 0
                  ? copy.speak.countdown(secondsLeft)
                  : copy.speak.listening
                : status === 'result' && heardBest.length === 0
                ? copy.speak.silence
                : copy.speak.idle}
            </Status>

            <Actions>
              <GhostButton
                accessibilityLabel={copy.speak.listen}
                accessibilityRole="button"
                onPress={handleHear}
                testID="speak-hear"
              >
                <SpeakerIcon color={theme.colors.text} />
              </GhostButton>

              <ListeningMic
                accessibilityLabel={
                  status === 'listening' ? copy.speak.stop : copy.speak.title
                }
                disabled={resting}
                listening={status === 'listening'}
                onPress={handleListen}
              />

              <GhostButton
                accessibilityLabel={copy.speak.backToCamera}
                accessibilityRole="button"
                onPress={onReturnToCamera}
                testID="speak-back-to-camera"
              >
                <CameraIcon color={theme.colors.text} />
              </GhostButton>
            </Actions>
          </>
        )}
      </SpeakSafeArea>
    </Container>
  );
}

const Stage = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0px 8px;
`;

const Word = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 46px;
  line-height: 54px;
  font-weight: 800;
  letter-spacing: -1px;
  text-align: center;
`;

/** The stretch that came out differently, in the word and in what was heard,
 * marked in the same colour so the eye pairs them. */
const WordMissed = styled.Text`
  color: ${({ theme }) => theme.colors.danger};
`;

const Bars = styled.View`
  flex-direction: row;
  align-items: flex-end;
  gap: 3px;
  height: 34px;
  margin-top: 26px;
`;

const BarShape = styled(Animated.View)`
  width: 3px;
  border-radius: 2px;
  opacity: 0.85;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const Ipa = styled.Text`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
  letter-spacing: 0.4px;
`;

/** The syllables spelled the way they sound, which is the guide a learner
 * repeats from. */
const SyllableChip = styled.View`
  margin-top: 14px;
  padding: 7px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const SyllableText = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1.4px;
`;

const Example = styled.Text`
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
  line-height: 21px;
  font-style: italic;
  text-align: center;
`;

const Meaning = styled.Text`
  margin-top: 10px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
`;

const HeardBox = styled.View`
  align-self: stretch;
  margin-top: 26px;
  padding: 12px 16px;
  align-items: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
`;

const HeardLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
`;

const HeardWord = styled.Text`
  margin-top: 3px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 17px;
  font-weight: 700;
`;

const HeardGuide = styled.Text`
  margin-top: 7px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  line-height: 17px;
  text-align: center;
`;

const Container = styled.View`
  position: absolute;
  inset: 0px;
  background-color: ${({ theme }) => theme.colors.background};
`;

const SpeakSafeArea = styled(SafeAreaView)`
  flex: 1;
  padding: 0px 20px;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 2px 0px 0px;
`;

const BackButton = styled.Pressable`
  width: 34px;
  height: 34px;
  margin-left: -6px;
  align-items: center;
  justify-content: center;
`;

const BackChevron = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 30px;
  line-height: 34px;
`;

const Actions = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding-bottom: 26px;
`;

/** Icon only. Beside a filled microphone, two labelled pills read as three
 * choices; two quiet circles read as one choice with its two neighbours. */
const GhostButton = styled.Pressable`
  width: 52px;
  height: 52px;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 26px;
`;

const Status = styled.Text`
  margin-bottom: 18px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
  text-align: center;
`;

/** A round microphone, the size of a thumb, and the only filled thing on the
 * screen. It turns red while it is open, which is the one state worth
 * signalling in colour. */
const MicSlot = styled.View`
  align-items: center;
  justify-content: center;
`;

const MicHalo = styled(Animated.View)<{ $listening: boolean }>`
  position: absolute;
  width: 74px;
  height: 74px;
  border-radius: 37px;
  background-color: ${({ theme, $listening }) =>
    $listening ? theme.colors.danger : theme.colors.accent};
`;

const MicButton = styled(Animated.createAnimatedComponent(styled.Pressable``))<{
  $listening: boolean;
}>`
  width: 74px;
  height: 74px;
  align-items: center;
  justify-content: center;
  border-radius: 37px;
  background-color: ${({ theme, $listening }) =>
    $listening ? theme.colors.danger : theme.colors.accent};
  elevation: 10;
  shadow-color: ${({ theme }) => theme.colors.accent};
  shadow-opacity: 0.4;
  shadow-radius: 14px;
  shadow-offset: 0px 6px;
`;
