import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  type AnimatedStyle,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import styled, { useTheme } from 'styled-components/native';

import { AppMark } from '../../../../app/components/AppMark';
import { languageCodes, languageFlags } from '../../domain/LearningLanguage';
import type { DetectedObject } from '../../domain/DetectedObject';
import type { LearningCopy } from '../localization/learningCopy';
import type { CameraViewportCallbacks } from '../models/CameraViewportCallbacks';
import {
  getObjectCardScale,
  getObjectCardTilt,
} from '../animation/objectCardScale';
import type { CameraViewModel } from '../view-models/useCameraViewModel';

interface CameraViewProps {
  copy: LearningCopy;
  isActive: boolean;
  onOpenCollection: () => void;
  onOpenHistory: () => void;
  onPractiseSpeaking: (label: string) => void;
  onOpenSettings: () => void;
  showDiagnostics: boolean;
  diagnostics: {
    cpuWorkers: number;
    gpuWorkers: number;
    profileLabel: string;
  };
  renderCamera: (
    callbacks: CameraViewportCallbacks,
    options: { isActive: boolean },
  ) => ReactNode;
  viewModel: CameraViewModel;
}

interface ViewportSize {
  width: number;
  height: number;
}

const OBJECT_CARD_WIDTH = 208;
const OBJECT_CARD_EDGE_INSET = 8;
/** Space between the object's box and the card standing next to it. */
const OBJECT_CARD_GAP = 10;
const OBJECT_CARD_ESTIMATED_HEIGHT = 76;
const OBJECT_CARD_TOP_SAFE_INSET = 92;
const OBJECT_CARD_BOTTOM_SAFE_INSET = 116;
const OBJECT_CARD_PERSPECTIVE = 900;
/** A small lean back, so the card reads as standing on the scene rather than
 * printed on the screen. */
const OBJECT_CARD_PITCH_DEGREES = 5;
const OBJECT_INTERPOLATION_EASING = Easing.out(Easing.cubic);
const TARGET_CORNERS = [
  'topLeft',
  'topRight',
  'bottomLeft',
  'bottomRight',
] as const;

