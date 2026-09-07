import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import styled from 'styled-components/native';

import {
  APP_VERSION,
  DIAGNOSTICS_ENABLED,
} from '../../../../app/config/appMetadata';
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
  type PerformanceCapabilities,
  type PerformanceProfile,
} from '../../domain/PerformanceProfile';
import type { AuthenticatedUser } from '../../application/ports/Authenticator';
import type {
  PractiseReminder,
  PractiseReminderCapabilities,
} from '../../application/ports/PractiseReminder';
import type { LearningCopy } from '../localization/learningCopy';

interface SettingsScreenProps {
  appearanceMode: AppearanceMode;
  copy: LearningCopy;
  languageSettings: LearningLanguageSettings;
  onAppearanceModeChange: (mode: AppearanceMode) => void;
  onClose: () => void;
  onOpenAccount: () => void;
  onLearningLanguageChange: (language: LearningLanguage) => void;
  onNativeLanguageChange: (language: LearningLanguage) => void;
  onPerformanceProfileChange: (profile: PerformanceProfile) => void;
  practiseReminder: PractiseReminder;
  onToggleDiagnostics: (enabled: boolean) => void;
  showDiagnostics: boolean;
  performanceCapabilities: PerformanceCapabilities;
  performanceProfile: PerformanceProfile;
  user: AuthenticatedUser | null;
}

type OpenPicker = 'native' | 'learning' | null;

/**
 * A grouped list rather than a panel of panels.
 *
 * Settings is the screen a learner opens once and closes. It has to be legible
 * and predictable, not impressive: one surface, one action colour, and section
 * labels a person can read. The screen that earns the decoration in this app is
 * the camera, and it earns it by being the only one that has any.
 */
