import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

import type { VocabularyRepository } from '../../application/ports/VocabularyRepository';
import {
  getCollectionsProgress,
  type CollectionId,
} from '../../domain/Collection';
import { getExperience, getLevelProgress } from '../../domain/LearnerProgress';
import type { LearningLanguageSettings } from '../../domain/LearningLanguage';
import type { LearningCopy } from '../localization/learningCopy';

interface CollectionScreenProps {
  copy: LearningCopy;
  foundLabels: readonly string[];
  languageSettings: LearningLanguageSettings;
  matchedPronunciations: number;
  onClose: () => void;
  streakDays: number;
  vocabularyRepository: VocabularyRepository;
}

export function CollectionScreen({
  copy,
  foundLabels,
  languageSettings,
  matchedPronunciations,
  onClose,
  streakDays,
  vocabularyRepository,
}: CollectionScreenProps) {
  const [openCollection, setOpenCollection] = useState<CollectionId | null>(
    null,
  );
  const progress = getCollectionsProgress(foundLabels);
  const level = getLevelProgress(
    getExperience(foundLabels.length, matchedPronunciations),
  );

  return (
    <Container>
      <CollectionSafeArea edges={['top']}>
        <Header>
          <BackButton
            accessibilityLabel={copy.tabs.camera}
            accessibilityRole="button"
            onPress={onClose}
            testID="collection-close"
          >
            <BackChevron>‹</BackChevron>
          </BackButton>
          <HeaderText>
            <Title accessibilityRole="header">{copy.collection.title}</Title>
            <Subtitle>{copy.collection.subtitle}</Subtitle>
          </HeaderText>
        </Header>

        <List showsVerticalScrollIndicator={false}>
          <Stats>
            <Stat testID="collection-streak">
              <StatGlyph>🔥</StatGlyph>
              <StatValue>{copy.collection.streak(streakDays)}</StatValue>
            </Stat>
            <Stat testID="collection-level">
              <StatGlyph>⭐</StatGlyph>
              <StatValue>{copy.collection.level(level.level)}</StatValue>
            </Stat>
            <Stat testID="collection-found">
              <StatGlyph>🏆</StatGlyph>
              <StatValue>
                {copy.collection.foundTotal(foundLabels.length)}
              </StatValue>
            </Stat>
          </Stats>

          <LevelTrack>
            <LevelFill
              $percentage={
                level.levelSpan === 0
                  ? 0
                  : (level.intoLevel / level.levelSpan) * 100
              }
            />
          </LevelTrack>

          {foundLabels.length === 0 ? (
            <EmptyText testID="collection-empty">
              {copy.collection.empty}
            </EmptyText>
          ) : null}

          {progress.map(({ collection, found, missing }) => {
            const isOpen = openCollection === collection.id;
            const total = collection.labels.length;

            return (
              <CollectionCard key={collection.id}>
                <CollectionRow
                  accessibilityLabel={`${
                    copy.collection.names[collection.id]
                  }, ${copy.collection.objects(found.length, total)}`}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  onPress={() =>
                    setOpenCollection(isOpen ? null : collection.id)
                  }
                  testID={`collection-${collection.id}`}
                >
                  <CollectionHeader>
                    <CollectionName numberOfLines={1}>
                      {copy.collection.names[collection.id]}
                    </CollectionName>
                    <CollectionCount $complete={found.length === total}>
                      {found.length === total
                        ? copy.collection.complete
                        : copy.collection.objects(found.length, total)}
                    </CollectionCount>
                  </CollectionHeader>

                  <CollectionTrack>
                    <CollectionFill
                      $percentage={(found.length / total) * 100}
                      $complete={found.length === total}
                    />
                  </CollectionTrack>
                </CollectionRow>

                {isOpen ? (
                  <CollectionDetail
                    testID={`collection-detail-${collection.id}`}
                  >
                    {found.length > 0 ? (
                      <>
                        <DetailLabel>{copy.collection.foundHere}</DetailLabel>
                        <Chips>
                          {found.map(label => (
                            <Chip key={label} $found>
                              <ChipText $found>
                                {
                                  vocabularyRepository.findByLabel(
                                    label,
                                    languageSettings,
                                  ).word
                                }
                              </ChipText>
                            </Chip>
                          ))}
                        </Chips>
                      </>
                    ) : null}

                    {missing.length > 0 ? (
                      <>
                        <DetailLabel>{copy.collection.missingHere}</DetailLabel>
                        <Chips>
                          {missing.map(label => (
                            <Chip key={label}>
                              <ChipText>
                                {
                                  vocabularyRepository.findByLabel(
                                    label,
                                    languageSettings,
                                  ).meaning
                                }
                              </ChipText>
                            </Chip>
                          ))}
                        </Chips>
                      </>
                    ) : null}
                  </CollectionDetail>
                ) : null}
              </CollectionCard>
            );
          })}
        </List>
      </CollectionSafeArea>
    </Container>
  );
}

