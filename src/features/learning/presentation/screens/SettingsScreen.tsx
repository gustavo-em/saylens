import { SafeAreaView } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import styled from 'styled-components/native';

import {
  learningLanguages,
  type LearningLanguage,
  type LearningLanguageSettings,
} from '../../domain/LearningLanguage';
import {
  performanceProfiles,
  type PerformanceProfile,
} from '../../domain/PerformanceProfile';
import type { LearningCopy } from '../localization/learningCopy';

interface SettingsScreenProps {
  copy: LearningCopy;
  languageSettings: LearningLanguageSettings;
  onLearningLanguageChange: (language: LearningLanguage) => void;
  onNativeLanguageChange: (language: LearningLanguage) => void;
  onPerformanceProfileChange: (profile: PerformanceProfile) => void;
  performanceProfile: PerformanceProfile;
}

export function SettingsScreen({
  copy,
  languageSettings,
  onLearningLanguageChange,
  onNativeLanguageChange,
  onPerformanceProfileChange,
  performanceProfile,
}: SettingsScreenProps) {
  const { height, width } = useWindowDimensions();
  const isLandscape = width > height;
  const nativeLanguage = languageSettings.nativeLanguage;
  const learningLanguage = languageSettings.learningLanguage;

  return (
    <Container>
      <SettingsSafeArea edges={['top']}>
        <Content showsVerticalScrollIndicator={false} $landscape={isLandscape}>
          <Header>
            <BrandRow>
              <BrandMark>S</BrandMark>
              <Eyebrow>SPELLFORME</Eyebrow>
            </BrandRow>
            <Title accessibilityRole="header">{copy.settings.title}</Title>
            <Subtitle>{copy.settings.subtitle}</Subtitle>
          </Header>

          <Section>
            <SectionTitle>{copy.settings.languagesSection}</SectionTitle>
            <LanguagePanel>
              <LanguagePair>
                <PairItem>
                  <PairLabel>{copy.settings.nativeLanguageTitle}</PairLabel>
                  <PairValue>
                    {copy.languageShortName(nativeLanguage)}
                  </PairValue>
                </PairItem>
                <PairConnector>
                  <PairConnectorLine />
                  <PairConnectorArrow>›</PairConnectorArrow>
                </PairConnector>
                <PairItem>
                  <PairLabel>{copy.settings.learningLanguageTitle}</PairLabel>
                  <PairValue>
                    {copy.languageShortName(learningLanguage)}
                  </PairValue>
                </PairItem>
              </LanguagePair>

              <PanelSeparator />

              <LanguageSelector>
                <SelectorHeader>
                  <SettingTitle>
                    {copy.settings.nativeLanguageTitle}
                  </SettingTitle>
                </SelectorHeader>
                <LanguageOptions>
                  {learningLanguages.map(language => (
                    <LanguageOption
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: nativeLanguage === language,
                      }}
                      key={language}
                      onPress={() => onNativeLanguageChange(language)}
                      testID={`native-language-${language}`}
                      $selected={nativeLanguage === language}
                    >
                      <LanguageCode $selected={nativeLanguage === language}>
                        {getLanguageCode(language)}
                      </LanguageCode>
                      <LanguageOptionText
                        numberOfLines={1}
                        $selected={nativeLanguage === language}
                      >
                        {copy.languageShortName(language)}
                      </LanguageOptionText>
                    </LanguageOption>
                  ))}
                </LanguageOptions>
              </LanguageSelector>

              <LanguageSelector>
                <SelectorHeader>
                  <SettingTitle>
                    {copy.settings.learningLanguageTitle}
                  </SettingTitle>
                </SelectorHeader>
                <LanguageOptions>
                  {learningLanguages.map(language => (
                    <LanguageOption
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: learningLanguage === language,
                      }}
                      key={language}
                      onPress={() => onLearningLanguageChange(language)}
                      testID={`learning-language-${language}`}
                      $selected={learningLanguage === language}
                    >
                      <LanguageCode $selected={learningLanguage === language}>
                        {getLanguageCode(language)}
                      </LanguageCode>
                      <LanguageOptionText
                        numberOfLines={1}
                        $selected={learningLanguage === language}
                      >
                        {copy.languageShortName(language)}
                      </LanguageOptionText>
                    </LanguageOption>
                  ))}
                </LanguageOptions>
              </LanguageSelector>
            </LanguagePanel>
          </Section>

          <Section>
            <SectionTitle>{copy.settings.performanceSection}</SectionTitle>
            <PerformancePanel>
              <PerformanceHeader>
                <SettingTitle>{copy.settings.performanceTitle}</SettingTitle>
                <PerformanceDescription>
                  {copy.settings.performanceDescription}
                </PerformanceDescription>
              </PerformanceHeader>

              <PerformanceOptions>
                {performanceProfiles.map(profile => {
                  const selected = profile === performanceProfile;
                  const option = getPerformanceOption(copy, profile);

                  return (
                    <PerformanceOption
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      key={profile}
                      onPress={() => onPerformanceProfileChange(profile)}
                      testID={`performance-profile-${profile}`}
                      $selected={selected}
                    >
                      <PerformanceIcon $selected={selected}>
                        {option.icon}
                      </PerformanceIcon>
                      <PerformanceCopy>
                        <PerformanceOptionTitle $selected={selected}>
                          {option.title}
                        </PerformanceOptionTitle>
                        <PerformanceOptionBody>
                          {option.description}
                        </PerformanceOptionBody>
                      </PerformanceCopy>
                      <SelectionIndicator $selected={selected}>
                        {selected ? '✓' : ''}
                      </SelectionIndicator>
                    </PerformanceOption>
                  );
                })}
              </PerformanceOptions>
            </PerformancePanel>
          </Section>
        </Content>
      </SettingsSafeArea>
    </Container>
  );
}

