import { useCallback, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

import type { PronunciationPlayer } from '../../application/ports/PronunciationPlayer';
import type { VocabularyRepository } from '../../application/ports/VocabularyRepository';
import {
  languageFlags,
  type LearningLanguageSettings,
} from '../../domain/LearningLanguage';
import {
  buildRound,
  MIN_QUIZ_LABELS,
  recordAnswer,
  type QuizScore,
} from '../../domain/Quiz';
import type { LearningCopy } from '../localization/learningCopy';

interface QuizScreenProps {
  copy: LearningCopy;
  labels: readonly string[];
  languageSettings: LearningLanguageSettings;
  onClose: () => void;
  pronunciationPlayer: PronunciationPlayer;
  vocabularyRepository: VocabularyRepository;
}

const pickIndex = (upperBound: number) =>
  Math.floor(Math.random() * upperBound);

export function QuizScreen({
  copy,
  labels,
  languageSettings,
  onClose,
  pronunciationPlayer,
  vocabularyRepository,
}: QuizScreenProps) {
  const [round, setRound] = useState(() => buildRound(labels, pickIndex));
  const [askedIndex, setAskedIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState<QuizScore>({ answered: 0, correct: 0 });

  const question = round[askedIndex] ?? null;
  const isLastQuestion = askedIndex === round.length - 1;
  const isRoundOver = round.length > 0 && askedIndex >= round.length;

  const uniqueLabels = useMemo(
    () => new Set(labels.map(label => label.trim().toLowerCase())).size,
    [labels],
  );

  const answer = useMemo(
    () =>
      question == null
        ? null
        : vocabularyRepository.findByLabel(question.label, languageSettings),
    [languageSettings, question, vocabularyRepository],
  );

  const handleChoice = useCallback(
    (label: string) => {
      if (chosen != null || question == null) return;

      setChosen(label);
      setScore(current => recordAnswer(current, label === question.label));

      const vocabulary = vocabularyRepository.findByLabel(
        question.label,
        languageSettings,
      );
      pronunciationPlayer
        .speak(vocabulary.word, languageSettings.learningLanguage)
        .catch(() => undefined);
    },
    [
      chosen,
      languageSettings,
      pronunciationPlayer,
      question,
      vocabularyRepository,
    ],
  );

  const handleNext = useCallback(() => {
    setChosen(null);
    setAskedIndex(current => current + 1);
  }, []);

  const handleRestart = useCallback(() => {
    setChosen(null);
    setScore({ answered: 0, correct: 0 });
    setAskedIndex(0);
    setRound(buildRound(labels, pickIndex));
  }, [labels]);

  if (isRoundOver) {
    return (
      <Container>
        <QuizSafeArea edges={['top']}>
          <Header>
            <BackButton
              accessibilityLabel={copy.tabs.camera}
              accessibilityRole="button"
              onPress={onClose}
              testID="quiz-close"
            >
              <BackChevron>‹</BackChevron>
            </BackButton>
            <HeaderText>
              <Title accessibilityRole="header">{copy.quiz.title}</Title>
              <Subtitle>{copy.quiz.subtitle}</Subtitle>
            </HeaderText>
          </Header>

          <SummaryCard testID="quiz-summary">
            <SummaryMark>
              {score.correct === score.answered ? '🏆' : '🎯'}
            </SummaryMark>
            <SummaryTitle>{copy.quiz.roundOver}</SummaryTitle>
            <SummaryScore>
              {copy.quiz.roundScore(score.correct, score.answered)}
            </SummaryScore>
            <SummaryTrack>
              <SummaryFill
                $percentage={
                  score.answered === 0
                    ? 0
                    : (score.correct / score.answered) * 100
                }
              />
            </SummaryTrack>
          </SummaryCard>

          <NextButton
            accessibilityRole="button"
            onPress={handleRestart}
            testID="quiz-restart"
          >
            <NextText>{copy.quiz.again}</NextText>
          </NextButton>
        </QuizSafeArea>
      </Container>
    );
  }

  if (question == null || answer == null) {
    return (
      <Container>
        <QuizSafeArea edges={['top']}>
          <Header>
            <BackButton
              accessibilityLabel={copy.tabs.camera}
              accessibilityRole="button"
              onPress={onClose}
              testID="quiz-close"
            >
              <BackChevron>‹</BackChevron>
            </BackButton>
            <HeaderText>
              <Title accessibilityRole="header">{copy.quiz.title}</Title>
              <Subtitle>{copy.quiz.subtitle}</Subtitle>
            </HeaderText>
          </Header>

          <LockedCard testID="quiz-locked">
            <LockedMark>🔍</LockedMark>
            <LockedText>
              {copy.quiz.locked(Math.max(MIN_QUIZ_LABELS - uniqueLabels, 1))}
            </LockedText>
          </LockedCard>
        </QuizSafeArea>
      </Container>
    );
  }

  const isAnswered = chosen != null;

  return (
    <Container>
      <QuizSafeArea edges={['top']}>
        <Header>
          <BackButton
            accessibilityLabel={copy.tabs.camera}
            accessibilityRole="button"
            onPress={onClose}
            testID="quiz-close"
          >
            <BackChevron>‹</BackChevron>
          </BackButton>
          <HeaderText>
            <Title accessibilityRole="header">{copy.quiz.title}</Title>
            <Subtitle>{copy.quiz.subtitle}</Subtitle>
          </HeaderText>
          <ScorePill testID="quiz-progress">
            <ScoreText>
              {copy.quiz.progress(askedIndex + 1, round.length)}
            </ScoreText>
          </ScorePill>
        </Header>

        <PromptCard>
          <PromptLabel>{copy.quiz.prompt}</PromptLabel>
          <PromptDefinition>{answer.definition}</PromptDefinition>
          <PromptFooter>
            <PromptFlag>
              {languageFlags[languageSettings.learningLanguage]}
            </PromptFlag>
            <PromptHint numberOfLines={1}>
              {isAnswered ? answer.pronunciationHint : '· · ·'}
            </PromptHint>
          </PromptFooter>
        </PromptCard>

        <Choices>
          {question.choices.map(choice => {
            const vocabulary = vocabularyRepository.findByLabel(
              choice,
              languageSettings,
            );
            const isCorrect = choice === question.label;
            const isChosen = choice === chosen;

            return (
              <Choice
                accessibilityRole="button"
                accessibilityState={{ disabled: isAnswered }}
                key={choice}
                onPress={() => handleChoice(choice)}
                testID={`quiz-choice-${choice}`}
                $state={
                  !isAnswered
                    ? 'idle'
                    : isCorrect
                    ? 'correct'
                    : isChosen
                    ? 'wrong'
                    : 'muted'
                }
              >
                <ChoiceText
                  numberOfLines={1}
                  $state={
                    !isAnswered
                      ? 'idle'
                      : isCorrect
                      ? 'correct'
                      : isChosen
                      ? 'wrong'
                      : 'muted'
                  }
                >
                  {vocabulary.word}
                </ChoiceText>
                {isAnswered && (isCorrect || isChosen) ? (
                  <ChoiceMark>{isCorrect ? '✓' : '✕'}</ChoiceMark>
                ) : null}
              </Choice>
            );
          })}
        </Choices>

        {isAnswered ? (
          <Verdict testID="quiz-verdict">
            <VerdictMark $correct={chosen === question.label}>
              {chosen === question.label ? '✓' : '✕'}
            </VerdictMark>
            <VerdictText $correct={chosen === question.label}>
              {chosen === question.label
                ? copy.quiz.correct
                : copy.quiz.wrong(answer.word)}
            </VerdictText>
          </Verdict>
        ) : null}

        {isAnswered ? (
          <NextButton
            accessibilityRole="button"
            onPress={handleNext}
            testID="quiz-next"
          >
            <NextText>
              {isLastQuestion ? copy.quiz.finish : copy.quiz.next}
            </NextText>
          </NextButton>
        ) : null}
      </QuizSafeArea>
    </Container>
  );
}

const SummaryCard = styled.View`
  align-items: center;
  padding: 28px 22px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: 22px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const SummaryMark = styled.Text`
  font-size: 34px;
  line-height: 40px;
`;

const SummaryTitle = styled.Text`
  margin-top: 10px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 20px;
  line-height: 26px;
  font-weight: 800;
`;

const SummaryScore = styled.Text`
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
  line-height: 20px;
  text-align: center;
`;

const SummaryTrack = styled.View`
  align-self: stretch;
  height: 6px;
  margin-top: 18px;
  border-radius: 3px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const SummaryFill = styled.View<{ $percentage: number }>`
  width: ${({ $percentage }) => `${Math.max($percentage, 2)}%`};
  height: 6px;
  background-color: ${({ theme }) => theme.colors.success};
`;

type ChoiceState = 'idle' | 'correct' | 'wrong' | 'muted';

const CORRECT = '#2FAE6B';
const WRONG = '#EF4444';

const Container = styled.View`
  position: absolute;
  inset: 0px;
  background-color: ${({ theme }) => theme.colors.background};
`;

const QuizSafeArea = styled(SafeAreaView)`
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

const ScorePill = styled.View`
  padding: 6px 12px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.cardElevated};
`;

const ScoreText = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: 12px;
  font-weight: 800;
`;

const PromptCard = styled.View`
  padding: 22px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: 22px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const PromptLabel = styled.Text`
  color: ${({ theme }) => theme.colors.accent};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.2px;
  text-transform: uppercase;
`;

const PromptDefinition = styled.Text`
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 22px;
  line-height: 30px;
  font-weight: 600;
`;

const PromptFooter = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  padding-top: 14px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const PromptFlag = styled.Text`
  font-size: 16px;
  line-height: 20px;
`;

const PromptHint = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
  line-height: 18px;
  letter-spacing: 1px;
`;

const Choices = styled.View`
  gap: 10px;
  margin-top: 20px;
`;

const Choice = styled.Pressable<{ $state: ChoiceState }>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  padding: 14px 18px;
  border: 1.5px solid
    ${({ theme, $state }) =>
      $state === 'correct'
        ? CORRECT
        : $state === 'wrong'
        ? WRONG
        : theme.colors.borderSubtle};
  border-radius: 16px;
  background-color: ${({ theme, $state }) =>
    $state === 'correct'
      ? 'rgba(47, 174, 107, 0.14)'
      : $state === 'wrong'
      ? 'rgba(239, 68, 68, 0.12)'
      : theme.colors.card};
  opacity: ${({ $state }) => ($state === 'muted' ? 0.45 : 1)};
`;

const ChoiceText = styled.Text<{ $state: ChoiceState }>`
  flex: 1;
  min-width: 0px;
  color: ${({ theme, $state }) =>
    $state === 'correct'
      ? '#2FAE6B'
      : $state === 'wrong'
      ? '#EF4444'
      : theme.colors.text};
  font-size: 17px;
  line-height: 24px;
  font-weight: 700;
`;

const ChoiceMark = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 900;
`;

const Verdict = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  padding: 12px 16px;
  border-radius: 14px;
  background-color: ${({ theme }) => theme.colors.cardElevated};
`;

const VerdictMark = styled.Text<{ $correct: boolean }>`
  color: ${({ $correct }) => ($correct ? CORRECT : WRONG)};
  font-size: 16px;
  font-weight: 900;
`;

const VerdictText = styled.Text<{ $correct: boolean }>`
  flex: 1;
  min-width: 0px;
  color: ${({ $correct }) => ($correct ? CORRECT : WRONG)};
  font-size: 15px;
  font-weight: 700;
`;

/** Anchored at the bottom so the thumb reaches it without crossing the card. */
const NextButton = styled.Pressable`
  align-items: center;
  margin-top: auto;
  padding: 18px 24px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const NextText = styled.Text`
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.3px;
`;

const LockedCard = styled.View`
  align-items: center;
  gap: 12px;
  padding: 32px 24px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: 22px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const LockedMark = styled.Text`
  font-size: 32px;
  line-height: 38px;
`;

const LockedText = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
  line-height: 20px;
  text-align: center;
`;
