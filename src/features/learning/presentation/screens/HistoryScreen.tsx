import { useEffect, useMemo, useState, type ReactNode } from 'react';
import LottieView from 'lottie-react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
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
import {
  getExperience,
  getLevelProgress,
  getNextLevelStep,
} from '../../domain/LearnerProgress';
import { isResting } from '../../domain/PronunciationProgress';
import { getWordsToReview } from '../../domain/ReviewQueue';
import { getCountUpDurationMs, getCountUpValue } from '../animation/countUp';
import type { ViewedObject } from '../../domain/ViewedObject';
import type { LearningCopy } from '../localization/learningCopy';
import successCelebration from '../../../../assets/successCelebration.json';

interface HistoryScreenProps {
  copy: LearningCopy;
  languageSettings: LearningLanguageSettings;
  favorites: readonly FavoriteWord[];
  onClose: () => void;
  /** What the learner has built so far, shown at the top of their words. */
  foundLabels: readonly string[];
  /** Where the level bar stood before the word that was just said landed, set
   * only when the screen is being opened by that word. The bar then plays the
   * gain instead of filling from nothing, which is the whole point of being
   * brought here. */
  celebratedFromExperience?: number | null;
  /** Called once the gain has finished playing, so it is played once. */
  onLevelCelebrationShown?: () => void;
  matchedPronunciations: number;
  streakDays: number;
  /** False until the stored words have been read back, so the screen can show
   * that it is still loading rather than that nothing was ever found. */
  hasRestoredWords: boolean;
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
  celebratedFromExperience,
  onLevelCelebrationShown,
  matchedPronunciations,
  streakDays,
  hasRestoredWords,
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
  // Only words that can be said today count towards the shorter route: one
  // that is resting cannot be tried again until tomorrow.
  const practisable = entries.filter(
    ({ resting, status }) => !resting && status !== 'matched',
  );
  const nextStep = getNextLevelStep(level, practisable.length);
  const takeNextStep = () => {
    if (nextStep.kind === 'find' || practisable.length === 0) {
      onClose();
      return;
    }

    onPractiseSpeaking(practisable[0].entry.label);
  };

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
            <LevelMeter
              copy={copy}
              fromExperience={celebratedFromExperience ?? null}
              level={level}
              onCelebrated={onLevelCelebrationShown}
            />
          </ProgressItem>
          <ProgressDivider />
          <ProgressItem>
            <ProgressValue>{streakDays}</ProgressValue>
            <ProgressLabel>{copy.history.streakLabel}</ProgressLabel>
            <StreakWeek days={streakDays} />
          </ProgressItem>
        </Progress>
        {/* A number on its own says nothing. This says where it came from and,
            more to the point, the one thing to go and do about it. */}
        <NextStepBand
          accessibilityHint={copy.history.levelCta(nextStep.kind)}
          accessibilityRole="button"
          onPress={takeNextStep}
          testID="history-next-level"
        >
          <NextStepText>
            <NextStepTitle numberOfLines={2}>
              {nextStep.kind === 'find'
                ? copy.history.levelToFind(
                    nextStep.remaining,
                    nextStep.nextLevel,
                  )
                : copy.history.levelToPronounce(
                    nextStep.remaining,
                    nextStep.nextLevel,
                  )}
            </NextStepTitle>
            <ProgressSource numberOfLines={1}>
              {copy.history.levelSource}
            </ProgressSource>
          </NextStepText>
          <NextStepAction>
            {copy.history.levelCta(nextStep.kind)}
          </NextStepAction>
        </NextStepBand>

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