const Container = styled.View`
  position: absolute;
  inset: 0px;
  background-color: ${({ theme }) => theme.colors.background};
`;

const CollectionSafeArea = styled(SafeAreaView)`
  flex: 1;
  padding: 0px 20px;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
  padding: 2px 2px 16px;
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

const List = styled.ScrollView`
  flex: 1;
`;

const Stats = styled.View`
  flex-direction: row;
  gap: 8px;
`;

const Stat = styled.View`
  flex: 1;
  align-items: center;
  gap: 4px;
  padding: 12px 6px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: 16px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const StatGlyph = styled.Text`
  font-size: 18px;
  line-height: 22px;
`;

const StatValue = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 12px;
  line-height: 16px;
  font-weight: 800;
  text-align: center;
`;

const LevelTrack = styled.View`
  height: 6px;
  margin: 12px 0px 16px;
  border-radius: 3px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const LevelFill = styled.View<{ $percentage: number }>`
  width: ${({ $percentage }) => `${Math.max($percentage, 2)}%`};
  height: 6px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const EmptyText = styled.Text`
  margin-bottom: 16px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
  line-height: 20px;
`;

const CollectionCard = styled.View`
  margin-bottom: 8px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: 16px;
  background-color: ${({ theme }) => theme.colors.card};
  overflow: hidden;
`;

const CollectionRow = styled.Pressable`
  padding: 14px 16px;
`;

const CollectionHeader = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const CollectionName = styled.Text`
  flex: 1;
  min-width: 0px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  line-height: 22px;
  font-weight: 700;
`;

const CollectionCount = styled.Text<{ $complete: boolean }>`
  color: ${({ theme, $complete }) =>
    $complete ? theme.colors.success : theme.colors.muted};
  font-size: 12px;
  line-height: 16px;
  font-weight: 800;
`;

const CollectionTrack = styled.View`
  height: 6px;
  margin-top: 10px;
  border-radius: 3px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const CollectionFill = styled.View<{
  $percentage: number;
  $complete: boolean;
}>`
  width: ${({ $percentage }) => `${Math.max($percentage, 0)}%`};
  height: 6px;
  background-color: ${({ theme, $complete }) =>
    $complete ? theme.colors.success : theme.colors.accent};
`;

const CollectionDetail = styled.View`
  padding: 0px 16px 14px;
`;

const DetailLabel = styled.Text`
  margin-bottom: 6px;
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: 11px;
  line-height: 15px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
`;

const Chips = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
`;

const Chip = styled.View<{ $found?: boolean }>`
  padding: 5px 10px;
  border: 1px solid
    ${({ theme, $found }) =>
      $found ? theme.colors.success : theme.colors.borderSubtle};
  border-radius: 999px;
`;

const ChipText = styled.Text<{ $found?: boolean }>`
  color: ${({ theme, $found }) =>
    $found ? theme.colors.success : theme.colors.muted};
  font-size: 12px;
  line-height: 16px;
  font-weight: ${({ $found }) => ($found ? 800 : 600)};
`;
