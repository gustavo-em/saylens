import { SafeAreaView } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';

import {
  getAvailableLearningLanguages,
  learningLanguages,
  type LearningLanguage,
  type LearningLanguageSettings,
} from '../../domain/LearningLanguage';
import type { LearningCopy } from '../localization/learningCopy';

interface SettingsScreenProps {
  copy: LearningCopy;
  languageSettings: LearningLanguageSettings;
  onLearningLanguageChange: (language: LearningLanguage) => void;
  onNativeLanguageChange: (language: LearningLanguage) => void;
  onShowGuidanceChange: (value: boolean) => void;
  showGuidance: boolean;
}

export function SettingsScreen({
  copy,
  languageSettings,
  onLearningLanguageChange,
  onNativeLanguageChange,
  onShowGuidanceChange,
  showGuidance,
}: SettingsScreenProps) {
  const theme = useTheme();

  return (
    <Container>
      <SettingsSafeArea edges={['top']}>
        <Content showsVerticalScrollIndicator={false}>
          <Header>
            <Eyebrow>SPELLFORME</Eyebrow>
            <Title accessibilityRole="header">{copy.settings.title}</Title>
            <Subtitle>{copy.settings.subtitle}</Subtitle>
          </Header>

          <Section>
            <SectionTitle>{copy.settings.languagesSection}</SectionTitle>
            <LanguageCard>
              <SettingTitle>{copy.settings.nativeLanguageTitle}</SettingTitle>
              <SettingDescription>
                {copy.settings.nativeLanguageDescription}
              </SettingDescription>
              <LanguageOptions>
                {learningLanguages.map(language => (
                  <LanguageOption
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: languageSettings.nativeLanguage === language,
                    }}
                    key={language}
                    onPress={() => onNativeLanguageChange(language)}
                    testID={`native-language-${language}`}
                    $selected={languageSettings.nativeLanguage === language}
                  >
                    <LanguageOptionText
                      $selected={languageSettings.nativeLanguage === language}
                    >
                      {copy.languageName(language)}
                    </LanguageOptionText>
                  </LanguageOption>
                ))}
              </LanguageOptions>
            </LanguageCard>

            <LanguageCard>
              <SettingTitle>{copy.settings.learningLanguageTitle}</SettingTitle>
              <SettingDescription>
                {copy.settings.learningLanguageDescription}
              </SettingDescription>
              <LanguageOptions>
                {getAvailableLearningLanguages(
                  languageSettings.nativeLanguage,
                ).map(language => (
                  <LanguageOption
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: languageSettings.learningLanguage === language,
                    }}
                    key={language}
                    onPress={() => onLearningLanguageChange(language)}
                    testID={`learning-language-${language}`}
                    $selected={languageSettings.learningLanguage === language}
                  >
                    <LanguageOptionText
                      $selected={languageSettings.learningLanguage === language}
                    >
                      {copy.languageName(language)}
                    </LanguageOptionText>
                  </LanguageOption>
                ))}
              </LanguageOptions>
            </LanguageCard>
          </Section>

          <Section>
            <SectionTitle>{copy.settings.cameraSection}</SectionTitle>
            <SettingCard>
              <SettingCopy>
                <SettingTitle>{copy.settings.guidanceTitle}</SettingTitle>
                <SettingDescription>
                  {copy.settings.guidanceDescription}
                </SettingDescription>
              </SettingCopy>
              <GuidanceSwitch
                accessibilityLabel={copy.settings.guidanceAccessibility}
                onValueChange={onShowGuidanceChange}
                thumbColor={showGuidance ? theme.colors.background : '#D8E5DF'}
                trackColor={{
                  false: '#345046',
                  true: theme.colors.accent,
                }}
                value={showGuidance}
              />
            </SettingCard>
          </Section>

          <Section>
            <SectionTitle>{copy.settings.technicalSection}</SectionTitle>
            <InfoCard>
              <InfoRow
                label={copy.settings.cameraLabel}
                value={copy.settings.cameraValue}
              />
              <Separator />
              <InfoRow
                label={copy.settings.processingLabel}
                value={copy.settings.processingValue}
              />
              <Separator />
              <InfoRow
                label={copy.settings.recognitionLabel}
                value={copy.settings.recognitionValue}
              />
            </InfoCard>
          </Section>

          <AboutCard>
            <AboutEyebrow>MILESTONE 5</AboutEyebrow>
            <AboutTitle>{copy.settings.aboutTitle}</AboutTitle>
            <AboutBody>{copy.settings.aboutBody}</AboutBody>
          </AboutCard>
        </Content>
      </SettingsSafeArea>
    </Container>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <InfoRowContainer>
      <InfoLabel>{label}</InfoLabel>
      <InfoValue>{value}</InfoValue>
    </InfoRowContainer>
  );
}

const Container = styled.View`
  position: absolute;
  inset: 0px;
  background-color: ${({ theme }) => theme.colors.background};
`;

const SettingsSafeArea = styled(SafeAreaView)`
  flex: 1;
`;

const Content = styled.ScrollView.attrs({
  contentContainerStyle: {
    gap: 30,
    paddingBottom: 132,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
})``;

const Header = styled.View``;

const Eyebrow = styled.Text`
  color: ${({ theme }) => theme.colors.accent};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.8px;
`;

const Title = styled.Text`
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -1px;
`;

const Subtitle = styled.Text`
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 15px;
  line-height: 22px;
`;

const Section = styled.View`
  gap: 10px;
`;

const SectionTitle = styled.Text`
  padding-left: 4px;
  color: #6f8f81;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.4px;
`;

const SettingCard = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: ${({ theme }) => theme.radii.large}px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const LanguageCard = styled(SettingCard)`
  gap: 12px;
`;

const LanguageOptions = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

const LanguageOption = styled.Pressable<{ $selected: boolean }>`
  padding: 9px 11px;
  border: 1px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.accent : theme.colors.borderSubtle};
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ $selected }) =>
    $selected ? 'rgba(112, 241, 181, 0.12)' : 'transparent'};
`;

const LanguageOptionText = styled.Text<{ $selected: boolean }>`
  color: ${({ $selected, theme }) =>
    $selected ? theme.colors.accent : theme.colors.muted};
  font-size: 12px;
  font-weight: 700;
`;

const SettingCopy = styled.View`
  flex: 1;
`;

const SettingTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 700;
`;

const SettingDescription = styled.Text`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
  line-height: 19px;
`;

const GuidanceSwitch = styled.Switch``;

const InfoCard = styled.View`
  padding: 0px 18px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: ${({ theme }) => theme.radii.large}px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const InfoRowContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 17px 0px;
`;

const InfoLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
`;

const InfoValue = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  font-weight: 700;
`;

const Separator = styled.View`
  height: 1px;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const AboutCard = styled.View`
  padding: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 22px;
  background-color: ${({ theme }) => theme.colors.cardElevated};
`;

const AboutEyebrow = styled.Text`
  color: ${({ theme }) => theme.colors.accent};
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.4px;
`;

const AboutTitle = styled.Text`
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 20px;
  font-weight: 800;
`;

const AboutBody = styled.Text`
  margin-top: 8px;
  color: #a8c2b6;
  font-size: 14px;
  line-height: 21px;
`;
