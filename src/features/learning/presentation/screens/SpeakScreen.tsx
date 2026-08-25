import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import styled, { useTheme } from 'styled-components/native';

import type { PronunciationPlayer } from '../../application/ports/PronunciationPlayer';
import type { SpeechRecognizer } from '../../application/ports/SpeechRecognizer';
import type { VocabularyRepository } from '../../application/ports/VocabularyRepository';
import {
  languageFlags,
  type LearningLanguageSettings,
} from '../../domain/LearningLanguage';
import {
  scoreAttempt,
  type PronunciationAttempt,
} from '../../domain/PronunciationAttempt';
import type { LearningCopy } from '../localization/learningCopy';

interface SpeakScreenProps {
  copy: LearningCopy;
  label: string;
  languageSettings: LearningLanguageSettings;
  onAttempt: (label: string, matched: boolean) => void;
  onClose: () => void;
  pronunciationPlayer: PronunciationPlayer;
  speechRecognizer: SpeechRecognizer;
  vocabularyRepository: VocabularyRepository;
}

type Status = 'idle' | 'listening' | 'result' | 'blocked';

/** How long a spoken word is expected to take. The recogniser stops on its own
 * when the learner goes quiet, so this only paces the countdown on screen. */
const LISTEN_SECONDS = 5;
const RING_RADIUS = 24;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

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

/** Ring that empties as the listening window runs out, so the learner can see
 * how much time is left without reading a label. */
function CountdownRing({ secondsLeft }: { secondsLeft: number }) {
  const progress = Math.max(Math.min(secondsLeft / LISTEN_SECONDS, 1), 0);

  return (
    <RingWrapper>
      <Svg height={58} viewBox="0 0 58 58" width={58}>
        <Circle
          cx={29}
          cy={29}
          fill="none"
          r={RING_RADIUS}
          stroke="rgba(255, 255, 255, 0.28)"
          strokeWidth={4}
        />
        <Circle
          cx={29}
          cy={29}
          fill="none"
          origin="29, 29"
          r={RING_RADIUS}
          rotation={-90}
          stroke="#ffffff"
          strokeDasharray={`${RING_LENGTH}`}
          strokeDashoffset={RING_LENGTH * (1 - progress)}
          strokeLinecap="round"
          strokeWidth={4}
        />
      </Svg>
      <RingValue>{secondsLeft > 0 ? secondsLeft : '…'}</RingValue>
    </RingWrapper>
  );
}

export function SpeakScreen({
  copy,
  label,
  languageSettings,
  onAttempt,
  onClose,
  pronunciationPlayer,
  speechRecognizer,
  vocabularyRepository,
}: SpeakScreenProps) {
  const vocabulary = vocabularyRepository.findByLabel(label, languageSettings);
  const [status, setStatus] = useState<Status>('idle');
  const [attempt, setAttempt] = useState<PronunciationAttempt | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(LISTEN_SECONDS);
  const theme = useTheme();

  useEffect(() => {
    if (status !== 'listening') return;

    setSecondsLeft(LISTEN_SECONDS);
    const startedAtMs = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
      setSecondsLeft(Math.max(LISTEN_SECONDS - elapsed, 0));
    }, 250);

    return () => clearInterval(timer);
  }, [status]);

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
    if (status === 'listening') return;

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
  const percentage = Math.round((attempt?.score ?? 0) * 100);

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
          <HeaderText>
            <Title accessibilityRole="header">{copy.speak.title}</Title>
            <Subtitle>{copy.speak.subtitle}</Subtitle>
          </HeaderText>
        </Header>

        <WordCard>
          <WordFlag>
            {languageFlags[languageSettings.learningLanguage]}
          </WordFlag>
          <Word numberOfLines={1}>{vocabulary.word}</Word>
          <Hint>{vocabulary.pronunciationHint}</Hint>
          <Ipa>{vocabulary.pronunciation}</Ipa>
          <HearButton
            accessibilityRole="button"
            onPress={handleHear}
            testID="speak-hear"
          >
            <SpeakerIcon color={theme.colors.accent} />
            <HearText>{copy.speak.listen}</HearText>
          </HearButton>
        </WordCard>

        {status === 'result' && attempt != null ? (
          <Feedback testID="speak-feedback" $matched={attempt.matched}>
            <FeedbackTitle $matched={attempt.matched}>
              {attempt.matched
                ? copy.speak.matched
                : heardBest.length === 0
                ? copy.speak.silence
                : copy.speak.close(percentage)}
            </FeedbackTitle>
            {!attempt.matched && heardBest.length > 0 ? (
              <FeedbackDetail>{copy.speak.missed(heardBest)}</FeedbackDetail>
            ) : null}
            <ScoreTrack>
              <ScoreFill $matched={attempt.matched} $percentage={percentage} />
            </ScoreTrack>
          </Feedback>
        ) : (
          <Status testID="speak-status">
            {status === 'blocked'
              ? blockedMessage
              : status === 'listening'
              ? secondsLeft > 0
                ? copy.speak.countdown(secondsLeft)
                : copy.speak.listening
              : copy.speak.idle}
          </Status>
        )}

        <MicButton
          accessibilityLabel={copy.speak.title}
          accessibilityRole="button"
          accessibilityState={{ disabled: status === 'blocked' }}
          onPress={handleListen}
          testID="speak-listen"
          $listening={status === 'listening'}
        >
          {status === 'listening' ? (
            <CountdownRing secondsLeft={secondsLeft} />
          ) : (
            <MicBadge>
              <MicIcon color="#ffffff" />
            </MicBadge>
          )}
          <MicLabel>
            {status === 'listening'
              ? copy.speak.listening
              : status === 'result'
              ? copy.speak.again
              : copy.speak.title}
          </MicLabel>
        </MicButton>
      </SpeakSafeArea>
    </Container>
  );
}

