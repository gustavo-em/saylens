import type { ReactNode } from 'react';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import styled, { useTheme } from 'styled-components/native';

import type { VocabularyRepository } from '../../features/learning/application/ports/VocabularyRepository';
import {
  languageBase,
  languageBaseFlags,
  languageFlags,
  type LanguageBase,
  type LearningLanguageSettings,
} from '../../features/learning/domain/LearningLanguage';
import { describeDivergence } from '../../features/learning/domain/PronunciationAttempt';
import type { LearningCopy } from '../../features/learning/presentation/localization/learningCopy';
import { AppMark } from './AppMark';

/**
 * The pictures the first run shows: each step's screen, drawn at a fixed size
 * with the app's own theme, words and flags rather than pasted in as an image.
 *
 * A screenshot goes stale the day a screen changes, and it can only ever be in
 * one language and one theme. These are the same components' shapes at a
 * smaller size, so a print always shows what the learner is about to open.
 */
export const PRINT_WIDTH = 232;
export const PRINT_HEIGHT = 470;

export interface PrintProps {
  copy: LearningCopy;
  languageSettings: LearningLanguageSettings;
  vocabularyRepository: VocabularyRepository;
}

/** What a slip sounds like, per language, so the speak print can point at the
 * syllable that parted rather than invent a percentage. */
const misheardBottle: Record<LanguageBase, string> = {
  'pt-BR': 'Garrada',
  en: 'Bodle',
  es: 'Bodella',
};