function getLanguageCode(language: LearningLanguage) {
  return language === 'pt-BR' ? 'PT' : language.toUpperCase();
}

function getPerformanceOption(copy: LearningCopy, profile: PerformanceProfile) {
  switch (profile) {
    case 'ultra-performance':
      return {
        description: copy.settings.ultraPerformanceDescription,
        icon: 'GPU',
        title: copy.settings.ultraPerformanceTitle,
      };
    case 'high-performance':
      return {
        description: copy.settings.highPerformanceDescription,
        icon: 'MAX',
        title: copy.settings.highPerformanceTitle,
      };
    case 'low-device':
      return {
        description: copy.settings.lowDeviceDescription,
        icon: 'ECO',
        title: copy.settings.lowDeviceTitle,
      };
  }
}

const Container = styled.View`
  position: absolute;
  inset: 0px;
  background-color: ${({ theme }) => theme.colors.background};
`;

const SettingsSafeArea = styled(SafeAreaView)`
  flex: 1;
`;

const Content = styled.ScrollView.attrs<{ $landscape: boolean }>(
  ({ $landscape }) => ({
    contentContainerStyle: {
      gap: 26,
      paddingBottom: $landscape ? 36 : 184,
      paddingHorizontal: 22,
      paddingRight: $landscape ? 176 : 22,
      paddingTop: 22,
    },
  }),
)<{ $landscape: boolean }>``;

const Header = styled.View``;

const BrandRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 9px;
`;

const BrandMark = styled.Text`
  width: 26px;
  height: 26px;
  overflow: hidden;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.accent};
  color: #ffffff;
  font-size: 15px;
  font-weight: 900;
  line-height: 26px;
  text-align: center;
`;

const Eyebrow = styled.Text`
  color: ${({ theme }) => theme.colors.accent};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.8px;
`;

const Title = styled.Text.attrs({
  adjustsFontSizeToFit: true,
  minimumFontScale: 0.82,
  numberOfLines: 1,
})`
  margin-top: 16px;
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
  color: #6e9bd8;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.4px;
