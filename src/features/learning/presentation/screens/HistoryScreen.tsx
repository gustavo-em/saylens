import { useEffect, useMemo, useState } from 'react';
import { TextInput } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import styled, { useTheme } from 'styled-components/native';

import type { PronunciationPlayer } from '../../application/ports/PronunciationPlayer';
import type { VocabularyRepository } from '../../application/ports/VocabularyRepository';
import { isFavorite, type FavoriteWord } from '../../domain/FavoriteWord';
import type { LearningLanguageSettings } from '../../domain/LearningLanguage';
import {
  getPronunciationStatus,
  matchesPronunciationFilter,
  pronunciationFilters,
  type PronunciationFilter,
  type PronunciationProgressEntry,
  type PronunciationStatus,
} from '../../domain/PronunciationProgress';
import { getExperience, getLevelProgress } from '../../domain/LearnerProgress';
import { isResting } from '../../domain/PronunciationProgress';
import { getWordsToReview } from '../../domain/ReviewQueue';
import { getCountUpDurationMs } from '../animation/countUp';
import type { ViewedObject } from '../../domain/ViewedObject';
import type { LearningCopy } from '../localization/learningCopy';

interface HistoryScreenProps {
  copy: LearningCopy;
  languageSettings: LearningLanguageSettings;
  favorites: readonly FavoriteWord[];
  onClose: () => void;
  /** What the learner has built so far, shown at the top of their words. */
  foundLabels: readonly string[];
  matchedPronunciations: number;
  streakDays: number;
  onOpenCollection: () => void;
  /** Opens a round. The review band passes the words that are due, so the
   * round asks about those rather than about everything. */
  onOpenQuiz: (labels?: readonly string[]) => void;
  onPractiseSpeaking: (label: string) => void;
  onToggleFavorite: (label: string) => void;
  pronunciationPlayer: PronunciationPlayer;
  pronunciationProgress: readonly PronunciationProgressEntry[];
  viewedObjects: readonly ViewedObject[];
  vocabularyRepository: VocabularyRepository;
}