function MenuIcon({ color }: { color: string }) {
  return (
    <Svg height={20} viewBox="0 0 24 24" width={20}>
      <Path
        d="M4 7h16M4 12h16M4 17h16"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function CloseIcon({ color }: { color: string }) {
  return (
    <Svg height={20} viewBox="0 0 24 24" width={20}>
      <Path
        d="M6 6l12 12M18 6L6 18"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function ListIcon({ color }: { color: string }) {
  return (
    <Svg height={20} viewBox="0 0 24 24" width={20}>
      <Path
        d="M9 6h11M9 12h11M9 18h11"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2}
      />
      <Path
        d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2.6}
      />
    </Svg>
  );
}

function PauseIcon({ color }: { color: string }) {
  return (
    <Svg height={20} viewBox="0 0 24 24" width={20}>
      <Path d="M8 5h3v14H8zM13 5h3v14h-3z" fill={color} />
    </Svg>
  );
}

function PlayIcon({ color }: { color: string }) {
  return (
    <Svg height={20} viewBox="0 0 24 24" width={20}>
      <Path d="M8 5l11 7-11 7V5Z" fill={color} />
    </Svg>
  );
}

function CollectionIcon({ color }: { color: string }) {
  return (
    <Svg height={20} viewBox="0 0 24 24" width={20}>
      <Path
        d="M4 5h16v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V5Z"
        fill="none"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Path
        d="M4 6.5H2.5v1a3 3 0 0 0 3 3M20 6.5h1.5v1a3 3 0 0 1-3 3M12 14v4M8.5 20h7"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function SettingsIcon({ color }: { color: string }) {
  return (
    <Svg height={20} viewBox="0 0 24 24" width={20}>
      <Path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.4 1a7.7 7.7 0 0 0-1.7-1l-.4-2.6h-3.9l-.4 2.6a7.7 7.7 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.7 7.7 0 0 0 1.7 1l.4 2.6h3.9l.4-2.6a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5Z"
        fill="none"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function SpeakerIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M4 9v6h4l5 4V5L8 9H4Z" fill="#111827" />
      <Path
        d="M16 8.2a5 5 0 0 1 0 7.6M18.7 5.5a9 9 0 0 1 0 13"
        fill="none"
        stroke="#111827"
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function MicIcon({ color = '#111827' }: { color?: string }) {
  return (
    <Svg height={14} viewBox="0 0 24 24" width={14}>
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

function getObjectStyle(
  object: DetectedObject,
  sourceWidth: number,
  sourceHeight: number,
  viewport: ViewportSize,
) {
  const scale = Math.max(
    viewport.width / sourceWidth,
    viewport.height / sourceHeight,
  );
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  const offsetX = (viewport.width - renderedWidth) / 2;
  const offsetY = (viewport.height - renderedHeight) / 2;

  return {
    left: offsetX + object.bounds.x * renderedWidth,
    top: offsetY + object.bounds.y * renderedHeight,
    width: object.bounds.width * renderedWidth,
    height: object.bounds.height * renderedHeight,
  };
}

type CardSide = 'left' | 'right';

interface CardPlacement {
  left: number;
  top: number;
  side: CardSide;
  transformOrigin: [string, string, number];
}

/**
 * Puts the card beside the object rather than over it, standing on the same
 * line its base sits on, and says which side it ended up on so it can be
 * hinged on the object itself.
 *
 * The side with more room wins, and the card falls back to floating above the
 * object only when neither side can hold it.
 */
function getObjectCardPlacement(
  targetStyle: ReturnType<typeof getObjectStyle>,
  viewport: ViewportSize,
  scale: number,
): CardPlacement {
  const width = OBJECT_CARD_WIDTH * scale;
  const height = OBJECT_CARD_ESTIMATED_HEIGHT * scale;
  const roomOnTheLeft = targetStyle.left - OBJECT_CARD_EDGE_INSET;
  const roomOnTheRight =
    viewport.width -
    (targetStyle.left + targetStyle.width) -
    OBJECT_CARD_EDGE_INSET;
  const side: CardSide =
    roomOnTheRight >= width || roomOnTheRight >= roomOnTheLeft
      ? 'right'
      : 'left';

  // Relative to the target, which is the box drawn around the object.
  const left =
    side === 'right'
      ? targetStyle.width + OBJECT_CARD_GAP
      : -(width + OBJECT_CARD_GAP);

  // The card's base lines up with the object's, so both read as standing on
  // the same surface.
  const preferredAbsoluteTop = targetStyle.top + targetStyle.height - height;
  const absoluteTop = Math.max(
    OBJECT_CARD_TOP_SAFE_INSET,
    Math.min(
      preferredAbsoluteTop,
      viewport.height - OBJECT_CARD_BOTTOM_SAFE_INSET - height,
    ),
  );

  return {
    left,
    top: absoluteTop - targetStyle.top,
    side,
    // The hinge is the edge facing the object, so the card opens away from it
    // like a panel standing against it rather than turning around itself.
    transformOrigin: side === 'right' ? ['0%', '100%', 0] : ['100%', '100%', 0],
  };
}

interface InterpolatedObjectTargetProps {
  accessibilityLabel: string;
  /** Receives the style of the card, which is sized by how close the object is. */
  children: (cardStyle: StyleProp<AnimatedStyle<ViewStyle>>) => ReactNode;
  durationMs: number;
  hearLabel: string;
  onHear: () => void;
  onPractise: () => void;
  practiseLabel: string;
  targetStyle: ReturnType<typeof getObjectStyle>;
  testID: string;
  viewport: ViewportSize;
}

function InterpolatedObjectTarget({
  accessibilityLabel,
  children,
  durationMs,
  hearLabel,
  onHear,
  onPractise,
  practiseLabel,
  targetStyle,
  testID,
  viewport,
}: InterpolatedObjectTargetProps) {
  const left = useSharedValue(targetStyle.left);
  const top = useSharedValue(targetStyle.top);
  const width = useSharedValue(targetStyle.width);
  const height = useSharedValue(targetStyle.height);
  const cardScale = getObjectCardScale(targetStyle, viewport);
  const placement = getObjectCardPlacement(targetStyle, viewport, cardScale);
  // Hinged on the edge facing the object, the card's far edge is the one that
  // goes back: to the right of the object it opens rightwards, to the left it
  // opens leftwards.
  const cardTilt =
    getObjectCardTilt(targetStyle, viewport) *
    (placement.side === 'right' ? 1 : -1);
  const scale = useSharedValue(cardScale);
  const tilt = useSharedValue(cardTilt);

  useEffect(() => {
    const animation = {
      duration: durationMs,
      easing: OBJECT_INTERPOLATION_EASING,
      reduceMotion: ReduceMotion.System,
    };

    left.value = withTiming(targetStyle.left, animation);
    top.value = withTiming(targetStyle.top, animation);
    width.value = withTiming(targetStyle.width, animation);
    height.value = withTiming(targetStyle.height, animation);
    scale.value = withTiming(cardScale, animation);
    tilt.value = withTiming(cardTilt, animation);
  }, [
    cardScale,
    cardTilt,
    tilt,
    durationMs,
    height,
    left,
    scale,
    targetStyle.height,
    targetStyle.left,
    targetStyle.top,
    targetStyle.width,
    top,
    width,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    left: left.value,
    top: top.value,
    width: width.value,
  }));

  // The card is a panel standing beside the object rather than a sticker on
  // the glass: it keeps a little perspective, leans back, and turns to face
  // the middle of the screen by as much as the object is off to one side.
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: OBJECT_CARD_PERSPECTIVE },
      { rotateY: `${tilt.value}deg` },
      { rotateX: `${OBJECT_CARD_PITCH_DEGREES}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <ObjectTarget
      // The frame itself does nothing when touched: hearing and practising are
      // the two named buttons on the card. Screen readers reach them here,
      // where the whole target is a single accessible element.
      accessibilityActions={[
        { name: 'hear', label: hearLabel },
        { name: 'practise', label: practiseLabel },
      ]}
      accessibilityLabel={accessibilityLabel}
      accessible
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === 'hear') onHear();
        if (event.nativeEvent.actionName === 'practise') onPractise();
      }}
      style={animatedStyle}
      testID={testID}
    >
      {TARGET_CORNERS.map(corner => (
        <TargetCorner key={corner} $corner={corner} pointerEvents="none" />
      ))}
      {children([
        {
          left: placement.left,
          top: placement.top,
          transformOrigin: placement.transformOrigin,
        },
        animatedCardStyle,
      ])}
    </ObjectTarget>
  );
}

export function CameraView({
  copy,
  isActive,
  onOpenCollection,
  onOpenHistory,
  onPractiseSpeaking,
  onOpenSettings,
  showDiagnostics,
  diagnostics,
  renderCamera,
  viewModel,
}: CameraViewProps) {
  const theme = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { learningLanguage, nativeLanguage } = viewModel.languageSettings;
  const nativeCode = languageCodes[nativeLanguage];
  const learningCode = languageCodes[learningLanguage];
  const languagePairLabel = `${nativeCode} para ${learningCode}`;
  const [viewport, setViewport] = useState<ViewportSize>({
    width: 0,
    height: 0,
  });

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
  }, []);

  if (!viewModel.hasPermission) {
    return (
      <PermissionBackground>
        <PermissionSafeArea edges={['top']}>
          <PermissionCard>
            <PermissionIcon>
              <PermissionLens />
            </PermissionIcon>
            <PermissionTitle accessibilityRole="header">
              {copy.camera.permissionTitle}
            </PermissionTitle>
            <PermissionBody>{copy.camera.permissionBody}</PermissionBody>
            <PermissionButton
              accessibilityRole="button"
              disabled={viewModel.isRequestingPermission}
              onPress={viewModel.onPermissionAction}
              $disabled={viewModel.isRequestingPermission}
            >
              <PermissionButtonText>
                {viewModel.permissionActionLabel}
              </PermissionButtonText>
            </PermissionButton>
            {viewModel.cameraError != null ? (
              <PermissionError>{viewModel.cameraError}</PermissionError>
            ) : null}
          </PermissionCard>
        </PermissionSafeArea>
      </PermissionBackground>
    );
  }

  const detectionFrame = viewModel.detectionFrame;
  const isLandscape = viewport.width > viewport.height;
  const displayedError =
    viewModel.cameraError ??
    viewModel.pronunciationError ??
    viewModel.recognitionError;

  return (
    <Container onLayout={handleLayout} testID="camera-container">
      {renderCamera(viewModel.viewportCallbacks, {
        isActive: isActive && !viewModel.isFrozen,
      })}

      {isActive ? <Scrim pointerEvents="none" /> : null}

      {isActive && detectionFrame != null && viewport.width > 0 ? (
        <DetectionLayer pointerEvents="box-none">
          {viewModel.detectionItems.map(({ object, vocabulary }) => {
            const targetStyle = getObjectStyle(
              object,
              detectionFrame.sourceWidth,
              detectionFrame.sourceHeight,
              viewport,
            );

            return (
              <InterpolatedObjectTarget
                accessibilityLabel={`${vocabulary.word}, ${vocabulary.meaning}. ${vocabulary.pronunciationHint}`}
                durationMs={viewModel.detectionInterpolationDurationMs}
                hearLabel={copy.camera.hear}
                key={object.id}
                onHear={() => viewModel.onObjectPress(vocabulary)}
                onPractise={() => onPractiseSpeaking(object.label)}
                practiseLabel={copy.camera.practiseSpeaking}
                targetStyle={targetStyle}
                testID={`detected-object-${object.id}`}
                viewport={viewport}
              >
                {cardStyle => (
                  <>
                    <CardAnchor pointerEvents="none" />
                    <ObjectCard style={cardStyle}>
                      <ObjectWord numberOfLines={1}>
                        {vocabulary.word}
                      </ObjectWord>
                      <TranslationRow>
                        {vocabulary.translations.map((translation, index) => (
                          <React.Fragment key={translation}>
                            {index > 0 ? (
                              <TranslationDot>•</TranslationDot>
                            ) : null}
                            <Translation
                              numberOfLines={1}
                              $secondary={index > 0}
                            >
                              {translation}
                            </Translation>
                          </React.Fragment>
                        ))}
                      </TranslationRow>
                      <ObjectExample numberOfLines={2}>
                        {vocabulary.example}
                      </ObjectExample>
                      <ObjectRule />
                      <ObjectPronunciation>
                        <PronunciationText numberOfLines={1}>
                          {vocabulary.pronunciation}
                        </PronunciationText>
                      </ObjectPronunciation>
                      <ObjectActions>
                        <ActionButton
                          accessibilityLabel={copy.camera.hear}
                          accessibilityRole="button"
                          hitSlop={6}
                          onPress={() => viewModel.onObjectPress(vocabulary)}
                          testID={`hear-object-${object.id}`}
                        >
                          <SpeakerIcon />
                          <ActionLabel numberOfLines={1}>
                            {copy.camera.hear}
                          </ActionLabel>
                        </ActionButton>
                        <ActionButton
                          accessibilityLabel={copy.camera.practiseSpeaking}
                          accessibilityRole="button"
                          hitSlop={6}
                          onPress={() => onPractiseSpeaking(object.label)}
                          testID={`practise-object-${object.id}`}
                          $primary
                        >
                          <MicIcon color="#ffffff" />
                          <ActionLabel numberOfLines={1} $primary>
                            {copy.camera.practise}
                          </ActionLabel>
                        </ActionButton>
                      </ObjectActions>
                    </ObjectCard>
                  </>
                )}
              </InterpolatedObjectTarget>
            );
          })}
        </DetectionLayer>
      ) : null}

      {isActive ? (
        <Overlay
          edges={['top']}
          pointerEvents="box-none"
          $landscape={isLandscape}
        >
          <Header>
            <HeaderMark accessibilityLabel="SayLens" accessible>
              <AppMark height={46} testID="camera-brand-logo" width={46} />
            </HeaderMark>
            <MenuColumn>
              <RoundButton
                accessibilityLabel={copy.camera.menu}
                accessibilityRole="button"
                accessibilityState={{ expanded: isMenuOpen }}
                onPress={() => setIsMenuOpen(open => !open)}
                testID="camera-menu"
              >
                {isMenuOpen ? (
                  <CloseIcon color={theme.colors.text} />
                ) : (
                  <MenuIcon color={theme.colors.text} />
                )}
              </RoundButton>

              {isMenuOpen ? (
                <MenuItems>
                  <MenuItem
                    accessibilityLabel={copy.tabs.settings}
                    accessibilityRole="button"
                    onPress={() => {
                      setIsMenuOpen(false);
                      onOpenSettings();
                    }}
                    testID="camera-open-settings"
                  >
                    <MenuItemLabel>{copy.tabs.settings}</MenuItemLabel>
                    <RoundButton as={View}>
                      <SettingsIcon color={theme.colors.text} />
                    </RoundButton>
                  </MenuItem>

                  <MenuItem
                    accessibilityLabel={copy.history.title}
                    accessibilityRole="button"
                    onPress={() => {
                      setIsMenuOpen(false);
                      onOpenHistory();
                    }}
                    testID="camera-open-history"
                  >
                    <MenuItemLabel>{copy.history.title}</MenuItemLabel>
                    <RoundButton as={View}>
                      <ListIcon color={theme.colors.text} />
                    </RoundButton>
                  </MenuItem>

                  <MenuItem
                    accessibilityLabel={copy.collection.title}
                    accessibilityRole="button"
                    onPress={() => {
                      setIsMenuOpen(false);
                      onOpenCollection();
                    }}
                    testID="camera-open-collection"
                  >
                    <MenuItemLabel>{copy.collection.title}</MenuItemLabel>
                    <RoundButton as={View}>
                      <CollectionIcon color={theme.colors.text} />
                    </RoundButton>
                  </MenuItem>

                  <MenuItem
                    accessibilityLabel={
                      viewModel.isFrozen
                        ? copy.camera.resume
                        : copy.camera.pause
                    }
                    accessibilityRole="button"
                    onPress={() => {
                      setIsMenuOpen(false);
                      viewModel.toggleFrozen();
                    }}
                    testID="camera-toggle-freeze"
                  >
                    <MenuItemLabel>
                      {viewModel.isFrozen
                        ? copy.camera.resume
                        : copy.camera.pause}
                    </MenuItemLabel>
                    <RoundButton as={View} $accent={viewModel.isFrozen}>
                      {viewModel.isFrozen ? (
                        <PlayIcon color={theme.colors.text} />
                      ) : (
                        <PauseIcon color={theme.colors.text} />
                      )}
                    </RoundButton>
                  </MenuItem>
                </MenuItems>
              ) : null}
            </MenuColumn>
          </Header>

          {showDiagnostics ? (
            <DiagnosticsPanel accessible testID="camera-diagnostics">
              <DiagnosticsRow>
                <DiagnosticsLabel>
                  {copy.diagnostics.inferences}
                </DiagnosticsLabel>
                <DiagnosticsValue>
                  {`${viewModel.detectorMetrics.framesPerSecond.toFixed(1)}/s`}
                </DiagnosticsValue>
              </DiagnosticsRow>
              <DiagnosticsRow>
                <DiagnosticsLabel>{copy.diagnostics.latency}</DiagnosticsLabel>
                <DiagnosticsValue>
                  {`p50 ${Math.round(
                    viewModel.detectorMetrics.latencyP50Ms,
                  )} · p95 ${Math.round(
                    viewModel.detectorMetrics.latencyP95Ms,
                  )} ${copy.diagnostics.latencyUnit}`}
                </DiagnosticsValue>
              </DiagnosticsRow>
              <DiagnosticsRow>
                <DiagnosticsLabel>{copy.diagnostics.workers}</DiagnosticsLabel>
                <DiagnosticsValue>
                  {/* iOS has no GPU delegate to count, and neither does the
                      Android power-saving pool, so the zero is left out. */}
                  {diagnostics.gpuWorkers > 0
                    ? `${diagnostics.cpuWorkers} CPU · ${diagnostics.gpuWorkers} GPU`
                    : `${diagnostics.cpuWorkers} CPU`}
                </DiagnosticsValue>
              </DiagnosticsRow>
              <DiagnosticsRow>
                <DiagnosticsLabel>{copy.diagnostics.buffer}</DiagnosticsLabel>
                <DiagnosticsValue>
                  {`${detectionFrame?.sourceWidth ?? 0}×${
                    detectionFrame?.sourceHeight ?? 0
                  }`}
                </DiagnosticsValue>
              </DiagnosticsRow>
              <DiagnosticsRow>
                <DiagnosticsLabel>{copy.diagnostics.samples}</DiagnosticsLabel>
                <DiagnosticsValue>
                  {String(viewModel.detectorMetrics.sampleCount)}
                </DiagnosticsValue>
              </DiagnosticsRow>
              <DiagnosticsRow>
                <DiagnosticsLabel>{copy.diagnostics.profile}</DiagnosticsLabel>
                <DiagnosticsValue>{diagnostics.profileLabel}</DiagnosticsValue>
              </DiagnosticsRow>
            </DiagnosticsPanel>
          ) : null}

          <LanguagePill
            accessibilityHint={copy.camera.tapToChangeLanguages}
            accessibilityLabel={languagePairLabel}
            accessibilityRole="button"
            onPress={onOpenSettings}
            testID="camera-language-pair"
          >
            <LanguageFlag>{languageFlags[nativeLanguage]}</LanguageFlag>
            <LanguageCode>{nativeCode}</LanguageCode>
            <LanguageArrow>→</LanguageArrow>
            <LanguageFlag>{languageFlags[learningLanguage]}</LanguageFlag>
            <LanguageCode>{learningCode}</LanguageCode>
            <LanguageCheck>✓</LanguageCheck>
          </LanguagePill>

          {viewModel.isFrozen ? (
            <FrozenBadge testID="camera-frozen-badge">
              <FrozenDot />
              <FrozenText>{copy.camera.frozen}</FrozenText>
            </FrozenBadge>
          ) : null}

          {displayedError != null ? (
            <ErrorBanner>
              <ErrorText>{displayedError}</ErrorText>
            </ErrorBanner>
          ) : null}
        </Overlay>
      ) : null}
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
  background-color: #000000;
`;

const Scrim = styled.View`
  position: absolute;
  inset: 0px;
  background-color: rgba(3, 10, 22, 0.14);
`;

const DetectionLayer = styled.View`
  position: absolute;
  inset: 0px;
  z-index: 1;
`;

const ObjectTarget = styled(Animated.View)`
  position: absolute;
  min-width: 42px;
  min-height: 42px;
  background-color: transparent;
`;

/** The object is framed by four corner brackets rather than a closed box, so
 * the camera image stays readable underneath. */
const TargetCorner = styled.View<{
  $corner: (typeof TARGET_CORNERS)[number];
}>`
  position: absolute;
  width: 18px;
  height: 18px;
  border-color: rgba(255, 255, 255, 0.94);
  ${({ $corner }) =>
    $corner === 'topLeft'
      ? 'top: 0px; left: 0px; border-top-width: 2.5px; border-left-width: 2.5px; border-top-left-radius: 8px;'
      : $corner === 'topRight'
      ? 'top: 0px; right: 0px; border-top-width: 2.5px; border-right-width: 2.5px; border-top-right-radius: 8px;'
      : $corner === 'bottomLeft'
      ? 'bottom: 0px; left: 0px; border-bottom-width: 2.5px; border-left-width: 2.5px; border-bottom-left-radius: 8px;'
      : 'bottom: 0px; right: 0px; border-bottom-width: 2.5px; border-right-width: 2.5px; border-bottom-right-radius: 8px;'}
`;

const ObjectCard = styled(Animated.View)`
  position: absolute;
  width: 208px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.colors.overlayCardBorder};
  background-color: ${({ theme }) => theme.colors.overlayCardTranslucent};
  elevation: 14;
  /* The shadow falls down and to the side, which is what tells the eye the
     card is standing a little in front of the object rather than on it. */
  shadow-color: #000000;
  shadow-opacity: 0.32;
  shadow-radius: 18px;
  shadow-offset: 6px 12px;
`;

/** Short leader line and dot tying the card back to the object it describes. */
const CardAnchor = styled.View`
  position: absolute;
  top: -14px;
  left: 50%;
  width: 10px;
  height: 10px;
  margin-left: -5px;
  border-radius: 5px;
  background-color: ${({ theme }) => theme.colors.overlayCard};
`;

const ObjectWord = styled.Text`
  color: ${({ theme }) => theme.colors.overlayInk};
  font-size: 24px;
  line-height: 30px;
  font-weight: 700;
`;

const TranslationRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 2px;
`;

const Translation = styled.Text<{ $secondary: boolean }>`
  color: ${({ theme, $secondary }) =>
    $secondary
      ? theme.colors.translationSecondary
      : theme.colors.translationPrimary};
  font-size: 16px;
  line-height: 22px;
  font-weight: 600;
`;

const TranslationDot = styled.Text`
  margin: 0px 6px;
  color: ${({ theme }) => theme.colors.overlayMuted};
  font-size: 16px;
  line-height: 22px;
`;

/** The sentence is what the learner is here for, so it is written in the
 * language being learned. The native meaning is already in the row above. */
const ObjectExample = styled.Text`
  margin-top: 10px;
  color: ${({ theme }) => theme.colors.overlayInk};
  font-size: 14px;
  line-height: 20px;
  font-style: italic;
`;

const ObjectRule = styled.View`
  height: 1px;
  margin: 12px 0px;
  background-color: ${({ theme }) => theme.colors.overlayRule};
`;

const ObjectPronunciation = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const PronunciationText = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.overlayMuted};
  font-size: 12px;
  line-height: 16px;
`;

/** Hearing the word and saying it back are the two things to do with a card,
 * so both are named rather than left to a tap the learner has to guess. */
const ObjectActions = styled.View`
  flex-direction: row;
  gap: 8px;
  margin-top: 12px;
`;

const ActionButton = styled.Pressable<{ $primary?: boolean }>`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 7px 6px;
  border: 1px solid
    ${({ theme, $primary }) =>
      $primary ? theme.colors.accent : theme.colors.overlayRule};
  border-radius: 999px;
  background-color: ${({ theme, $primary }) =>
    $primary ? theme.colors.accent : 'transparent'};
`;

const ActionLabel = styled.Text<{ $primary?: boolean }>`
  color: ${({ theme, $primary }) =>
    $primary ? '#ffffff' : theme.colors.overlayInk};
  font-size: 11px;
  line-height: 15px;
  font-weight: 800;
`;

const Overlay = styled(SafeAreaView)<{ $landscape: boolean }>`
  flex: 1;
  padding-right: ${({ $landscape }) => ($landscape ? 154 : 0)}px;
  padding-bottom: ${({ $landscape }) => ($landscape ? 16 : 112)}px;
  z-index: 2;
`;

/** Top aligned: the menu column grows downwards when it expands, and centring
 * would drag the brand mark down with it. */
const Header = styled.View`
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  margin: 10px 12px 0px;
`;

/** Same 42dp box as the menu button so the two line up. The artwork carries
 * transparent margin, so it is drawn slightly larger and clipped to fill. */
const HeaderMark = styled.View`
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 10px;
  elevation: 8;
`;

const ErrorBanner = styled.View`
  position: absolute;
  bottom: 122px;
  align-self: center;
  padding: 12px 16px;
  border-radius: 12px;
  background-color: rgba(121, 31, 31, 0.9);
`;

const ErrorText = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 13px;
  font-weight: 600;
`;

const PermissionBackground = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const PermissionSafeArea = styled(SafeAreaView)`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 0px 24px 96px;
`;

const PermissionCard = styled.View`
  width: 100%;
  align-items: center;
  padding: 28px;
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: ${({ theme }) => theme.radii.extraLarge}px;
  background-color: ${({ theme }) => theme.colors.glassStrong};
  elevation: 14;
`;

const PermissionIcon = styled.View`
  width: 78px;
  height: 58px;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  border: 2px solid ${({ theme }) => theme.colors.accent};
  border-radius: 18px;
`;

const PermissionLens = styled.View`
  width: 24px;
  height: 24px;
  border: 2px solid ${({ theme }) => theme.colors.accent};
  border-radius: 12px;
`;

const PermissionTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 27px;
  font-weight: 800;
  letter-spacing: -0.5px;
  text-align: center;
`;

const PermissionBody = styled.Text`
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: 15px;
  line-height: 22px;
  text-align: center;
`;

const PermissionButton = styled.Pressable<{ $disabled: boolean }>`
  width: 100%;
  margin-top: 24px;
  padding: 15px 22px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.accent};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
`;

const PermissionButtonText = styled.Text`
  color: ${({ theme }) => theme.colors.background};
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1.2px;
  text-align: center;
`;

const PermissionError = styled.Text`
  margin-top: 14px;
  color: #ffb4ab;
  font-size: 13px;
  text-align: center;
`;

const LanguagePill = styled.Pressable`
  align-self: center;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding: 12px 20px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  background-color: ${({ theme }) => theme.colors.glassStrong};
`;

const LanguageFlag = styled.Text`
  font-size: 18px;
  line-height: 22px;
`;

const LanguageCode = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.6px;
`;

const LanguageArrow = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 16px;
`;

const LanguageCheck = styled.Text`
  width: 22px;
  height: 22px;
  border-radius: 11px;
  background-color: ${({ theme }) => theme.colors.translationPrimary};
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
  line-height: 22px;
  text-align: center;
`;

const MenuColumn = styled.View`
  align-items: flex-end;
  gap: 10px;
`;

const RoundButton = styled.Pressable<{ $accent?: boolean }>`
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border: 1px solid
    ${({ theme, $accent }) =>
      $accent ? theme.colors.accent : theme.colors.glassBorder};
  border-radius: 21px;
  background-color: ${({ theme, $accent }) =>
    $accent ? theme.colors.glassBlue : theme.colors.glassStrong};
  elevation: 6;
`;

const MenuItems = styled.View`
  align-items: flex-end;
  gap: 10px;
`;

const MenuItem = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 10px;
`;

const MenuItemLabel = styled.Text`
  padding: 6px 12px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.glassStrong};
  color: ${({ theme }) => theme.colors.text};
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
`;

const DiagnosticsPanel = styled.View`
  align-self: flex-start;
  margin: 10px 12px 0px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: 12px;
  background-color: rgba(5, 18, 37, 0.86);
`;

const DiagnosticsRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
`;

const DiagnosticsLabel = styled.Text`
  color: #8fb4e8;
  font-size: 10px;
  line-height: 16px;
`;

const DiagnosticsValue = styled.Text`
  color: #eaf2ff;
  font-size: 11px;
  line-height: 16px;
  font-weight: 700;
`;

const FrozenBadge = styled.View`
  align-self: center;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 14px;
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.glassStrong};
`;

const FrozenDot = styled.View`
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const FrozenText = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.8px;
`;