`;

const LanguagePanel = styled.View`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: 24px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const LanguagePair = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 18px;
  background-color: ${({ theme }) => theme.colors.cardElevated};
`;

const PairItem = styled.View`
  min-width: 0px;
  flex: 1;
`;

const PairLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.7px;
  text-transform: uppercase;
`;

const PairValue = styled.Text.attrs({ numberOfLines: 1 })`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  font-weight: 800;
`;

const PairConnector = styled.View`
  width: 46px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin: 0px 6px;
`;

const PairConnectorLine = styled.View`
  width: 22px;
  height: 1px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const PairConnectorArrow = styled.Text`
  margin-left: -2px;
  color: ${({ theme }) => theme.colors.accent};
  font-size: 24px;
  line-height: 24px;
`;

const PanelSeparator = styled.View`
  height: 1px;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const LanguageSelector = styled.View`
  gap: 13px;
  padding: 16px 18px;
`;

const SelectorHeader = styled.View`
  gap: 3px;
`;

const LanguageOptions = styled.View`
  flex-direction: row;
  gap: 8px;
`;

const LanguageOption = styled.Pressable<{ $selected: boolean }>`
  min-width: 0px;
  min-height: 64px;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 8px 6px;
  border: 1px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.accent : theme.colors.borderSubtle};
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ $selected }) =>
    $selected ? '#1A6FEC' : 'rgba(255, 255, 255, 0.02)'};
`;

const LanguageCode = styled.Text<{ $selected: boolean }>`
  color: ${({ $selected, theme }) =>
    $selected ? '#FFFFFF' : theme.colors.mutedStrong};
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.8px;
`;

const LanguageOptionText = styled.Text<{ $selected: boolean }>`
  max-width: 100%;
  margin-top: 3px;
  color: ${({ $selected, theme }) =>
    $selected ? '#FFFFFF' : theme.colors.muted};
  font-size: 9px;
  font-weight: 600;
`;

const SettingTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 700;
`;

const PerformancePanel = styled.View`
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: 24px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const PerformanceHeader = styled.View`
  gap: 5px;
`;

const PerformanceDescription = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
  line-height: 19px;
`;

const PerformanceOptions = styled.View`
  gap: 10px;
  margin-top: 16px;
`;

const PerformanceOption = styled.Pressable<{ $selected: boolean }>`
  min-height: 74px;
  flex-direction: row;
  align-items: center;
  padding: 13px;
  border: 1px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.accent : theme.colors.borderSubtle};
  border-radius: 18px;
  background-color: ${({ $selected }) =>
    $selected ? 'rgba(26, 111, 236, 0.12)' : 'rgba(255, 255, 255, 0.02)'};
`;

const PerformanceIcon = styled.Text<{ $selected: boolean }>`
  width: 42px;
  height: 42px;
  overflow: hidden;
  border-radius: 13px;
  background-color: ${({ $selected, theme }) =>
    $selected ? theme.colors.accent : theme.colors.cardElevated};
  color: ${({ $selected, theme }) =>
    $selected ? '#FFFFFF' : theme.colors.mutedStrong};
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.5px;
  line-height: 42px;
  text-align: center;
`;

const PerformanceCopy = styled.View`
  min-width: 0px;
  flex: 1;
  margin-left: 12px;
`;

const PerformanceOptionTitle = styled.Text<{ $selected: boolean }>`
  color: ${({ $selected, theme }) =>
    $selected ? theme.colors.accent : theme.colors.text};
  font-size: 15px;
  font-weight: 800;
`;

const PerformanceOptionBody = styled.Text`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  line-height: 16px;
`;

const SelectionIndicator = styled.Text<{ $selected: boolean }>`
  width: 24px;
  height: 24px;
  margin-left: 8px;
  border: 1px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.accent : theme.colors.border};
  border-radius: 12px;
  background-color: ${({ $selected, theme }) =>
    $selected ? theme.colors.accent : 'transparent'};
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
  line-height: 22px;
  text-align: center;
`;