function MicIcon({ color }: { color: string }) {
  return (
    <Svg height={16} viewBox="0 0 24 24" width={16}>
      <Path
        d="M12 4.5a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-5 0V7A2.5 2.5 0 0 1 12 4.5Z"
        fill={color}
      />
      <Path
        d="M6.5 11a5.5 5.5 0 0 0 11 0M12 16.5V20"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function formatSeenAt(copy: LearningCopy, seenAtMs: number) {
  const elapsed = Math.max(Date.now() - seenAtMs, 0);

  if (elapsed < MINUTE_MS) return copy.history.justNow;
  if (elapsed < HOUR_MS) {
    return copy.history.minutesAgo(Math.floor(elapsed / MINUTE_MS));
  }
  if (elapsed < DAY_MS) {
    return copy.history.hoursAgo(Math.floor(elapsed / HOUR_MS));
  }

  return copy.history.daysAgo(Math.floor(elapsed / DAY_MS));
}

export function HistoryScreen({
  copy,
  languageSettings,
  favorites,
  onClose,
  foundLabels,
  matchedPronunciations,
  streakDays,
  onOpenCollection,
  onOpenQuiz,
  onPractiseSpeaking,
  onToggleFavorite,
  pronunciationPlayer,
  pronunciationProgress,
  viewedObjects,
  vocabularyRepository,
}: HistoryScreenProps) {
  const theme = useTheme();
  const [filter, setFilter] = useState<PronunciationFilter>('all');

  const filterLabels: Record<PronunciationFilter, string> = {
    all: copy.history.filterAll,
    matched: copy.history.filterMatched,
    untried: copy.history.filterUntried,
    missed: copy.history.filterMissed,
  };
  const statusLabels: Record<PronunciationStatus, string> = {
    matched: copy.history.statusMatched,
    untried: copy.history.statusUntried,
    missed: copy.history.statusMissed,
  };

  const entries = useMemo(
    () =>
      viewedObjects.map(entry => ({
        entry,
        status: getPronunciationStatus(pronunciationProgress, entry.label),
        resting: isResting(pronunciationProgress, entry.label, Date.now()),
      })),
    [pronunciationProgress, viewedObjects],
  );
  const counts = useMemo(
    () =>
      entries.reduce(
        (totals, { status }) => ({ ...totals, [status]: totals[status] + 1 }),
        { all: entries.length, matched: 0, untried: 0, missed: 0 } as Record<
          PronunciationFilter,
          number
        >,
      ),
    [entries],
  );
  const visibleEntries = entries.filter(({ status }) =>
    matchesPronunciationFilter(filter, status),
  );
  // What the list is for tomorrow, not only what it holds today.
  const due = getWordsToReview(
    viewedObjects,
    pronunciationProgress,
    Date.now(),
  );
  const level = getLevelProgress(
    getExperience(foundLabels.length, matchedPronunciations),
  );

  return (
    <Container>
      <HistorySafeArea edges={['top']}>
        <Header>
          <BackButton
            accessibilityLabel={copy.tabs.camera}
            accessibilityRole="button"
            onPress={onClose}
            testID="history-close"
          >
            <BackChevron>‹</BackChevron>
          </BackButton>
          <HeaderActions>
            <CollectionButton
              accessibilityLabel={copy.collection.title}
              accessibilityRole="button"
              onPress={onOpenCollection}
              testID="history-open-collection"
            >
              <CollectionMark>🏆</CollectionMark>
            </CollectionButton>
            <PractiseButton
              accessibilityRole="button"
              onPress={() => onOpenQuiz()}
              testID="history-open-quiz"
            >
              <PractiseText>{copy.quiz.start}</PractiseText>
            </PractiseButton>
          </HeaderActions>
        </Header>

        {/* The number a learner is proud of is the biggest thing on the
            screen. */}
        <Count accessibilityRole="header">
          <CountUp target={viewedObjects.length} />
          <CountLabel>
            {' '}
            {copy.history.countLabel(viewedObjects.length)}
          </CountLabel>
        </Count>

        {viewedObjects.length > 0 ? (
          <Filters accessibilityLabel={copy.history.filters}>
            {pronunciationFilters.map(option => (
              <FilterChip
                accessibilityLabel={`${filterLabels[option]}, ${counts[option]}`}
                accessibilityRole="button"
                accessibilityState={{ selected: filter === option }}
                key={option}
                onPress={() => setFilter(option)}
                testID={`history-filter-${option}`}
                $active={filter === option}
              >
                <FilterText $active={filter === option}>
                  {filterLabels[option]}
                </FilterText>
                <FilterCount $active={filter === option}>
                  {counts[option]}
                </FilterCount>
              </FilterChip>
            ))}
          </Filters>
        ) : null}

        {/* Two numbers that only go up, which is the reason to come back
            tomorrow. */}
        <Progress>
          <ProgressItem>
            <ProgressValue>{level.level}</ProgressValue>
            <ProgressLabel>{copy.history.levelLabel}</ProgressLabel>
            <LevelTrack>
              <LevelFillBar
                percentage={Math.round(
                  (level.intoLevel / Math.max(level.levelSpan, 1)) * 100,
                )}
              />
            </LevelTrack>
            <ProgressHint numberOfLines={1}>
              {copy.history.levelHint(
                Math.max(level.levelSpan - level.intoLevel, 0),
                level.level + 1,
              )}
            </ProgressHint>
          </ProgressItem>
          <ProgressDivider />
          <ProgressItem>
            <ProgressValue>{streakDays}</ProgressValue>
            <ProgressLabel>{copy.history.streakLabel}</ProgressLabel>
          </ProgressItem>
        </Progress>
        {/* A number on its own says nothing, so the screen says where it comes
            from. */}
        <ProgressSource>{copy.history.levelSource}</ProgressSource>

        {due.length > 0 ? (
          <DueBand
            accessibilityLabel={copy.history.dueTitle(due.length)}
            accessibilityRole="button"
            onPress={() => onOpenQuiz(due.map(entry => entry.label))}
            testID="history-due"
          >
            <DueText>
              <DueTitle>{copy.history.dueTitle(due.length)}</DueTitle>
              <DueNote numberOfLines={1}>{copy.history.dueNote}</DueNote>
            </DueText>
            <DueAction>
              <DueActionText>{copy.history.dueAction}</DueActionText>
            </DueAction>
          </DueBand>
        ) : null}

        {viewedObjects.length === 0 ? (
          <EmptyState testID="history-empty">
            <EmptyText>{copy.history.empty}</EmptyText>
          </EmptyState>
        ) : visibleEntries.length === 0 ? (
          <EmptyState testID="history-filter-empty">
            <EmptyText>{copy.history.noneForFilter}</EmptyText>
          </EmptyState>
        ) : (
          <List showsVerticalScrollIndicator={false}>
            {visibleEntries.map(({ entry, resting, status }) => {
              const vocabulary = vocabularyRepository.findByLabel(
                entry.label,
                languageSettings,
              );

              return (
                <Row
                  accessibilityHint={copy.history.tapToHear}
                  accessibilityLabel={`${vocabulary.word}, ${vocabulary.meaning}. ${statusLabels[status]}`}
                  accessibilityRole="button"
                  key={entry.label}
                  onPress={() =>
                    pronunciationPlayer
                      .speak(vocabulary.word, languageSettings.learningLanguage)
                      .catch(() => undefined)
                  }
                  testID={`history-${entry.label}`}
                >
                  <StatusDot $status={status} />
                  <RowText>
                    <Word numberOfLines={1}>{vocabulary.word}</Word>
                    <Translations numberOfLines={1}>
                      {[
                        vocabulary.meaning,
                        ...vocabulary.translations
                          .filter(
                            translation =>
                              translation.word !== vocabulary.meaning,
                          )
                          .map(translation => translation.word),
                      ].join('  •  ')}
                    </Translations>
                  </RowText>
                  <SeenAt>
                    {resting
                      ? copy.history.resting
                      : formatSeenAt(copy, entry.seenAtMs)}
                  </SeenAt>
                  <FavoriteButton
                    accessibilityLabel={copy.history.favorite}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: isFavorite(favorites, entry.label),
                    }}
                    hitSlop={10}
                    onPress={() => onToggleFavorite(entry.label)}
                    testID={`history-favorite-${entry.label}`}
                  >
                    <FavoriteMark $active={isFavorite(favorites, entry.label)}>
                      {isFavorite(favorites, entry.label) ? '★' : '☆'}
                    </FavoriteMark>
                  </FavoriteButton>
                  <SpeakButton
                    accessibilityLabel={copy.history.practise}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: resting }}
                    hitSlop={8}
                    onPress={
                      resting
                        ? undefined
                        : () => onPractiseSpeaking(entry.label)
                    }
                    testID={`history-speak-${entry.label}`}
                    $resting={resting}
                  >
                    <MicIcon color={theme.colors.accent} />
                  </SpeakButton>
                </Row>
              );
            })}
          </List>
        )}
      </HistorySafeArea>
    </Container>
  );
}

