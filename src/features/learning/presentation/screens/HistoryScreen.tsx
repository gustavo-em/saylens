import { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import styled, { useTheme, type DefaultTheme } from 'styled-components/native';

import type { PronunciationPlayer } from '../../application/ports/PronunciationPlayer';
import type { VocabularyRepository } from '../../application/ports/VocabularyRepository';
import { isFavorite, type FavoriteWord } from '../../domain/FavoriteWord';
import {
  languageFlags,
  type LearningLanguageSettings,
} from '../../domain/LearningLanguage';
import {
  getPronunciationStatus,
  matchesPronunciationFilter,
  pronunciationFilters,
  type PronunciationFilter,
  type PronunciationProgressEntry,
  type PronunciationStatus,
} from '../../domain/PronunciationProgress';
import type { ViewedObject } from '../../domain/ViewedObject';
import type { LearningCopy } from '../localization/learningCopy';

interface HistoryScreenProps {
  copy: LearningCopy;
  languageSettings: LearningLanguageSettings;
  favorites: readonly FavoriteWord[];
  onClose: () => void;
  onOpenQuiz: () => void;
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
          <HeaderText>
            <Title accessibilityRole="header">{copy.history.title}</Title>
            <Subtitle>{copy.history.subtitle}</Subtitle>
          </HeaderText>
          <PractiseButton
            accessibilityRole="button"
            onPress={onOpenQuiz}
            testID="history-open-quiz"
          >
            <PractiseText>{copy.quiz.start}</PractiseText>
          </PractiseButton>
        </Header>

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
            {visibleEntries.map(({ entry, status }) => {
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
                  $status={status}
                >
                  <RowHeader>
                    <Flag>
                      {languageFlags[languageSettings.learningLanguage]}
                    </Flag>
                    <Word numberOfLines={1} $status={status}>
                      {vocabulary.word}
                    </Word>
                    {status === 'untried' ? null : (
                      <StatusMark $status={status}>
                        {status === 'matched' ? '✓' : '✕'}
                      </StatusMark>
                    )}
                    <SeenAt>{formatSeenAt(copy, entry.seenAtMs)}</SeenAt>
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
                  </RowHeader>

                  <Translations numberOfLines={1}>
                    {[
                      vocabulary.meaning,
                      ...vocabulary.translations.filter(
                        translation => translation !== vocabulary.meaning,
                      ),
                    ].join('  •  ')}
                  </Translations>

                  <Example numberOfLines={2}>{vocabulary.example}</Example>

                  <RowFooter>
                    <PronunciationHint numberOfLines={1}>
                      {vocabulary.pronunciationHint}
                    </PronunciationHint>
                    <SpeakButton
                      accessibilityLabel={copy.history.practise}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => onPractiseSpeaking(entry.label)}
                      testID={`history-speak-${entry.label}`}
                    >
                      <MicIcon color={theme.colors.accent} />
                      <SpeakButtonText>{copy.history.practise}</SpeakButtonText>
                    </SpeakButton>
                  </RowFooter>
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

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 24px;
  line-height: 30px;
  font-weight: 700;
`;

const List = styled.ScrollView`
  flex: 1;
`;

const statusColor = (theme: DefaultTheme, status: PronunciationStatus) =>
  status === 'matched'
    ? theme.colors.success
    : status === 'missed'
    ? theme.colors.danger
    : theme.colors.text;

const Row = styled.Pressable<{ $status: PronunciationStatus }>`
  padding: 14px 16px;
  margin-bottom: 8px;
  border: 1px solid
    ${({ theme, $status }) =>
      $status === 'untried'
        ? theme.colors.borderSubtle
        : statusColor(theme, $status)};
  border-radius: 16px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const RowHeader = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const Flag = styled.Text`
  font-size: 16px;
  line-height: 22px;
`;

const Word = styled.Text<{ $status: PronunciationStatus }>`
  flex: 1;
  min-width: 0px;
  color: ${({ theme, $status }) => statusColor(theme, $status)};
  font-size: 18px;
  line-height: 24px;
  font-weight: 700;
`;

/** Colour alone would not survive colour blindness, so the outcome is marked
 * with a glyph as well. */
const StatusMark = styled.Text<{ $status: PronunciationStatus }>`
  color: ${({ theme, $status }) => statusColor(theme, $status)};
  font-size: 13px;
  line-height: 18px;
  font-weight: 800;
`;

const SeenAt = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  line-height: 16px;
`;

const Translations = styled.Text`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.accent};
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
`;

const Example = styled.Text`
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
  line-height: 19px;
`;

const RowFooter = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding-top: 10px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const PronunciationHint = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: 12px;
  line-height: 16px;
  font-weight: 700;
`;

const HeaderText = styled.View`
  flex: 1;
  min-width: 0px;
`;

const Subtitle = styled.Text`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
  line-height: 18px;
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

const SpeakButton = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: 999px;
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
  padding: 7px 12px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.accent : theme.colors.borderSubtle};
  border-radius: 999px;
  background-color: ${({ theme, $active }) =>
    $active ? theme.colors.accent : theme.colors.card};
`;

const FilterText = styled.Text<{ $active: boolean }>`
  color: ${({ theme, $active }) => ($active ? '#ffffff' : theme.colors.muted)};
  font-size: 12px;
  line-height: 16px;
  font-weight: 700;
`;

const FilterCount = styled.Text<{ $active: boolean }>`
  color: ${({ theme, $active }) =>
    $active ? 'rgba(255, 255, 255, 0.82)' : theme.colors.mutedStrong};
  font-size: 11px;
  line-height: 16px;
  font-weight: 800;
`;

const SpeakButtonText = styled.Text`
  color: ${({ theme }) => theme.colors.accent};
  font-size: 12px;
  font-weight: 800;
`;