const Container = styled.View`
  position: absolute;
  inset: 0px;
  background-color: ${({ theme }) => theme.colors.background};
`;

const SpeakSafeArea = styled(SafeAreaView)`
  flex: 1;
  padding: 0px 20px 20px;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
  padding: 2px 2px 20px;
`;

const HeaderText = styled.View`
  flex: 1;
  min-width: 0px;
`;

const BackButton = styled.Pressable`
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: 17px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const BackChevron = styled.Text`
  margin-top: -3px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 24px;
  line-height: 26px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 24px;
  line-height: 30px;
  font-weight: 700;
`;

const Subtitle = styled.Text`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
  line-height: 18px;
`;

const WordCard = styled.View`
  align-items: center;
  padding: 28px 22px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: 22px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const WordFlag = styled.Text`
  font-size: 22px;
  line-height: 26px;
`;

const Word = styled.Text`
  margin-top: 10px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 34px;
  line-height: 42px;
  font-weight: 800;
`;

const Hint = styled.Text`
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

const Ipa = styled.Text`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
`;

const HearButton = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  padding: 10px 18px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: 999px;
`;

const HearText = styled.Text`
  color: ${({ theme }) => theme.colors.accent};
  font-size: 13px;
  font-weight: 800;
`;

const Status = styled.Text`
  margin-top: 22px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
  line-height: 20px;
  text-align: center;
`;

const Feedback = styled.View<{ $matched: boolean }>`
  margin-top: 22px;
  padding: 16px 18px;
  border: 1px solid
    ${({ theme, $matched }) =>
      $matched ? theme.colors.success : theme.colors.danger};
  border-radius: 16px;
  background-color: ${({ $matched }) =>
    $matched ? 'rgba(47, 174, 107, 0.12)' : 'rgba(239, 68, 68, 0.10)'};
`;

const FeedbackTitle = styled.Text<{ $matched: boolean }>`
  color: ${({ theme, $matched }) =>
    $matched ? theme.colors.success : theme.colors.danger};
  font-size: 16px;
  font-weight: 800;
`;

const FeedbackDetail = styled.Text`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
  line-height: 18px;
`;

const ScoreTrack = styled.View`
  height: 6px;
  margin-top: 14px;
  border-radius: 3px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const ScoreFill = styled.View<{ $matched: boolean; $percentage: number }>`
  width: ${({ $percentage }) => `${Math.max($percentage, 2)}%`};
  height: 6px;
  background-color: ${({ theme, $matched }) =>
    $matched ? theme.colors.success : theme.colors.danger};
`;

/** The one action of this screen, so it is the loudest thing on it. */
const MicButton = styled.Pressable<{ $listening: boolean }>`
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding: 20px;
  border-radius: 28px;
  background-color: ${({ theme, $listening }) =>
    $listening ? theme.colors.danger : theme.colors.accent};
  elevation: 8;
`;

const MicBadge = styled.View`
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 29px;
  background-color: rgba(255, 255, 255, 0.18);
`;

const RingWrapper = styled.View`
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
`;

const RingValue = styled.Text`
  position: absolute;
  color: #ffffff;
  font-size: 20px;
  line-height: 24px;
  font-weight: 800;
`;

const MicLabel = styled.Text`
  color: #ffffff;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.3px;
`;