const Container = styled.View`
  position: absolute;
  inset: 0px;
  background-color: ${({ theme }) => theme.colors.background};
`;

const HistorySafeArea = styled(SafeAreaView)`
  flex: 1;
  padding: 0px 20px;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
  padding: 2px 2px 16px;
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

const List = styled.ScrollView`
  flex: 1;
`;

/** A line, not a card. Colour in blocks made every word shout at once; the dot
 * says the same thing and gives the word back its weight. */
const Row = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 11px;
  padding: 12px 2px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const Word = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 15px;
  font-weight: 700;
`;

/** Colour alone would not survive colour blindness, so the outcome is marked
 * with a glyph as well. */
const SeenAt = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  line-height: 16px;
`;

const Translations = styled.Text`
  margin-top: 1px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
`;

const EmptyState = styled.View`
  padding: 24px 20px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: 16px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const EmptyText = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
  line-height: 20px;
`;

const FavoriteButton = styled.Pressable`
  padding: 2px;
`;

const FavoriteMark = styled.Text<{ $active: boolean }>`
  color: ${({ theme, $active }) =>
    $active ? theme.colors.accent : theme.colors.muted};
  font-size: 18px;
  line-height: 22px;
`;

/**
 * Rolls the total up from nothing when the screen opens.
 *
 * The count is the one number a learner is proud of, and watching it climb is
 * what makes it feel earned rather than reported. It settles in well under a
 * second, and anyone who asked their phone for less motion sees it arrive at
 * the total directly.
 */
/** The bar fills to where the learner stands, arriving with the count. */
function LevelFillBar({ percentage }: { percentage: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(percentage, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [percentage, width]);

  const style = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return <LevelFill style={style} />;
}

/**
 * The total, rolled up from nothing when the screen opens.
 *
 * The count is the one number a learner is proud of, and watching it climb is
 * what makes it feel earned rather than reported. It runs on the interface
 * thread rather than on a timer in JavaScript, and anyone who asked their
 * phone for less motion sees the total arrive directly.
 */
function CountUp({ target }: { target: number }) {
  const counted = useSharedValue(0);

  useEffect(() => {
    counted.value = 0;
    counted.value = withTiming(target, {
      duration: getCountUpDurationMs(target),
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [counted, target]);

  const animatedProps = useAnimatedProps(() => ({
    text: String(Math.round(counted.value)),
    defaultValue: String(Math.round(counted.value)),
  }));

  return (
    <CountValue
      animatedProps={animatedProps}
      editable={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      value={String(target)}
    />
  );
}

const Progress = styled.View`
  flex-direction: row;
  align-items: stretch;
  margin-bottom: 18px;
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const ProgressItem = styled.View`
  flex: 1;
  gap: 2px;
`;

