import { SafeAreaView } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import styled from 'styled-components/native';

import {
  appearanceModes,
  type AppearanceMode,
} from '../../../../app/theme/theme';
import {
  languageFlags,
  learningLanguages,
  type LearningLanguage,
  type LearningLanguageSettings,
} from '../../domain/LearningLanguage';
import {
  performanceProfiles,
  type PerformanceCapabilities,
  type PerformanceProfile,
} from '../../domain/PerformanceProfile';
import type { LearningCopy } from '../localization/learningCopy';

interface SettingsScreenProps {
  appearanceMode: AppearanceMode;
  copy: LearningCopy;
  languageSettings: LearningLanguageSettings;
  onAppearanceModeChange: (mode: AppearanceMode) => void;
  onClose: () => void;
  onLearningLanguageChange: (language: LearningLanguage) => void;
  onNativeLanguageChange: (language: LearningLanguage) => void;
  onPerformanceProfileChange: (profile: PerformanceProfile) => void;
  onToggleDiagnostics: (enabled: boolean) => void;
  showDiagnostics: boolean;
  performanceCapabilities: PerformanceCapabilities;
  performanceProfile: PerformanceProfile;
}

export function SettingsScreen({
  appearanceMode,
  copy,
  languageSettings,
  onAppearanceModeChange,
  onClose,
  onLearningLanguageChange,
  onNativeLanguageChange,
  onPerformanceProfileChange,
  onToggleDiagnostics,
  showDiagnostics,
  performanceCapabilities,
  performanceProfile,
}: SettingsScreenProps) {
  const { height, width } = useWindowDimensions();
  const isLandscape = width > height;
  const nativeLanguage = languageSettings.nativeLanguage;
  const learningLanguage = languageSettings.learningLanguage;

  return (
    <Container>
      <AmbientGlowTop pointerEvents="none" />
      <AmbientGlowBottom pointerEvents="none" />
      <SettingsSafeArea edges={['top']}>
        <Content showsVerticalScrollIndicator={false} $landscape={isLandscape}>
          <Header>
            <BackButton
              accessibilityLabel={copy.tabs.camera}
              accessibilityRole="button"
              onPress={onClose}
              testID="settings-close"
            >
              <BackChevron>‹</BackChevron>
            </BackButton>
            <Title accessibilityRole="header">{copy.settings.title}</Title>
          </Header>

          <Section>
            <SectionTitle>{copy.settings.appearanceSection}</SectionTitle>
            <AppearancePanel>
              <PanelSheen pointerEvents="none" />
              <AppearanceHeader>
                <SettingTitle>{copy.settings.appearanceTitle}</SettingTitle>
                <AppearanceDescription>
                  {copy.settings.appearanceDescription}
                </AppearanceDescription>
              </AppearanceHeader>
              <AppearanceOptions>
                {appearanceModes.map(mode => {
                  const selected = appearanceMode === mode;

                  return (
                    <AppearanceOption
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      key={mode}
                      onPress={() => onAppearanceModeChange(mode)}
                      testID={`appearance-${mode}`}
                      $selected={selected}
                    >
                      <AppearanceIcon $selected={selected}>
                        {mode === 'dark' ? '☾︎' : '☀︎'}
                      </AppearanceIcon>
                      <AppearanceOptionLabel $selected={selected}>
                        {mode === 'dark'
                          ? copy.settings.darkMode
                          : copy.settings.lightMode}
                      </AppearanceOptionLabel>
                    </AppearanceOption>
                  );
                })}
              </AppearanceOptions>
            </AppearancePanel>
          </Section>

          <Section>
            <SectionTitle>{copy.settings.languagesSection}</SectionTitle>
            <LanguagePanel>
              <PanelSheen pointerEvents="none" />
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
                        {languageFlags[language]}
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
                        {languageFlags[language]}
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
              <PanelSheen pointerEvents="none" />
              <PerformanceHeader>
                <SettingTitle>{copy.settings.performanceTitle}</SettingTitle>
                <PerformanceDescription>
                  {copy.settings.performanceDescription}
                </PerformanceDescription>
              </PerformanceHeader>

              <PerformanceOptions>
                {performanceProfiles
                  .filter(profile =>
                    performanceCapabilities.supportedProfiles.includes(profile),
                  )
                  .map(profile => {
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

              <DiagnosticsRow>
                <DiagnosticsText>
                  <SettingTitle>{copy.settings.diagnosticsTitle}</SettingTitle>
                  <PerformanceDescription>
                    {copy.settings.diagnosticsDescription}
                  </PerformanceDescription>
                </DiagnosticsText>
                <DiagnosticsToggle
                  accessibilityRole="switch"
                  accessibilityState={{ checked: showDiagnostics }}
                  onPress={() => onToggleDiagnostics(!showDiagnostics)}
                  testID="settings-toggle-diagnostics"
                  $enabled={showDiagnostics}
                >
                  <DiagnosticsToggleText $enabled={showDiagnostics}>
                    {showDiagnostics
                      ? copy.settings.diagnosticsOn
                      : copy.settings.diagnosticsOff}
                  </DiagnosticsToggleText>
                </DiagnosticsToggle>
              </DiagnosticsRow>
            </PerformancePanel>
          </Section>
        </Content>
      </SettingsSafeArea>
    </Container>
  );
}

function getPerformanceOption(copy: LearningCopy, profile: PerformanceProfile) {
  switch (profile) {
    case 'maximum-performance':
      return {
        description: copy.settings.maximumPerformanceDescription,
        icon: 'MAX',
        title: copy.settings.maximumPerformanceTitle,
      };
    case 'power-saving':
      return {
        description: copy.settings.powerSavingDescription,
        icon: 'ECO',
        title: copy.settings.powerSavingTitle,
      };
  }
}

const Container = styled.View`
  position: absolute;
  inset: 0px;
  background-color: ${({ theme }) => theme.colors.background};
`;

const AmbientGlowTop = styled.View`
  position: absolute;
  top: -120px;
  right: -110px;
  width: 310px;
  height: 310px;
  border-radius: 155px;
  background-color: rgba(26, 111, 236, 0.19);
`;

const AmbientGlowBottom = styled.View`
  position: absolute;
  bottom: 30px;
  left: -150px;
  width: 300px;
  height: 300px;
  border-radius: 150px;
  background-color: rgba(67, 143, 255, 0.1);
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

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 2px 2px 0px;
`;

const Title = styled.Text.attrs({
  adjustsFontSizeToFit: true,
  minimumFontScale: 0.82,
  numberOfLines: 1,
})`
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  font-size: 24px;
  line-height: 30px;
  font-weight: 700;
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
  position: relative;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: 24px;
  background-color: ${({ theme }) => theme.colors.glass};
  elevation: 10;
`;

const PanelSheen = styled.View`
  position: absolute;
  top: 0px;
  right: 22px;
  left: 22px;
  height: 1px;
  background-color: ${({ theme }) => theme.colors.glassHighlight};
  z-index: 2;
`;

const AppearancePanel = styled.View`
  position: relative;
  overflow: hidden;
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: 24px;
  background-color: ${({ theme }) => theme.colors.glass};
  elevation: 10;
`;

const AppearanceHeader = styled.View`
  gap: 4px;
`;

const AppearanceDescription = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
  line-height: 19px;
`;

const AppearanceOptions = styled.View`
  flex-direction: row;
  gap: 10px;
  margin-top: 16px;
`;

const AppearanceOption = styled.Pressable<{ $selected: boolean }>`
  min-height: 58px;
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.accent : theme.colors.glassBorder};
  border-radius: 17px;
  background-color: ${({ $selected, theme }) =>
    $selected ? 'rgba(26, 111, 236, 0.68)' : theme.colors.glassBlue};
`;

const AppearanceIcon = styled.Text<{ $selected: boolean }>`
  color: ${({ $selected, theme }) =>
    $selected ? '#FFFFFF' : theme.colors.mutedStrong};
  font-size: 20px;
  line-height: 24px;
`;

const AppearanceOptionLabel = styled.Text<{ $selected: boolean }>`
  color: ${({ $selected, theme }) =>
    $selected ? '#FFFFFF' : theme.colors.mutedStrong};
  font-size: 13px;
  font-weight: 800;
`;

const LanguagePair = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 18px;
  background-color: rgba(66, 126, 206, 0.1);
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
  background-color: ${({ theme }) => theme.colors.glassBorder};
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
      $selected ? 'rgba(139, 190, 255, 0.66)' : theme.colors.glassBorder};
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ $selected }) =>
    $selected ? 'rgba(26, 111, 236, 0.52)' : 'rgba(255, 255, 255, 0.035)'};
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
  position: relative;
  overflow: hidden;
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: 24px;
  background-color: ${({ theme }) => theme.colors.glass};
  elevation: 10;
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
      $selected ? 'rgba(139, 190, 255, 0.66)' : theme.colors.glassBorder};
  border-radius: 18px;
  background-color: ${({ $selected }) =>
    $selected ? 'rgba(26, 111, 236, 0.24)' : 'rgba(255, 255, 255, 0.035)'};
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

const BackButton = styled.Pressable`
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
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

const DiagnosticsRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const DiagnosticsText = styled.View`
  flex: 1;
  min-width: 0px;
`;

const DiagnosticsToggle = styled.Pressable<{ $enabled: boolean }>`
  padding: 8px 14px;
  border: 1px solid
    ${({ theme, $enabled }) =>
      $enabled ? theme.colors.accent : theme.colors.borderSubtle};
  border-radius: 999px;
  background-color: ${({ theme, $enabled }) =>
    $enabled ? theme.colors.accent : 'transparent'};
`;

const DiagnosticsToggleText = styled.Text<{ $enabled: boolean }>`
  color: ${({ theme, $enabled }) =>
    $enabled ? '#ffffff' : theme.colors.muted};
  font-size: 12px;
  font-weight: 800;
`;