export function SettingsScreen({
  appearanceMode,
  copy,
  languageSettings,
  onAppearanceModeChange,
  onClose,
  onOpenAccount,
  onLearningLanguageChange,
  onNativeLanguageChange,
  onPerformanceProfileChange,
  onToggleDiagnostics,
  practiseReminder,
  showDiagnostics,
  performanceCapabilities,
  performanceProfile,
  user,
}: SettingsScreenProps) {
  const { height, width } = useWindowDimensions();
  const isLandscape = width > height;
  const nativeLanguage = languageSettings.nativeLanguage;
  const learningLanguage = languageSettings.learningLanguage;
  const [openPicker, setOpenPicker] = useState<OpenPicker>(null);
  const [reminderHour, setReminderHour] = useState(REMINDER_HOURS[2]);
  // Asked once, because the answer is a property of the phone rather than of
  // this screen, and a button leading nowhere is worse than no button.
  const [reminderTargets, setReminderTargets] =
    useState<PractiseReminderCapabilities>({ alarm: false, calendar: false });

  useEffect(() => {
    let isCurrent = true;

    practiseReminder
      .capabilities()
      .then(targets => {
        if (isCurrent) setReminderTargets(targets);
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [practiseReminder]);

  const supportsBothProfiles =
    performanceCapabilities.supportedProfiles.includes('maximum-performance') &&
    performanceCapabilities.supportedProfiles.includes('power-saving');
  const isMaximumPerformance = performanceProfile === 'maximum-performance';

  return (
    <Container>
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
          </Header>

          <Title accessibilityRole="header">{copy.settings.title}</Title>
          <Subtitle>{copy.settings.subtitle}</Subtitle>

          <GroupLabel>{copy.account.title}</GroupLabel>
          <Group>
            <Row
              accessibilityRole="button"
              as={RowButton}
              onPress={onOpenAccount}
              testID="settings-open-account"
              $last
            >
              <RowText>
                {/* Someone who has already signed in is not being asked to
                    sign in again: the row becomes the way back to who they
                    are. */}
                <RowTitle>
                  {user
                    ? user.name ?? copy.account.profile
                    : copy.account.signIn}
                </RowTitle>
                <RowNote>
                  {user
                    ? user.email ?? copy.account.signedInNote
                    : copy.account.benefit}
                </RowNote>
              </RowText>
              <Chevron $open={false}>›</Chevron>
            </Row>
          </Group>

          <GroupLabel>{copy.settings.languagesSection}</GroupLabel>
          <Group>
            <LanguageRow
              flag={languageFlags[nativeLanguage]}
              isOpen={openPicker === 'native'}
              name={copy.languageShortName(nativeLanguage)}
              onSelect={onNativeLanguageChange}
              onToggle={() =>
                setOpenPicker(current =>
                  current === 'native' ? null : 'native',
                )
              }
              selected={nativeLanguage}
              testIDPrefix="native-language"
              title={copy.settings.nativeLanguageTitle}
              shortName={copy.languageShortName}
            />
            <LanguageRow
              flag={languageFlags[learningLanguage]}
              isOpen={openPicker === 'learning'}
              name={copy.languageShortName(learningLanguage)}
              onSelect={onLearningLanguageChange}
              onToggle={() =>
                setOpenPicker(current =>
                  current === 'learning' ? null : 'learning',
                )
              }
              selected={learningLanguage}
              testIDPrefix="learning-language"
              title={copy.settings.learningLanguageTitle}
              shortName={copy.languageShortName}
            />
          </Group>

          <GroupLabel>{copy.settings.appearanceSection}</GroupLabel>
          <Segmented>
            {appearanceModes.map(mode => {
              const selected = appearanceMode === mode;

              return (
                <Segment
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={mode}
                  onPress={() => onAppearanceModeChange(mode)}
                  testID={`appearance-${mode}`}
                  $selected={selected}
                >
                  <SegmentLabel $selected={selected}>
                    {mode === 'dark'
                      ? copy.settings.darkMode
                      : copy.settings.lightMode}
                  </SegmentLabel>
                </Segment>
              );
            })}
          </Segmented>

          <GroupLabel>{copy.settings.reminderSection}</GroupLabel>
          <Group>
            <Row $last>
              <RowText>
                <RowNote>
                  {reminderTargets.alarm || reminderTargets.calendar
                    ? copy.settings.reminderNote
                    : copy.settings.reminderUnavailable}
                </RowNote>
                {reminderTargets.alarm || reminderTargets.calendar ? (
                  <>
                    <Segmented>
                      {REMINDER_HOURS.map(hour => {
                        const selected = reminderHour === hour;

                        return (
                          <Segment
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selected }}
                            key={hour}
                            onPress={() => setReminderHour(hour)}
                            testID={`reminder-hour-${hour}`}
                            $selected={selected}
                          >
                            <SegmentLabel $selected={selected}>
                              {`${String(hour).padStart(2, '0')}:00`}
                            </SegmentLabel>
                          </Segment>
                        );
                      })}
                    </Segmented>
                    <ReminderActions>
                      {reminderTargets.alarm ? (
                        <ReminderButton
                          accessibilityRole="button"
                          onPress={() =>
                            practiseReminder
                              .scheduleAlarm(
                                reminderHour,
                                0,
                                copy.settings.reminderTitle,
                              )
                              .catch(() => undefined)
                          }
                          testID="reminder-alarm"
                        >
                          <ReminderButtonText>
                            {copy.settings.reminderAlarm}
                          </ReminderButtonText>
                        </ReminderButton>
                      ) : null}
                      {reminderTargets.calendar ? (
                        <ReminderButton
                          accessibilityRole="button"
                          onPress={() =>
                            practiseReminder
                              .scheduleCalendarEvent(
                                reminderHour,
                                0,
                                copy.settings.reminderTitle,
                                copy.settings.reminderDetail,
                              )
                              .catch(() => undefined)
                          }
                          testID="reminder-calendar"
                        >
                          <ReminderButtonText>
                            {copy.settings.reminderCalendar}
                          </ReminderButtonText>
                        </ReminderButton>
                      ) : null}
                    </ReminderActions>
                  </>
                ) : null}
              </RowText>
            </Row>
          </Group>

          <GroupLabel>{copy.settings.performanceSection}</GroupLabel>
          <Group>
            {supportsBothProfiles ? (
              <Row $last={!DIAGNOSTICS_ENABLED}>
                <RowText>
                  <RowTitle>{copy.settings.maximumPerformanceTitle}</RowTitle>
                  {/* An option is chosen by what it costs, not by its name. */}
                  <RowNote>
                    {copy.settings.coresNote(
                      performanceCapabilities.maximumCpuWorkerCount,
                    )}
                  </RowNote>
                </RowText>
                <Switch
                  accessibilityRole="switch"
                  accessibilityState={{ checked: isMaximumPerformance }}
                  onPress={() =>
                    onPerformanceProfileChange(
                      isMaximumPerformance
                        ? 'power-saving'
                        : 'maximum-performance',
                    )
                  }
                  testID="performance-profile-toggle"
                  $on={isMaximumPerformance}
                >
                  <SwitchKnob $on={isMaximumPerformance} />
                </Switch>
              </Row>
            ) : null}

            {DIAGNOSTICS_ENABLED ? (
              <Row $last>
                <RowText>
                  <RowTitle>{copy.settings.diagnosticsTitle}</RowTitle>
                  <RowNote>{copy.settings.diagnosticsDescription}</RowNote>
                </RowText>
                <Switch
                  accessibilityRole="switch"
                  accessibilityState={{ checked: showDiagnostics }}
                  onPress={() => onToggleDiagnostics(!showDiagnostics)}
                  testID="settings-toggle-diagnostics"
                  $on={showDiagnostics}
                >
                  <SwitchKnob $on={showDiagnostics} />
                </Switch>
              </Row>
            ) : null}
          </Group>

          <VersionText testID="settings-app-version">
            {copy.settings.version(APP_VERSION)}
          </VersionText>
        </Content>
      </SettingsSafeArea>
    </Container>
  );
}

/**
 * One language, shown as a row with its flag. Tapping it opens the choices
 * underneath rather than pushing a screen, so the setting and its options are
 * read in one place.
 */
function LanguageRow({
  flag,
  isOpen,
  name,
  onSelect,
  onToggle,
  selected,
  shortName,
  testIDPrefix,
  title,
}: {
  flag: string;
  isOpen: boolean;
  name: string;
  onSelect: (language: LearningLanguage) => void;
  onToggle: () => void;
  selected: LearningLanguage;
  shortName: (language: LearningLanguage) => string;
  testIDPrefix: string;
  title: string;
}) {
  return (
    <>
      <Row
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        as={RowButton}
        onPress={onToggle}
        testID={`${testIDPrefix}-row`}
      >
        <RowText>
          <RowTitle>{title}</RowTitle>
        </RowText>
        <RowValue>
          <RowFlag>{flag}</RowFlag>
          <RowValueText numberOfLines={1}>{name}</RowValueText>
        </RowValue>
        <Chevron $open={isOpen}>›</Chevron>
      </Row>

      {isOpen ? (
        <Options>
          {learningLanguages.map(language => (
            <Option
              accessibilityRole="radio"
              accessibilityState={{ checked: selected === language }}
              key={language}
              onPress={() => onSelect(language)}
              testID={`${testIDPrefix}-${language}`}
              $selected={selected === language}
            >
              <RowFlag>{languageFlags[language]}</RowFlag>
              <OptionText numberOfLines={1} $selected={selected === language}>
                {shortName(language)}
              </OptionText>
            </Option>
          ))}
        </Options>
      ) : null}
    </>
  );
}

/** Times a practice session actually happens: after breakfast, at lunch, after
 * work, before bed. A free-form picker would be a dependency and a decision. */
const REMINDER_HOURS: readonly number[] = [8, 12, 19, 21];

const ReminderActions = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const ReminderButton = styled.Pressable`
  padding: 9px 14px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  background-color: ${({ theme }) => theme.colors.cardElevated};
`;

const ReminderButtonText = styled.Text`
  color: ${({ theme }) => theme.colors.accentText};
  font-size: 13px;
  font-weight: 700;
`;

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
      paddingBottom: $landscape ? 36 : 184,
      paddingHorizontal: 20,
      paddingRight: $landscape ? 176 : 20,
      paddingTop: 12,
    },
  }),
)<{ $landscape: boolean }>``;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  padding-bottom: 10px;
`;

const BackButton = styled.Pressable`
  width: 34px;
  height: 34px;
  margin-left: -6px;
  align-items: center;
  justify-content: center;
