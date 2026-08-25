import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

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
              ? copy.speak.listening
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
          <MicGlyph>{status === 'listening' ? '■' : '●'}</MicGlyph>
          <MicLabel>
            {status === 'result' ? copy.speak.again : copy.speak.title}
          </MicLabel>
        </MicButton>
      </SpeakSafeArea>
    </Container>
  );
}

const MATCHED = '#2FAE6B';
const MISSED = '#EF4444';

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
  border: 1px solid ${({ $matched }) => ($matched ? MATCHED : MISSED)};
  border-radius: 16px;
  background-color: ${({ $matched }) =>
    $matched ? 'rgba(47, 174, 107, 0.12)' : 'rgba(239, 68, 68, 0.10)'};
`;

const FeedbackTitle = styled.Text<{ $matched: boolean }>`
  color: ${({ $matched }) => ($matched ? MATCHED : MISSED)};
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
  background-color: ${({ $matched }) => ($matched ? MATCHED : MISSED)};
`;

const MicButton = styled.Pressable<{ $listening: boolean }>`
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding: 20px;
  border-radius: 999px;
  background-color: ${({ theme, $listening }) =>
    $listening ? MISSED : theme.colors.accent};
`;

const MicGlyph = styled.Text`
  color: #ffffff;
  font-size: 18px;
  line-height: 22px;
`;

const MicLabel = styled.Text`
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
`;