        {!hasRestoredWords && viewedObjects.length === 0 ? (
          <SkeletonRows />
        ) : viewedObjects.length === 0 ? (
          <EmptyState testID="history-empty">
            <EmptyText>{copy.history.empty}</EmptyText>
          </EmptyState>
        ) : visibleEntries.length === 0 ? (
          <EmptyState testID="history-filter-empty">
            <EmptyText>{copy.history.noneForFilter}</EmptyText>
          </EmptyState>
        ) : (
          <List showsVerticalScrollIndicator={false}>
            {visibleEntries.map(({ entry, resting, status }, index) => {
              const vocabulary = vocabularyRepository.findByLabel(
                entry.label,
                languageSettings,
              );

              return (
                // The list arrives rather than appears. Only the first handful
                // are staggered: past that the wait would be longer than the
                // scroll, and a learner with fifty words would watch a queue.
                <Arriving index={index} key={entry.label}>
                  <Row
                    accessibilityHint={copy.history.tapToHear}
                    accessibilityLabel={`${vocabulary.word}, ${vocabulary.meaning}. ${statusLabels[status]}`}
                    accessibilityRole="button"
                    onPress={() =>
                      pronunciationPlayer
                        .speak(
                          vocabulary.word,
                          languageSettings.learningLanguage,
                        )
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
                      <FavoriteMark
                        $active={isFavorite(favorites, entry.label)}
                      >
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
                      <MicIcon color={theme.colors.accentText} />
                    </SpeakButton>
                  </Row>
                </Arriving>
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
    $active ? theme.colors.accentText : theme.colors.muted};
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
/** How long the bar takes to fill on an ordinary visit. */
const FILL_MS = 900;
/** The two halves of a level being crossed: the run to the end of the old
 * level, and the run into the new one. The pause between them is what gives
 * the number time to change in front of the learner. */
const CROSS_MS = 620;
const CROSS_HOLD_MS = 260;
const REFILL_MS = 760;

/**
 * The level, its bar, and what is left to the next one.
 *
 * On an ordinary visit the bar fills from nothing to where the learner stands.
 * Opened by a word that was just pronounced, it starts where the bar stood
 * before that word and runs to where it stands now — and when the word crossed
 * a level, it runs the old level out to the end, changes the number, and fills
 * the new one from empty. The gain is the reason the learner was brought here,
 * so it is shown rather than reported.
 */
function LevelMeter({
  copy,
  fromExperience,
  level,
  onCelebrated,
}: {
  copy: LearningCopy;
  fromExperience: number | null;
  level: ReturnType<typeof getLevelProgress>;
  onCelebrated?: () => void;
}) {
  const percentage = toPercentage(level);
  // Frozen on the first render. Reporting the gain clears it upstream, and a
  // bar that restarted on that would play the gain twice.
  const [opening] = useState(() =>
    fromExperience == null ? null : getLevelProgress(fromExperience),
  );
  const hasLevelledUp = opening != null && opening.level < level.level;
  const [shownLevel, setShownLevel] = useState(
    hasLevelledUp ? opening.level : level.level,
  );

  return (
    <>
      <ProgressValue testID="history-level">{shownLevel}</ProgressValue>
      <ProgressLabel>{copy.history.levelLabel}</ProgressLabel>
      <LevelTrack>
        <LevelFillBar
          from={opening == null ? 0 : toPercentage(opening)}
          onCelebrated={fromExperience == null ? undefined : onCelebrated}
          onLevelReached={
            hasLevelledUp ? () => setShownLevel(level.level) : undefined
          }
          percentage={percentage}
        />
      </LevelTrack>
      {/* The one moment on this screen worth interrupting for. It plays the
          celebration the app already owns rather than a second one, so a level
          and a word said right feel like the same kind of win. */}
      {hasLevelledUp && shownLevel === level.level ? (
        <LevelBurst
          autoPlay
          loop={false}
          resizeMode="contain"
          source={successCelebration}
          testID="history-level-burst"
        />
      ) : null}
    </>
  );
}

function toPercentage(progress: ReturnType<typeof getLevelProgress>) {
  return Math.round(
    (progress.intoLevel / Math.max(progress.levelSpan, 1)) * 100,
  );
}

/**
 * The bar itself, and a light that travels across what has been earned so far.
 *
 * It always starts at `from` and arrives at `percentage`. When `onLevelReached`
 * is given, the two are on opposite sides of a level boundary and the bar goes
 * the long way round: out to the end, a beat, then up from empty.
 */
function LevelFillBar({
  from,
  onCelebrated,
  onLevelReached,
  percentage,
}: {
  from: number;
  onCelebrated?: () => void;
  onLevelReached?: () => void;
  percentage: number;
}) {
  const width = useSharedValue(from);
  const sheen = useSharedValue(0);

  useEffect(() => {
    const settle = (finished?: boolean) => {
      'worklet';
      if (finished === true && onCelebrated != null) runOnJS(onCelebrated)();
    };

    if (onLevelReached != null) {
      width.value = withSequence(
        withTiming(
          100,
          {
            duration: CROSS_MS,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.System,
          },
          finished => {
            if (finished === true) runOnJS(onLevelReached)();
          },
        ),
        // Full for a beat, which is where the number changes.
        withTiming(100, { duration: CROSS_HOLD_MS }),
        withTiming(0, { duration: 0 }),
        withTiming(
          percentage,
          {
            duration: REFILL_MS,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.System,
          },
          settle,
        ),
      );
    } else {
      width.value = withTiming(
        percentage,
        {
          duration: FILL_MS,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        },
        settle,
      );
    }

    sheen.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        // A pause between passes, so it reads as a highlight rather than as
        // something still loading.
        withTiming(1, { duration: 1600 }),
      ),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    );
    // The bar plays what it was mounted with. Everything it reads here is
    // fixed for the life of the screen, so it never replays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));
  const sheenStyle = useAnimatedStyle(() => ({
    opacity: sheen.value < 1 ? 0.55 : 0,
    left: `${sheen.value * 100}%`,
  }));

  return (
    <LevelFill style={fillStyle}>
      <LevelSheen pointerEvents="none" style={sheenStyle} />
    </LevelFill>
  );
}

/**
 * The last week, one square a day, filled for the days in a row the learner
 * has kept. The streak is the only record kept of which days those were, so
 * the squares are counted back from today.
 */
function StreakWeek({ days }: { days: number }) {
  return (
    <Week>
      {Array.from({ length: STREAK_WEEK_DAYS }, (_, index) => {
        const daysAgo = STREAK_WEEK_DAYS - 1 - index;

        return (
          <StreakDay
            filled={daysAgo < days}
            index={index}
            isToday={daysAgo === 0}
            key={daysAgo}
          />
        );
      })}
    </Week>
  );
}

/**
 * A row that arrives rather than appears.
 *
 * Only the first handful are staggered. Past that the wait would outlast the
 * scroll, and someone with fifty words would sit watching a queue.
 */
function Arriving({ children, index }: { children: ReactNode; index: number }) {
  const arrival = useSharedValue(0);

  useEffect(() => {
    arrival.value = withDelay(
      Math.min(index, ROW_STAGGER_LIMIT) * ROW_STAGGER_MS,
      withTiming(1, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [arrival, index]);

  const style = useAnimatedStyle(() => ({
    opacity: arrival.value,
    transform: [{ translateY: (1 - arrival.value) * ROW_ARRIVAL_RISE }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * One square of the week.
 *
 * The days land left to right, so the week reads as something that was built
 * up rather than printed. Today keeps breathing while the streak is alive,
 * which is the square the learner has to feed tomorrow.
 */
function StreakDay({
  filled,
  index,
  isToday,
}: {
  filled: boolean;
  index: number;
  isToday: boolean;
}) {
  const arrival = useSharedValue(0);
  const breath = useSharedValue(0);

  useEffect(() => {
    arrival.value = withDelay(
      index * STREAK_DAY_STAGGER_MS,
      withTiming(1, {
        duration: 260,
        easing: Easing.out(Easing.back(1.8)),
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [arrival, index]);

  useEffect(() => {
    if (!isToday || !filled) return;

    breath.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
      undefined,
      ReduceMotion.System,
    );
  }, [breath, filled, isToday]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.2 + arrival.value * 0.8,
    transform: [
      { scale: (0.6 + arrival.value * 0.4) * (1 + breath.value * 0.16) },
    ],
  }));

  return <Day style={style} $filled={filled} />;
}

/** Rows that stand in for words while the stored ones are read back. */
function SkeletonRows() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 780, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
      undefined,
      ReduceMotion.System,
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.35,
  }));

  return (
    <SkeletonList testID="history-loading">
      {SKELETON_WIDTHS.map(width => (
        <SkeletonRow key={width}>
          <SkeletonDot style={style} />
          <SkeletonLines>
            <SkeletonBar style={style} $width={width} />
            <SkeletonBar style={style} $width={width - 18} $short />
          </SkeletonLines>
          <SkeletonTail style={style} />
        </SkeletonRow>
      ))}
    </SkeletonList>
  );
}

/**
 * The total, rolled up from nothing when the screen opens.
 *
 * The count is the one number a learner is proud of, and watching it climb is
 * what makes it feel earned rather than reported.
 *
 * It steps in JavaScript rather than on the interface thread. Reanimated can
 * animate a number, but writing that number into a view's text needs the
 * native prop whitelist, and that is a no-op in Reanimated 4 — the value
 * animates and the text jumps from its first frame to its last. Twenty-five
 * steps over a second is a cost worth paying for a count that can be read.
 */
function CountUp({ target }: { target: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);

    const durationMs = getCountUpDurationMs(target);
    const startedAtMs = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAtMs;
      setShown(getCountUpValue(target, elapsed, durationMs));
      if (elapsed >= durationMs) clearInterval(timer);
    }, 40);

    return () => clearInterval(timer);
  }, [target]);

  return <CountValue>{shown}</CountValue>;
}

/** Seven days, one square each, ending today. */
const STREAK_WEEK_DAYS = 7;
/** How the week and the list arrive. */
const STREAK_DAY_STAGGER_MS = 60;
const ROW_STAGGER_MS = 45;
const ROW_STAGGER_LIMIT = 7;
const ROW_ARRIVAL_RISE = 14;
/** Widths of the standing-in rows, so they do not look printed. */
const SKELETON_WIDTHS = [128, 96, 142, 110, 120, 88];

const Week = styled.View`
  flex-direction: row;
  gap: 4px;
  margin-top: 9px;
`;

const Day = styled(Animated.View)<{ $filled: boolean }>`
  width: 11px;
  height: 11px;
  border-radius: 3px;
  background-color: ${({ theme, $filled }) =>
    $filled ? theme.colors.accent : theme.colors.borderSubtle};
`;

const SkeletonList = styled.View`
  padding-top: 4px;
`;

const SkeletonRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 11px;
  padding: 14px 2px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const SkeletonDot = styled(Animated.View)`
  width: 7px;
  height: 7px;
  border-radius: 4px;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const SkeletonLines = styled.View`
  flex: 1;
  gap: 6px;
`;

const SkeletonBar = styled(Animated.View)<{ $width: number; $short?: boolean }>`
  width: ${({ $width }) => $width}px;
  height: ${({ $short }) => ($short ? 8 : 11)}px;
  border-radius: 5px;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const SkeletonTail = styled(Animated.View)`
  width: 34px;
  height: 9px;
  border-radius: 5px;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;

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
  overflow: hidden;
  border-radius: 2px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

/** A light that crosses what has been earned. */
const LevelSheen = styled(Animated.View)`
  position: absolute;
  top: 0px;
  width: 26px;
  height: 4px;
  background-color: #ffffff;
`;

const ProgressSource = styled.Text`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  line-height: 15px;
`;

const LevelBurst = styled(LottieView)`
  position: absolute;
  pointer-events: none;
  top: -34px;
  left: -22px;
  width: 132px;
  height: 132px;
`;

/**
 * What to do next, in the unit the doing happens in.
 *
 * Deliberately quieter than the review band above it: that one is a debt due
 * today, this one is where the learner is heading. Both are pressable, and the
 * urgent one keeps the filled pill.
 */
const NextStepBand = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 11px 14px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: 14px;
  background-color: ${({ theme }) => theme.colors.cardElevated};
`;

const NextStepText = styled.View`
  flex: 1;
  min-width: 0px;
`;

const NextStepTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 13.5px;
  font-weight: 700;
`;

const NextStepAction = styled.Text`
  color: ${({ theme }) => theme.colors.accentText};
  font-size: 12.5px;
  font-weight: 700;
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

const CountValue = styled.Text`
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
