import type { ReactNode } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
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

/**
 * The room behind the card: a wall out of focus, a table in the light, and the
 * plant the card is naming.
 *
 * Painted rather than photographed. A photograph of a table would weigh half a
 * megabyte in the bundle, could only ever show one room, and would date the
 * moment the card above it changed.
 */
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
        <LinearGradient id="wall" x1="0" x2="0.35" y1="0" y2="1">
          <Stop offset="0" stopColor="#F3EBDE" />
          <Stop offset="0.6" stopColor="#E2D3BC" />
          <Stop offset="1" stopColor="#D2BFA3" />
        </LinearGradient>
        <LinearGradient id="wood" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#D0A469" />
          <Stop offset="0.45" stopColor="#B4854B" />
          <Stop offset="1" stopColor="#8A6234" />
        </LinearGradient>
        <LinearGradient id="pot" x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor="#E5C69D" />
          <Stop offset="0.55" stopColor="#C79C6D" />
          <Stop offset="1" stopColor="#A2784B" />
        </LinearGradient>
        {/* Where the wall stops being in focus and the table begins. */}
        <LinearGradient id="haze" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#D8C6A9" stopOpacity="0" />
          <Stop offset="1" stopColor="#B98F58" stopOpacity="0.5" />
        </LinearGradient>
        {/* Light from the window pools on the table and fades, rather than
            ending at an edge. */}
        <RadialGradient cx="50%" cy="50%" id="pool" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#FFE9C4" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#FFE9C4" stopOpacity="0" />
        </RadialGradient>
        {/* A lens darkens what it does not point at. */}
        <RadialGradient cx="50%" cy="44%" id="vignette" rx="70%" ry="60%">
          <Stop offset="0.55" stopColor="#000000" stopOpacity="0" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0.34" />
        </RadialGradient>
      </Defs>

      <Rect fill="url(#wall)" height={318} width={PRINT_WIDTH} x={0} y={0} />
      {/* A window off to the left, and furniture too far away to resolve. */}
      <Ellipse cx={30} cy={62} fill="#FFFCF4" opacity={0.55} rx={88} ry={104} />
      <Ellipse cx={206} cy={92} fill="#CBB89B" opacity={0.5} rx={44} ry={58} />
      <Rect
        fill="#B49470"
        height={186}
        opacity={0.34}
        rx={28}
        width={78}
        x={172}
        y={132}
      />
      <Rect fill="url(#haze)" height={70} width={PRINT_WIDTH} x={0} y={248} />

      {/* The table, seen from just above its edge. */}
      <Path d="M0 318Q116 292 232 312L232 470L0 470Z" fill="url(#wood)" />
      <Path
        d="M0 346Q116 322 232 340"
        fill="none"
        opacity={0.16}
        stroke="#79501F"
        strokeWidth={1.6}
      />
      <Path
        d="M0 384Q116 362 232 378"
        fill="none"
        opacity={0.13}
        stroke="#79501F"
        strokeWidth={1.4}
      />
      <Path
        d="M0 424Q116 404 232 418"
        fill="none"
        opacity={0.11}
        stroke="#79501F"
        strokeWidth={1.8}
      />
      {/* The near edge of the table falls out of focus too. */}
      <Rect
        fill="#5E4022"
        height={44}
        opacity={0.26}
        width={PRINT_WIDTH}
        x={0}
        y={426}
      />

      {/* Where the window falls on the table, and the pot's own contact
          shadow inside it. */}
      <Ellipse cx={74} cy={370} fill="url(#pool)" rx={100} ry={52} />
      <Ellipse
        cx={116}
        cy={351}
        fill="#4A3018"
        opacity={0.22}
        rx={40}
        ry={8.5}
      />

      <Path
        d="M116 294Q69.4 277.6 45.4 267.9"
        fill="none"
        stroke="#24491E"
        strokeLinecap="round"
        strokeWidth={1.6}
      />
      <Path
        d="M86.9 283.6Q90.8 274.1 80.4 269.3Q77.2 280.3 86.9 283.6"
        fill="#33602A"
      />
      <Path
        d="M71.6 278.0Q62.7 277.1 61.3 286.9Q71.2 286.9 71.6 278.0"
        fill="#2E5626"
      />
      <Path
        d="M58.2 273.0Q62.8 265.5 55.1 259.3Q50.9 268.1 58.2 273.0"
        fill="#33602A"
      />
      <Path
        d="M46.8 268.5Q44.0 260.5 35.3 264.0Q39.3 272.4 46.8 268.5"
        fill="#33602A"
      />
      <Path
        d="M116 294Q98.6 262.3 91.7 233.8"
        fill="none"
        stroke="#24491E"
        strokeLinecap="round"
        strokeWidth={1.6}
      />
      <Path
        d="M105.4 272.8Q100.4 265.9 92.1 270.7Q98.4 277.8 105.4 272.8"
        fill="#33602A"
      />
      <Path
        d="M100.1 260.1Q112.1 259.0 109.7 246.0Q96.6 248.5 100.1 260.1"
        fill="#33602A"
      />
      <Path
        d="M95.6 247.7Q92.6 241.2 84.9 243.5Q89.0 250.4 95.6 247.7"
        fill="#33602A"
      />
      <Path
        d="M92.2 235.5Q97.0 228.6 89.2 223.7Q84.6 231.8 92.2 235.5"
        fill="#2E5626"
      />
      <Path
        d="M116 294Q135.1 261.8 139.6 234.0"
        fill="none"
        stroke="#24491E"
        strokeLinecap="round"
        strokeWidth={1.6}
      />
      <Path
        d="M127.3 272.6Q133.9 278.0 140.9 271.4Q132.9 266.2 127.3 272.6"
        fill="#2E5626"
      />
      <Path
        d="M132.6 259.9Q135.5 249.3 123.6 247.2Q121.6 259.0 132.6 259.9"
        fill="#33602A"
      />
      <Path
        d="M136.6 247.6Q143.0 251.6 147.9 244.8Q140.4 241.1 136.6 247.6"
        fill="#33602A"
      />
      <Path
        d="M139.3 235.7Q147.0 230.6 141.8 221.9Q133.8 228.3 139.3 235.7"
        fill="#2E5626"
      />
      <Path
        d="M116 294Q156.6 280.8 176.2 273.9"
        fill="none"
        stroke="#24491E"
        strokeLinecap="round"
        strokeWidth={1.6}
      />
      <Path
        d="M141.2 285.8Q151.1 281.5 147.5 270.0Q136.9 275.8 141.2 285.8"
        fill="#2E5626"
      />
      <Path
        d="M154.3 281.4Q153.5 292.5 165.6 292.3Q165.3 280.2 154.3 281.4"
        fill="#2E5626"
      />
      <Path
        d="M165.6 277.6Q171.9 274.6 168.5 267.7Q161.9 271.7 165.6 277.6"
        fill="#33602A"
      />
      <Path
        d="M175.1 274.4Q183.1 278.9 187.9 269.9Q178.6 265.8 175.1 274.4"
        fill="#2E5626"
      />
      <Path
        d="M116 294Q81.1 268.7 63.8 248.6"
        fill="none"
        stroke="#2F5F26"
        strokeLinecap="round"
        strokeWidth={1.6}
      />
      <Path
        d="M94.3 277.4Q102.9 272.2 97.8 262.3Q88.9 269.0 94.3 277.4"
        fill="#478834"
      />
      <Path
        d="M83.0 267.7Q76.6 263.6 71.5 270.3Q79.0 274.1 83.0 267.7"
        fill="#3F7A32"
      />
      <Path
        d="M73.1 258.5Q79.4 254.8 75.9 247.5Q69.3 252.3 73.1 258.5"
        fill="#3F7A32"
      />
      <Path
        d="M64.9 249.8Q65.3 242.5 57.2 241.1Q57.6 249.3 64.9 249.8"
        fill="#3F7A32"
      />
      <Path
        d="M116 294Q94.4 262.0 95.4 236.8"
        fill="none"
        stroke="#2F5F26"
        strokeLinecap="round"
        strokeWidth={1.6}
      />
      <Path
        d="M103.9 273.0Q99.2 265.0 90.8 270.8Q96.8 279.1 103.9 273.0"
        fill="#3F7A32"
      />
      <Path
        d="M99.1 260.9Q109.0 261.0 109.6 250.0Q98.6 251.0 99.1 260.9"
        fill="#3F7A32"
      />
      <Path
        d="M96.2 249.3Q94.2 242.5 86.3 244.2Q89.4 251.5 96.2 249.3"
        fill="#3F7A32"
      />
      <Path
        d="M95.4 238.4Q100.4 234.0 95.5 228.6Q90.5 233.9 95.4 238.4"
        fill="#478834"
      />
      <Path
        d="M116 294Q136.3 261.2 140.6 233.1"
        fill="none"
        stroke="#2F5F26"
        strokeLinecap="round"
        strokeWidth={1.6}
      />
      <Path
        d="M128.0 272.2Q136.5 276.9 142.3 267.8Q132.3 263.6 128.0 272.2"
        fill="#3F7A32"
      />
      <Path
        d="M133.5 259.3Q134.9 249.9 124.5 248.0Q124.0 258.6 133.5 259.3"
        fill="#478834"
      />
      <Path
        d="M137.6 246.8Q143.2 250.8 147.9 244.9Q141.3 241.2 137.6 246.8"
        fill="#3F7A32"
      />
      <Path
        d="M140.3 234.8Q146.3 231.3 142.0 225.0Q135.8 229.5 140.3 234.8"
        fill="#3F7A32"
      />
      <Path
        d="M116 294Q147.9 275.5 160.6 262.7"
        fill="none"
        stroke="#2F5F26"
        strokeLinecap="round"
        strokeWidth={1.6}
      />
      <Path
        d="M135.5 282.1Q144.3 275.7 137.7 265.7Q128.7 273.6 135.5 282.1"
        fill="#478834"
      />
      <Path
        d="M145.3 275.4Q149.5 284.5 159.7 280.0Q154.0 270.4 145.3 275.4"
        fill="#3F7A32"
      />
      <Path
        d="M153.4 269.2Q158.9 264.1 152.9 258.6Q147.5 264.7 153.4 269.2"
        fill="#3F7A32"
      />
      <Path
        d="M159.8 263.5Q166.5 264.1 166.7 256.8Q159.3 256.8 159.8 263.5"
        fill="#478834"
      />
      <Path
        d="M116 294Q95.1 268.7 92.8 248.9"
        fill="none"
        stroke="#3C7A2F"
        strokeLinecap="round"
        strokeWidth={1.6}
      />
      <Path
        d="M104.0 277.4Q110.8 274.0 107.6 266.1Q100.4 270.6 104.0 277.4"
        fill="#79C255"
      />
      <Path
        d="M98.7 267.8Q92.8 260.8 84.3 266.3Q91.6 273.5 98.7 267.8"
        fill="#57A03F"
      />
      <Path
        d="M95.0 258.7Q102.3 257.6 101.4 249.4Q93.4 251.4 95.0 258.7"
        fill="#79C255"
      />
      <Path
        d="M92.9 250.0Q97.3 244.5 91.3 239.3Q87.2 246.0 92.9 250.0"
        fill="#79C255"
      />
      <Path
        d="M116 294Q125.4 270.6 119.6 251.8"
        fill="none"
        stroke="#3C7A2F"
        strokeLinecap="round"
        strokeWidth={1.6}
      />
      <Path
        d="M120.6 278.6Q121.4 269.3 111.1 267.5Q111.3 278.0 120.6 278.6"
        fill="#79C255"
      />
      <Path
        d="M121.7 269.7Q129.0 270.5 129.5 262.4Q121.5 262.3 121.7 269.7"
        fill="#57A03F"
      />
      <Path
        d="M121.5 261.1Q119.2 253.5 110.8 256.1Q114.2 264.3 121.5 261.1"
        fill="#57A03F"
      />
      <Path
        d="M119.9 252.9Q122.6 248.1 117.6 244.5Q115.1 250.2 119.9 252.9"
        fill="#57A03F"
      />
      <Path
        d="M116 294Q135.9 269.7 143.2 249.1"
        fill="none"
        stroke="#3C7A2F"
        strokeLinecap="round"
        strokeWidth={1.6}
      />
      <Path
        d="M128.1 277.9Q134.1 283.8 141.1 277.5Q133.8 271.6 128.1 277.9"
        fill="#57A03F"
      />
      <Path
        d="M134.1 268.4Q138.1 260.3 129.2 255.9Q125.6 265.2 134.1 268.4"
        fill="#57A03F"
      />
      <Path
        d="M139.0 259.2Q144.2 264.3 150.6 259.1Q144.1 254.0 139.0 259.2"
        fill="#57A03F"
      />
      <Path
        d="M142.8 250.4Q149.9 247.8 146.5 240.2Q139.0 243.7 142.8 250.4"
        fill="#79C255"
      />

      {/* Drawn after the leaves, so they rise from behind the rim. */}
      <Path d="M87 300L145 300L138 344Q116 352 94 344Z" fill="url(#pot)" />
      <Rect fill="#E2C098" height={12} rx={4} width={66} x={83} y={292} />
      <Rect
        fill="#A97F52"
        height={2}
        opacity={0.45}
        width={66}
        x={83}
        y={302}
      />
      <Path
        d="M93 308Q97 328 101 341"
        fill="none"
        opacity={0.32}
        stroke="#F4E1C6"
        strokeLinecap="round"
        strokeWidth={3}
      />

      <Rect
        fill="url(#vignette)"
        height={PRINT_HEIGHT}
        width={PRINT_WIDTH}
        x={0}
        y={0}
      />
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
    'potted plant',
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
          <BarIcon>
            <ListIcon color="#ffffff" size={13} />
          </BarIcon>
          <BarLabel numberOfLines={1}>{copy.history.title}</BarLabel>
        </BarItem>
        <BarItem>
          <BarIcon>
            <GearIcon color="#ffffff" size={13} />
          </BarIcon>
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
  left: 40px;
  top: 200px;
  width: 152px;
  height: 168px;
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
  top: 46px;
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
  gap: 4px;
  max-width: 84px;
`;

const BarIcon = styled.View`
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.overlayGlassBorder};
  background-color: ${({ theme }) => theme.colors.overlayGlass};
`;

const BarLabel = styled.Text`
  color: #ffffff;
  font-size: 8px;
  line-height: 11px;
  font-weight: 700;
  /* The label sits on the scene, not on a surface, so it carries its own
     shadow to stay readable over a bright floor. */
  text-shadow: 0px 1px 3px rgba(0, 0, 0, 0.8);
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