`;

const BackChevron = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 30px;
  line-height: 34px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 31px;
  line-height: 36px;
  font-weight: 800;
  letter-spacing: -0.6px;
`;

const Subtitle = styled.Text`
  margin-top: 6px;
  margin-bottom: 26px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
  line-height: 20px;
`;

/** Sentence case, ordinary size. Ten-pixel capitals with wide tracking are
 * harder to read than the words they label. */
const GroupLabel = styled.Text`
  margin: 0px 0px 8px 2px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
  font-weight: 600;
`;

/** The single surface treatment on this screen: a solid card with a hairline
 * border. No glass, no glow, no elevation. */
const Group = styled.View`
  margin-bottom: 26px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const Row = styled.View<{ $last?: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 14px 14px;
  border-bottom-width: ${({ $last }) => ($last ? 0 : 1)}px;
  border-bottom-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const RowButton = styled.Pressable``;

const RowText = styled.View`
  flex: 1;
  min-width: 0px;
`;

const RowTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 15px;
  font-weight: 600;
`;

const RowNote = styled.Text`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  line-height: 17px;
`;

const RowValue = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 7px;
  max-width: 55%;
`;

const RowFlag = styled.Text`
  font-size: 16px;
`;

const RowValueText = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
`;

const Chevron = styled.Text<{ $open: boolean }>`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 18px;
  transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
`;

const Options = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  /* The choices are a step below the row that opened them, not a second line
     of it. */
  padding: 12px 14px 16px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const Option = styled.Pressable<{ $selected: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.accent : theme.colors.borderSubtle};
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.accent : 'transparent'};
`;

const OptionText = styled.Text<{ $selected: boolean }>`
  color: ${({ theme, $selected }) =>
    $selected ? '#ffffff' : theme.colors.text};
  font-size: 13px;
  font-weight: 600;
`;

const Segmented = styled.View`
  flex-direction: row;
  gap: 4px;
  margin-bottom: 26px;
  padding: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const Segment = styled.Pressable<{ $selected: boolean }>`
  flex: 1;
  padding: 10px 6px;
  border-radius: 10px;
  align-items: center;
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.accent : 'transparent'};
`;

const SegmentLabel = styled.Text<{ $selected: boolean }>`
  color: ${({ theme, $selected }) =>
    $selected ? '#ffffff' : theme.colors.muted};
  font-size: 13.5px;
  font-weight: 600;
`;

const Switch = styled.Pressable<{ $on: boolean }>`
  width: 46px;
  height: 28px;
  padding: 3px;
  border-radius: 999px;
  justify-content: center;
  background-color: ${({ theme, $on }) =>
    $on ? theme.colors.accent : theme.colors.borderSubtle};
`;

const SwitchKnob = styled.View<{ $on: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 11px;
  background-color: #ffffff;
  margin-left: ${({ $on }) => ($on ? 18 : 0)}px;
`;

const VersionText = styled.Text`
  margin-top: -8px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  text-align: center;
`;