/** The four shapes their brand guidance asks for on a sign-in button. */
export function GoogleMark({ size = 12 }: { size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 48 48" width={size}>
      <Path
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1Z"
        fill="#4285F4"
      />
      <Path
        d="M24 46c6 0 11-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.4v5.7C7.9 41 15.4 46 24 46Z"
        fill="#34A853"
      />
      <Path
        d="M11.7 28.1c-.4-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.4A22 22 0 0 0 2 24c0 3.6.9 6.9 2.4 9.8l7.3-5.7Z"
        fill="#FBBC05"
      />
      <Path
        d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C35 4.2 30 2 24 2 15.4 2 7.9 7 4.4 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.3-9.1Z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function SpeakerIcon({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M4 9.5h3.5L12 6v12L7.5 14.5H4Z" fill={color} />
      <Path
        d="M15.5 9a4 4 0 0 1 0 6"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function MicIcon({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
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

function ListIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M4 7h16M4 12h16M4 17h10"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function GearIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Circle
        cx={12}
        cy={12}
        fill="none"
        r={3.2}
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

/**
 * The phone the prints are shown in. The picture is drawn at one size and
 * scaled to whatever room the step has, so every step lines up whatever the
 * screen it is running on.
 */
export function PrintFrame({
  children,
  scale,
}: {
  children: ReactNode;
  scale: number;
}) {
  return (
    <Slot
      pointerEvents="none"
      style={{ width: PRINT_WIDTH * scale, height: PRINT_HEIGHT * scale }}
    >
      <Shell
        style={{
          left: (PRINT_WIDTH * scale - PRINT_WIDTH) / 2,
          top: (PRINT_HEIGHT * scale - PRINT_HEIGHT) / 2,
          transform: [{ scale }],
        }}
      >
        <Screen>{children}</Screen>
      </Shell>
    </Slot>
  );
}

/** The room behind the card: a wall, a desk, a lamp and the laptop the card is
 * naming. Painted rather than photographed, because a print that ships in the
 * bundle should not weigh half a megabyte. */
function CameraScene() {
  return (
    <SceneLayer
      height="100%"
      // The scene fills the screen it is painted on rather than the size it
      // was drawn at, so the room reaches the rounded corners.
      preserveAspectRatio="none"
      viewBox={`0 0 ${PRINT_WIDTH} ${PRINT_HEIGHT}`}
      width="100%"
    >
      <Defs>
        <LinearGradient id="wall" x1="0" x2="0.7" y1="0" y2="1">
          <Stop offset="0" stopColor="#4B4238" />
          <Stop offset="0.55" stopColor="#2B2620" />
          <Stop offset="1" stopColor="#17140F" />
        </LinearGradient>
        <LinearGradient id="desk" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#6B5A46" />
          <Stop offset="0.45" stopColor="#46392C" />
          <Stop offset="1" stopColor="#2A2119" />
        </LinearGradient>
      </Defs>
      <Rect
        fill="url(#wall)"
        height={PRINT_HEIGHT}
        width={PRINT_WIDTH}
        x={0}
        y={0}
      />
      <Circle cx={16} cy={62} fill="rgba(255, 226, 168, 0.10)" r={86} />
      <Rect fill="url(#desk)" height={226} width={PRINT_WIDTH} x={0} y={244} />
      <Path d="M58 262 L184 252 L196 350 L42 366 Z" fill="#1B1E24" />
      <Path d="M66 270 L177 261 L187 344 L52 358 Z" fill="#2E3A4C" />
      <Path d="M42 366 L196 350 L218 396 L26 416 Z" fill="#23262C" />
      <Path d="M96 372 L172 364 L178 382 L88 391 Z" fill="#181A1F" />
    </SceneLayer>
  );
}

/** The camera screen: one object named by a card, the language pair at the top
 * and the two places a thumb goes at the bottom. */
export function CameraPrint({
  copy,
  languageSettings,
  vocabularyRepository,
}: PrintProps) {
  const theme = useTheme();
  const vocabulary = vocabularyRepository.findByLabel(
    'laptop',
    languageSettings,
  );

  return (
    <CameraRoot>
      <CameraScene />

      <TargetFrame>
        <Corner $bottom={false} $right={false} />
        <Corner $bottom={false} $right />
        <Corner $bottom $right={false} />
        <Corner $bottom $right />
      </TargetFrame>

      <CameraTop>
        <MarkSlot>
          <AppMark height={26} width={26} />
        </MarkSlot>
        <LanguagePill>
          <PillFlag>{languageFlags[languageSettings.nativeLanguage]}</PillFlag>
          <PillArrow>→</PillArrow>
          <PillFlag>
            {languageFlags[languageSettings.learningLanguage]}
          </PillFlag>
        </LanguagePill>
        <FreezeButton>
          <PauseBar />
          <PauseBar />
        </FreezeButton>
      </CameraTop>

      <ObjectCard>
        <CardWordRow>
          <CardWord numberOfLines={1}>{vocabulary.word}</CardWord>
          <SpeakerIcon color={theme.colors.overlayInk} size={9} />
        </CardWordRow>
        <CardTranslations>
          {vocabulary.translations.map((translation, index) => (
            <CardTranslationGroup key={translation.word}>
              {index > 0 ? <CardDot>•</CardDot> : null}
              <CardFlag>{languageBaseFlags[translation.language]}</CardFlag>
              <CardTranslation numberOfLines={1} $secondary={index > 0}>
                {translation.word}
              </CardTranslation>
            </CardTranslationGroup>
          ))}
        </CardTranslations>
        <CardExample numberOfLines={2}>{vocabulary.example}</CardExample>
        <CardRule />
        <CardPronunciation numberOfLines={1}>
          {vocabulary.pronunciation}
        </CardPronunciation>
        <CardAction>
          <MicIcon color="#ffffff" size={9} />
          <CardActionText>{copy.camera.practise}</CardActionText>
        </CardAction>
      </ObjectCard>

      <CameraBar>
        <BarItem>
          <ListIcon color="#ffffff" size={13} />
          <BarLabel numberOfLines={1}>{copy.history.title}</BarLabel>
        </BarItem>
        <BarItem>
          <GearIcon color="#ffffff" size={13} />
          <BarLabel numberOfLines={1}>{copy.tabs.settings}</BarLabel>
        </BarItem>
      </CameraBar>
    </CameraRoot>
  );
}

/** The speak screen after an attempt: the syllable that parted marked in the
 * word and in what was heard, which is the whole point of the screen. */
export function SpeakPrint({
  copy,
  languageSettings,
  vocabularyRepository,
}: PrintProps) {
  const theme = useTheme();
  const vocabulary = vocabularyRepository.findByLabel(
    'bottle',
    languageSettings,
  );
  const heard = misheardBottle[languageBase(languageSettings.learningLanguage)];
  const divergence = describeDivergence(vocabulary.word, heard);

  return (
    <PlainRoot>
      <PlainHeader>
        <Chevron>‹</Chevron>
      </PlainHeader>

      <SpeakStage>
        <SpeakWord numberOfLines={1}>
          {divergence == null ? (
            vocabulary.word
          ) : (
            <>
              {divergence.expected.before}
              <Missed>{divergence.expected.wrong}</Missed>
              {divergence.expected.after}
            </>
          )}
        </SpeakWord>
        <SpeakIpa numberOfLines={1}>{vocabulary.pronunciation}</SpeakIpa>
        <SyllableChip>
          <SyllableText>{vocabulary.pronunciationHint}</SyllableText>
        </SyllableChip>
        <SpeakMeaning numberOfLines={1}>{vocabulary.meaning}</SpeakMeaning>

        <HeardBox>
          <HeardLabel>{copy.speak.heardLabel}</HeardLabel>
          <HeardWord numberOfLines={1}>
            {divergence == null ? (
              heard
            ) : (
              <>
                {divergence.heard.before}
                <Missed>{divergence.heard.wrong}</Missed>
                {divergence.heard.after}
              </>
            )}
          </HeardWord>
          <HeardGuide numberOfLines={2}>
            {copy.speak.guide(vocabulary.pronunciationHint)}
          </HeardGuide>
        </HeardBox>

        <Wave>
          {[7, 13, 21, 16, 26, 12, 19, 9, 15, 6].map((height, index) => (
            <WaveBar key={`${height}-${index}`} $height={height} />
          ))}
        </Wave>
      </SpeakStage>

      <SpeakStatus numberOfLines={1}>{copy.speak.idle}</SpeakStatus>

      <SpeakActions>
        <GhostCircle>
          <SpeakerIcon color={theme.colors.text} size={13} />
        </GhostCircle>
        <MicCircle>
          <MicIcon color="#ffffff" size={20} />
        </MicCircle>
        <GhostCircle>
          <ListIcon color={theme.colors.text} size={13} />
        </GhostCircle>
      </SpeakActions>
    </PlainRoot>
  );
}

/** The words screen: the count a learner is proud of, what the list owes today
 * and the words themselves. */
export function WordsPrint({
  copy,
  languageSettings,
  vocabularyRepository,
}: PrintProps) {
  const rows = [
    { label: 'laptop', status: 'matched' as const, when: copy.history.justNow },
    {
      label: 'keyboard',
      status: 'missed' as const,
      when: copy.history.minutesAgo(12),
    },
    {
      label: 'mouse',
      status: 'untried' as const,
      when: copy.history.hoursAgo(1),
    },
    {
      label: 'chair',
      status: 'untried' as const,
      when: copy.history.daysAgo(1),
    },
    { label: 'tv', status: 'matched' as const, when: copy.history.daysAgo(1) },
    {
      label: 'book',
      status: 'untried' as const,
      when: copy.history.daysAgo(2),
    },
  ];
  const filters: { label: string; count: number }[] = [
    { label: copy.history.filterAll, count: 12 },
    { label: copy.history.filterMatched, count: 5 },
    { label: copy.history.filterUntried, count: 6 },
  ];

  return (
    <PlainRoot>
      <PlainHeader>
        <Chevron>‹</Chevron>
        <HeaderSpacer />
        <TrophyButton>
          <Trophy>🏆</Trophy>
        </TrophyButton>
        <PractisePill>
          <PractisePillText>{copy.quiz.start}</PractisePillText>
        </PractisePill>
      </PlainHeader>

      <CountRow>
        <CountValue>12</CountValue>
        <CountLabel numberOfLines={1}>
          {' '}
          {copy.history.countLabel(12)}
        </CountLabel>
      </CountRow>

      <FilterRow>
        {filters.map((filter, index) => (
          <FilterChip key={filter.label} $active={index === 0}>
            <FilterText $active={index === 0}>{filter.label}</FilterText>
            <FilterCount $active={index === 0}>{filter.count}</FilterCount>
          </FilterChip>
        ))}
      </FilterRow>

      <Progress>
        <ProgressItem>
          <ProgressValue>4</ProgressValue>
          <ProgressLabel numberOfLines={1}>
            {copy.history.levelLabel}
          </ProgressLabel>
          <LevelTrack>
            <LevelFill />
          </LevelTrack>
        </ProgressItem>
        <ProgressDivider />
        <ProgressItem>
          <ProgressValue>3</ProgressValue>
          <ProgressLabel numberOfLines={1}>
            {copy.history.streakLabel}
          </ProgressLabel>
          <StreakWeek>
            {[true, true, true, false, false, false, false].map((on, index) => (
              <StreakDay key={index} $on={on} />
            ))}
          </StreakWeek>
        </ProgressItem>
      </Progress>

      <DueBand>
        <DueText>
          <DueTitle numberOfLines={1}>{copy.history.dueTitle(6)}</DueTitle>
          <DueNote numberOfLines={1}>{copy.history.dueNote}</DueNote>
        </DueText>
        <DueAction>
          <DueActionText>{copy.history.dueAction}</DueActionText>
        </DueAction>
      </DueBand>

      {rows.map(row => {
        const vocabulary = vocabularyRepository.findByLabel(
          row.label,
          languageSettings,
        );

        return (
          <WordRow key={row.label}>
            <StatusDot $status={row.status} />
            <WordText>
              <Word numberOfLines={1}>{vocabulary.word}</Word>
              <WordMeaning numberOfLines={1}>{vocabulary.meaning}</WordMeaning>
            </WordText>
            <WordWhen numberOfLines={1}>{row.when}</WordWhen>
            <Star>☆</Star>
          </WordRow>
        );
      })}
    </PlainRoot>
  );
}

const SceneLayer = styled(Svg)`
  position: absolute;
  inset: 0px;
`;

/** The sign-in screen, which is the only step that asks for something rather
 * than showing something. */
export function AccountPrint({ copy }: PrintProps) {
  return (
    <PlainRoot>
      <PlainHeader>
        <Chevron>‹</Chevron>
      </PlainHeader>

      <AccountStage>
        <AccountMark>
          <AppMark height={40} width={40} />
        </AccountMark>
        <AccountTitle numberOfLines={1}>{copy.account.title}</AccountTitle>
        <AccountSubtitle numberOfLines={2}>
          {copy.account.subtitle}
        </AccountSubtitle>
        <AccountBenefit numberOfLines={2}>
          {copy.account.benefit}
        </AccountBenefit>
      </AccountStage>

      <AccountActions>
        <GoogleButton>
          <GoogleMark size={12} />
          <GoogleText numberOfLines={1}>{copy.account.google}</GoogleText>
        </GoogleButton>
        <LaterText>{copy.account.later}</LaterText>
      </AccountActions>
    </PlainRoot>
  );
}

const Slot = styled.View`
  align-items: center;
  justify-content: center;
`;

const Shell = styled.View`
  position: absolute;
  width: ${PRINT_WIDTH}px;
  height: ${PRINT_HEIGHT}px;
  padding: 4px;
  border-radius: 30px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.cardElevated};
  elevation: 12;
  shadow-color: #000000;
  shadow-opacity: 0.3;
  shadow-radius: 22px;
  shadow-offset: 0px 14px;
`;

const Screen = styled.View`
  flex: 1;
  overflow: hidden;
  border-radius: 26px;
  background-color: ${({ theme }) => theme.colors.background};
`;

/* ---------- camera ---------- */

const CameraRoot = styled.View`
  flex: 1;
  background-color: #17140f;
`;

const TargetFrame = styled.View`
  position: absolute;
  left: 26px;
  top: 244px;
  width: 182px;
  height: 158px;
`;

const Corner = styled.View<{ $bottom: boolean; $right: boolean }>`
  position: absolute;
  width: 14px;
  height: 14px;
  ${({ $bottom }) => ($bottom ? 'bottom: 0px;' : 'top: 0px;')}
  ${({ $right }) => ($right ? 'right: 0px;' : 'left: 0px;')}
  border-color: rgba(255, 255, 255, 0.9);
  border-top-width: ${({ $bottom }) => ($bottom ? 0 : 2)}px;
  border-bottom-width: ${({ $bottom }) => ($bottom ? 2 : 0)}px;
  border-left-width: ${({ $right }) => ($right ? 0 : 2)}px;
  border-right-width: ${({ $right }) => ($right ? 2 : 0)}px;
`;

const CameraTop = styled.View`
  position: absolute;
  left: 12px;
  right: 12px;
  top: 12px;
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

const MarkSlot = styled.View`
  width: 26px;
  height: 26px;
  overflow: hidden;
  border-radius: 8px;
`;

const LanguagePill = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.overlayGlassBorder};
  background-color: ${({ theme }) => theme.colors.overlayGlass};
`;

const PillFlag = styled.Text`
  font-size: 10px;
  line-height: 14px;
`;

const PillArrow = styled.Text`
  color: rgba(255, 255, 255, 0.7);
  font-size: 8px;
  line-height: 14px;
`;

const FreezeButton = styled.View`
  margin-left: auto;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.overlayGlassBorder};
  background-color: ${({ theme }) => theme.colors.overlayGlass};
`;

const PauseBar = styled.View`
  width: 2px;
  height: 8px;
  border-radius: 1px;
  background-color: rgba(255, 255, 255, 0.85);
`;

const ObjectCard = styled.View`
  position: absolute;
  left: 14px;
  top: 62px;
  width: 168px;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.overlayCardBorder};
  background-color: ${({ theme }) => theme.colors.overlayCard};
  elevation: 10;
  shadow-color: #000000;
  shadow-opacity: 0.32;
  shadow-radius: 12px;
  shadow-offset: 4px 8px;
`;

const CardWordRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 5px;
`;

const CardWord = styled.Text`
  color: ${({ theme }) => theme.colors.overlayInk};
  font-size: 15px;
  line-height: 19px;
  font-weight: 700;
`;

const CardTranslations = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 1px;
`;

const CardTranslationGroup = styled.View`
  flex-direction: row;
  align-items: center;
`;

const CardFlag = styled.Text`
  margin-right: 3px;
  font-size: 8px;
  line-height: 13px;
`;

const CardTranslation = styled.Text<{ $secondary: boolean }>`
  color: ${({ theme, $secondary }) =>
    $secondary
      ? theme.colors.translationSecondary
      : theme.colors.translationPrimary};
  font-size: 10px;
  line-height: 14px;
  font-weight: 600;
`;

const CardDot = styled.Text`
  margin: 0px 4px;
  color: ${({ theme }) => theme.colors.overlayMuted};
  font-size: 10px;
  line-height: 14px;
`;

const CardExample = styled.Text`
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.overlayInk};
  font-size: 9px;
  line-height: 13px;
  font-style: italic;
`;

const CardRule = styled.View`
  height: 1px;
  margin: 7px 0px;
  background-color: ${({ theme }) => theme.colors.overlayRule};
`;

const CardPronunciation = styled.Text`
  color: ${({ theme }) => theme.colors.overlayMuted};
  font-size: 8px;
  line-height: 11px;
`;

const CardAction = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 3px;
  margin-top: 8px;
  padding: 6px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.overlayAction};
`;

const CardActionText = styled.Text`
  color: #ffffff;
  font-size: 8px;
  line-height: 11px;
  font-weight: 800;
`;

const CameraBar = styled.View`
  position: absolute;
  left: 0px;
  right: 0px;
  bottom: 12px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 34px;
`;

const BarItem = styled.View`
  align-items: center;
  gap: 2px;
  max-width: 84px;
`;

const BarLabel = styled.Text`
  color: #ffffff;
  font-size: 8px;
  line-height: 11px;
  font-weight: 600;
`;

/* ---------- shared for the two quiet screens ---------- */

const PlainRoot = styled.View`
  flex: 1;
  padding: 12px 12px 14px;
  background-color: ${({ theme }) => theme.colors.background};
`;

const PlainHeader = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  height: 22px;
`;

const Chevron = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 18px;
  line-height: 22px;
`;

const HeaderSpacer = styled.View`
  flex: 1;
`;

/* ---------- speak ---------- */

const SpeakStage = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
`;

const SpeakWord = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 28px;
  line-height: 34px;
  font-weight: 800;
  letter-spacing: -0.6px;
`;

const Missed = styled.Text`
  color: ${({ theme }) => theme.colors.danger};
`;

const SpeakIpa = styled.Text`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 10px;
  line-height: 14px;
`;

const SyllableChip = styled.View`
  margin-top: 6px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
`;

const SyllableText = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: 9px;
  line-height: 12px;
  font-weight: 700;
`;

const SpeakMeaning = styled.Text`
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  line-height: 15px;
`;

const HeardBox = styled.View`
  align-self: stretch;
  margin-top: 16px;
  padding: 9px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  align-items: center;
`;

const HeardLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 8px;
  line-height: 11px;
`;

const HeardWord = styled.Text`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 13px;
  line-height: 17px;
  font-weight: 700;
`;

const HeardGuide = styled.Text`
  margin-top: 5px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 8.5px;
  line-height: 12px;
  text-align: center;
`;

const Wave = styled.View`
  flex-direction: row;
  align-items: flex-end;
  gap: 3px;
  height: 26px;
  margin-top: 16px;
`;

const WaveBar = styled.View<{ $height: number }>`
  width: 3px;
  height: ${({ $height }) => $height}px;
  border-radius: 2px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const SpeakStatus = styled.Text`
  margin-bottom: 12px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 9px;
  line-height: 12px;
  text-align: center;
`;

const SpeakActions = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 16px;
`;

const GhostCircle = styled.View`
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const MicCircle = styled.View`
  width: 46px;
  height: 46px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

/* ---------- words ---------- */

const TrophyButton = styled.View`
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
`;

const Trophy = styled.Text`
  font-size: 10px;
  line-height: 14px;
`;

const PractisePill = styled.View`
  padding: 5px 10px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const PractisePillText = styled.Text`
  color: #ffffff;
  font-size: 9px;
  line-height: 12px;
  font-weight: 700;
`;

const CountRow = styled.View`
  flex-direction: row;
  align-items: baseline;
  margin-top: 10px;
`;

const CountValue = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 30px;
  line-height: 34px;
  font-weight: 800;
  letter-spacing: -0.8px;
`;

const CountLabel = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 9.5px;
  line-height: 13px;
`;

const FilterRow = styled.View`
  flex-direction: row;
  gap: 4px;
  margin-top: 10px;
`;

const FilterChip = styled.View<{ $active: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.text : theme.colors.borderSubtle};
  background-color: ${({ theme, $active }) =>
    $active ? theme.colors.text : 'transparent'};
`;

const FilterText = styled.Text<{ $active: boolean }>`
  color: ${({ theme, $active }) =>
    $active ? theme.colors.background : theme.colors.muted};
  font-size: 8.5px;
  line-height: 11px;
  font-weight: 600;
`;

const FilterCount = styled.Text<{ $active: boolean }>`
  color: ${({ theme, $active }) =>
    $active ? theme.colors.background : theme.colors.muted};
  font-size: 8.5px;
  line-height: 11px;
  font-weight: 700;
  opacity: 0.7;
`;

const Progress = styled.View`
  flex-direction: row;
  align-items: stretch;
  margin-top: 14px;
`;

const ProgressItem = styled.View`
  flex: 1;
`;

const ProgressValue = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 17px;
  line-height: 21px;
  font-weight: 800;
`;

const ProgressLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 8.5px;
  line-height: 11px;
`;

const ProgressDivider = styled.View`
  width: 1px;
  margin: 0px 12px;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const LevelTrack = styled.View`
  height: 3px;
  margin-top: 6px;
  margin-right: 6px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const LevelFill = styled.View`
  width: 62%;
  height: 3px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const StreakWeek = styled.View`
  flex-direction: row;
  gap: 3px;
  margin-top: 6px;
`;

const StreakDay = styled.View<{ $on: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background-color: ${({ theme, $on }) =>
    $on ? theme.colors.accent : theme.colors.borderSubtle};
`;

const DueBand = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 8px 9px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.accent};
  background-color: ${({ theme }) => theme.colors.glassBlue};
`;

const DueText = styled.View`
  flex: 1;
`;

const DueTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 9.5px;
  line-height: 13px;
  font-weight: 700;
`;

const DueNote = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 8px;
  line-height: 11px;
`;

const DueAction = styled.View`
  padding: 4px 9px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const DueActionText = styled.Text`
  color: #ffffff;
  font-size: 8px;
  line-height: 11px;
  font-weight: 700;
`;

const WordRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 7px;
  padding: 8px 0px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const StatusDot = styled.View<{ $status: 'matched' | 'missed' | 'untried' }>`
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background-color: ${({ theme, $status }) =>
    $status === 'matched'
      ? theme.colors.success
      : $status === 'missed'
      ? theme.colors.danger
      : theme.colors.border};
`;

const WordText = styled.View`
  flex: 1;
`;

const Word = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 11px;
  line-height: 15px;
  font-weight: 700;
`;

const WordMeaning = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 9px;
  line-height: 12px;
`;

const WordWhen = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 8px;
  line-height: 11px;
`;

const Star = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
  line-height: 14px;
`;

/* ---------- account ---------- */

const AccountStage = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
`;

const AccountMark = styled.View`
  width: 40px;
  height: 40px;
  margin-bottom: 10px;
  overflow: hidden;
  border-radius: 10px;
`;

const AccountTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 19px;
  line-height: 23px;
  font-weight: 800;
  letter-spacing: -0.4px;
`;

const AccountSubtitle = styled.Text`
  max-width: 180px;
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 9.5px;
  line-height: 13px;
  text-align: center;
`;

const AccountBenefit = styled.Text`
  max-width: 176px;
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: 8.5px;
  line-height: 12px;
  text-align: center;
`;

const AccountActions = styled.View`
  gap: 4px;
  padding-bottom: 12px;
`;

/** White with the Google mark, which is what their brand guidance asks of a
 * sign-in button. */
const GoogleButton = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 11px;
  border-radius: 10px;
  background-color: #ffffff;
`;

const GoogleText = styled.Text`
  color: #1f1f1f;
  font-size: 9.5px;
  line-height: 13px;
  font-weight: 700;
`;

const LaterText = styled.Text`
  padding: 7px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 8.5px;
  line-height: 12px;
  font-weight: 600;
  text-align: center;
`;