const ProgressDivider = styled.View`
  width: 1px;
  margin: 0px 16px;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const ProgressValue = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.4px;
`;

const ProgressLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
`;

const LevelTrack = styled.View`
  height: 4px;
  margin-top: 8px;
  border-radius: 2px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const LevelFill = styled(Animated.View)`
  height: 4px;
  border-radius: 2px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const ProgressHint = styled.Text`
  margin-top: 7px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
`;

const ProgressSource = styled.Text`
  margin-top: 10px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  line-height: 15px;
`;

const StatusDot = styled.View<{ $status: PronunciationStatus }>`
  width: 7px;
  height: 7px;
  border-radius: 4px;
  background-color: ${({ theme, $status }) =>
    $status === 'matched'
      ? theme.colors.success
      : $status === 'missed'
      ? theme.colors.danger
      : theme.colors.border};
`;

const RowText = styled.View`
  flex: 1;
  min-width: 0px;
`;

/** A text input rather than a text: it is the one element whose contents can
 * be written from the interface thread, which is where the count runs. */
const CountValue = styled(Animated.createAnimatedComponent(TextInput))`
  padding: 0px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 44px;
  line-height: 48px;
  font-weight: 800;
  letter-spacing: -1.2px;
`;

const Count = styled.View`
  flex-direction: row;
  align-items: baseline;
  gap: 8px;
  margin: 6px 0px 18px;
`;

const CountLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0px;
`;

/** The only block on the screen wearing the action colour, because it is the
 * only thing here asking to be done. */
const DueBand = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 13px 14px;
  border: 1px solid ${({ theme }) => theme.colors.accent};
  border-radius: 14px;
  background-color: ${({ theme }) => theme.colors.glassBlue};
`;

const DueText = styled.View`
  flex: 1;
  min-width: 0px;
`;

const DueTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 13.5px;
  font-weight: 700;
`;

const DueNote = styled.Text`
  margin-top: 1px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11.5px;
`;

const DueAction = styled.View`
  padding: 7px 13px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const DueActionText = styled.Text`
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
`;

const HeaderActions = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const CollectionButton = styled.Pressable`
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 19px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const CollectionMark = styled.Text`
  font-size: 17px;
`;

const PractiseButton = styled.Pressable`
  padding: 10px 16px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const PractiseText = styled.Text`
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
`;

const SpeakButton = styled.Pressable<{ $resting: boolean }>`
  opacity: ${({ $resting }) => ($resting ? 0.35 : 1)};
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: 16px;
`;

const Filters = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 12px;
`;

const FilterChip = styled.Pressable<{ $active: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.text : theme.colors.borderSubtle};
  border-radius: 999px;
  /* The chosen filter inverts rather than turning blue: the action colour is
     spent on the one thing this screen asks for, which is the review. */
  background-color: ${({ theme, $active }) =>
    $active ? theme.colors.text : 'transparent'};
`;

const FilterText = styled.Text<{ $active: boolean }>`
  color: ${({ theme, $active }) =>
    $active ? theme.colors.background : theme.colors.muted};
  font-size: 11.5px;
  line-height: 16px;
  font-weight: 600;
`;

const FilterCount = styled.Text<{ $active: boolean }>`
  color: ${({ theme, $active }) =>
    $active ? theme.colors.background : theme.colors.mutedStrong};
  font-size: 11px;
  line-height: 16px;
  font-weight: 700;
  opacity: 0.7;
`;
