import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  type AnimatedStyle,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import styled, { useTheme } from 'styled-components/native';

import { AppMark } from '../../../../app/components/AppMark';
import {
  languageBaseFlags,
  languageCodes,
  languageFlags,
} from '../../domain/LearningLanguage';
import type { DetectedObject } from '../../domain/DetectedObject';
import type { LearningCopy } from '../localization/learningCopy';
import type { CameraViewportCallbacks } from '../models/CameraViewportCallbacks';
import {
  getObjectCardPlacement,
  OBJECT_CARD_WIDTH,
} from '../animation/objectCardPlacement';
import {
  getObjectCardScale,
  getObjectCardTilt,
} from '../animation/objectCardScale';
import type { CameraViewModel } from '../view-models/useCameraViewModel';

interface CameraViewProps {
  copy: LearningCopy;
  isActive: boolean;
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

/** Half of one breath of the practise button, in milliseconds. */
const PRACTISE_PULSE_MS = 900;
/** The brand blue, and the lighter tone it breathes towards. */
const PRACTISE_BASE = '#4153FB';
const PRACTISE_LIT = '#6D7BFF';
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

function ListIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
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

/**
 * Two rails with a knob each.
 *
 * A line-art gear was tried twice and read as a ship's wheel both times: thin
 * teeth on a ring are spokes to the eye. Sliders say "adjust" without the
 * ambiguity, which is what this screen's settings are.
 */
function SettingsIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M3.5 8.5h17M3.5 15.5h17"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.9}
      />
      <Circle cx={15} cy={8.5} fill={color} r={3.1} />
      <Circle cx={9.5} cy={15.5} fill={color} r={3.1} />
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

/**
 * The one button on the card that asks the learner to do something, so it
 * breathes: a slow pulse with a halo behind it, which reads as an invitation
 * where a still button reads as decoration. The movement is small and slow on
 * purpose — the card it sits on is already tracking a moving object.
 */
function PractiseAction({
  accessibilityLabel,
  label,
  onPress,
  testID,
}: {
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: PRACTISE_PULSE_MS,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0, {
          duration: PRACTISE_PULSE_MS,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.06 }],
    // The colour lifts with the beat as well as the size. Scale alone is easy
    // to miss on a wide button; a button that brightens is not.
    backgroundColor: interpolateColor(
      pulse.value,
      [0, 1],
      [PRACTISE_BASE, PRACTISE_LIT],
    ),
    // Its own glow strengthens too, so the pulse reads even where the halo
    // behind it is clipped by the card's edge.
    shadowOpacity: 0.35 + pulse.value * 0.4,
    shadowRadius: 8 + pulse.value * 10,
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.45 }],
  }));

  return (
    <PractiseSlot>
      <PractiseHalo pointerEvents="none" style={haloStyle} />
      <PractiseButton
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        hitSlop={6}
        onPress={onPress}
        style={buttonStyle}
        testID={testID}
        $primary
      >
        <MicIcon color="#ffffff" />
        <ActionLabel numberOfLines={1} $primary>
          {label}
        </ActionLabel>
      </PractiseButton>
    </PractiseSlot>
  );
}

/** A quiet object shows only its name, at this size. */
const OBJECT_LABEL_SIZE = { width: 138, height: 30 };

interface InterpolatedObjectTargetProps {
  accessibilityLabel: string;
  /** Receives the style of the card, which is sized by how close the object is. */
  children: (cardStyle: StyleProp<AnimatedStyle<ViewStyle>>) => ReactNode;
  durationMs: number;
  hearLabel: string;
  onHear: () => void;
  onPractise: () => void;
  practiseLabel: string;
  /** A quiet object is one of the others in frame: it shows its name and
   * waits, rather than carrying the whole card. */
  quiet?: boolean;
  targetStyle: ReturnType<typeof getObjectStyle>;
  testID: string;
  viewport: ViewportSize;
}

function InterpolatedObjectTarget({
  accessibilityLabel,
  children,
  quiet = false,
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
  const placement = getObjectCardPlacement(
    targetStyle,
    viewport,
    cardScale,
    quiet ? OBJECT_LABEL_SIZE : undefined,
  );
  // Hinged on the edge facing the object, the card's far edge is the one that
  // goes back: to the right of the object it opens rightwards, to the left it
  // opens leftwards.
  const cardTilt =
    getObjectCardTilt(targetStyle, viewport) * placement.hingeDirection;
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

  // The card is a panel standing against the object rather than a sticker on
  // the glass: it keeps a little perspective and opens away from the object on
  // the edge it is hinged to, around whichever axis that edge runs along.
  const isSideways = placement.hingeAxis === 'y';
  // A quiet object carries a flat label. Perspective is for the one card the
  // learner is being asked to read.
  const animatedCardStyle = useAnimatedStyle(() =>
    quiet
      ? { transform: [{ scale: scale.value }] }
      : {
          transform: [
            { perspective: OBJECT_CARD_PERSPECTIVE },
            { rotateY: isSideways ? `${tilt.value}deg` : '0deg' },
            {
              rotateX: isSideways
                ? `${OBJECT_CARD_PITCH_DEGREES}deg`
                : `${tilt.value}deg`,
            },
            { scale: scale.value },
          ],
        },
  );

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
        <TargetCorner
          key={corner}
          $corner={corner}
          $quiet={quiet}
          pointerEvents="none"
        />
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
  onOpenHistory,
  onPractiseSpeaking,
  onOpenSettings,
  showDiagnostics,
  diagnostics,
  renderCamera,
  viewModel,
}: CameraViewProps) {
  const theme = useTheme();
  const { learningLanguage, nativeLanguage } = viewModel.languageSettings;
  const nativeCode = languageCodes[nativeLanguage];
  const learningCode = languageCodes[learningLanguage];
  const languagePairLabel = `${nativeCode} para ${learningCode}`;
  const [chosenId, setChosenId] = useState<string | null>(null);
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
  // One object carries the card. The learner picks it by tapping a label, and
  // until then it is the nearest one, which is what the phone is pointed at.
  const nearestId = viewModel.detectionItems.reduce<string | null>(
    (nearest, item) => {
      const area = item.object.bounds.width * item.object.bounds.height;
      const nearestItem = viewModel.detectionItems.find(
        candidate => candidate.object.id === nearest,
      );
      const nearestArea =
        nearestItem == null
          ? 0
          : nearestItem.object.bounds.width * nearestItem.object.bounds.height;

      return area > nearestArea ? item.object.id : nearest;
    },
    null,
  );
  const readingId =
    chosenId != null &&
    viewModel.detectionItems.some(item => item.object.id === chosenId)
      ? chosenId
      : nearestId;
  // The reading the model is surest of, which the diagnostics panel reports so
  // a name that looks wrong can be judged against its score.
  const strongestDetection = viewModel.detectionItems.reduce<
    (typeof viewModel.detectionItems)[number]['object'] | null
  >(
    (strongest, item) =>
      strongest == null || item.object.confidence > strongest.confidence
        ? item.object
        : strongest,
    null,
  );
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
            const isReading = object.id === readingId;

            return (
              <InterpolatedObjectTarget
                quiet={!isReading}
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
                {cardStyle =>
                  !isReading ? (
                    <ObjectLabel
                      accessibilityLabel={`${vocabulary.word}, ${vocabulary.meaning}`}
                      accessibilityRole="button"
                      onPress={() => setChosenId(object.id)}
                      style={cardStyle}
                      testID={`label-object-${object.id}`}
                    >
                      <ObjectLabelWord numberOfLines={1}>
                        {vocabulary.word}
                      </ObjectLabelWord>
                      <ObjectLabelMeaning numberOfLines={1}>
                        {vocabulary.meaning}
                      </ObjectLabelMeaning>
                    </ObjectLabel>
                  ) : (
                    <>
                      <ObjectCard style={cardStyle}>
                        {/* The word is the way to hear it: reading a word and
                            tapping it to listen is the gesture a dictionary
                            taught everyone, and it leaves the row below for
                            the one thing the app is asking to be done. */}
                        <ObjectWordRow
                          accessibilityLabel={copy.camera.hear}
                          accessibilityRole="button"
                          hitSlop={6}
                          onPress={() => viewModel.onObjectPress(vocabulary)}
                          testID={`hear-object-${object.id}`}
                        >
                          <ObjectWord numberOfLines={1}>
                            {vocabulary.word}
                          </ObjectWord>
                          <SpeakerIcon size={16} />
                        </ObjectWordRow>
                        <TranslationRow>
                          {vocabulary.translations.map((translation, index) => (
                            <React.Fragment key={translation.word}>
                              {index > 0 ? (
                                <TranslationDot>•</TranslationDot>
                              ) : null}
                              {/* The flag says which language the word beside it
                                belongs to, which colour alone cannot. */}
                              <TranslationFlag>
                                {languageBaseFlags[translation.language]}
                              </TranslationFlag>
                              <Translation
                                numberOfLines={1}
                                $secondary={index > 0}
                              >
                                {translation.word}
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
                          <PractiseAction
                            accessibilityLabel={copy.camera.practiseSpeaking}
                            label={copy.camera.practise}
                            onPress={() => onPractiseSpeaking(object.label)}
                            testID={`practise-object-${object.id}`}
                          />
                        </ObjectActions>
                      </ObjectCard>
                    </>
                  )
                }
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
            <LanguagePill
              accessibilityHint={copy.camera.tapToChangeLanguages}
              accessibilityLabel={languagePairLabel}
              accessibilityRole="button"
              onPress={onOpenSettings}
              testID="camera-language-pair"
            >
              {/* Two flags and an arrow say the whole thing. The codes and the
                  tick repeated it, and the width they cost was width the open
                  menu needed. */}
              <LanguageFlag>{languageFlags[nativeLanguage]}</LanguageFlag>
              <LanguageArrow>→</LanguageArrow>
              <LanguageFlag>{languageFlags[learningLanguage]}</LanguageFlag>
            </LanguagePill>

            <FreezeButton
              accessibilityLabel={
                viewModel.isFrozen ? copy.camera.resume : copy.camera.pause
              }
              accessibilityRole="button"
              accessibilityState={{ selected: viewModel.isFrozen }}
              onPress={viewModel.toggleFrozen}
              testID="camera-toggle-freeze"
              $frozen={viewModel.isFrozen}
            >
              {viewModel.isFrozen ? (
                <PlayIcon color={theme.colors.text} />
              ) : (
                <PauseIcon color={theme.colors.text} />
              )}
            </FreezeButton>
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
                <DiagnosticsLabel>
                  {copy.diagnostics.strongest}
                </DiagnosticsLabel>
                <DiagnosticsValue>
                  {strongestDetection
                    ? `${
                        strongestDetection.label
                      } ${strongestDetection.confidence.toFixed(2)}`
                    : '—'}
                </DiagnosticsValue>
              </DiagnosticsRow>
              <DiagnosticsRow>
                <DiagnosticsLabel>{copy.diagnostics.profile}</DiagnosticsLabel>
                <DiagnosticsValue>{diagnostics.profileLabel}</DiagnosticsValue>
              </DiagnosticsRow>
            </DiagnosticsPanel>
          ) : null}

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

          {/* The three places a learner goes, where a thumb reaches them. */}
          <BottomBar>
            <BarItem
              accessibilityLabel={copy.history.title}
              accessibilityRole="button"
              onPress={onOpenHistory}
              testID="camera-open-history"
            >
              <BarIcon>
                <ListIcon color="#ffffff" size={23} />
              </BarIcon>
              <BarLabel numberOfLines={1}>{copy.history.title}</BarLabel>
            </BarItem>

            <BarItem
              accessibilityLabel={copy.tabs.settings}
              accessibilityRole="button"
              onPress={onOpenSettings}
              testID="camera-open-settings"
            >
              <BarIcon>
                <SettingsIcon color="#ffffff" size={23} />
              </BarIcon>
              <BarLabel numberOfLines={1}>{copy.tabs.settings}</BarLabel>
            </BarItem>
          </BottomBar>
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
  $quiet?: boolean;
}>`
  position: absolute;
  width: 18px;
  height: 18px;
  opacity: ${({ $quiet }) => ($quiet ? 0.55 : 1)};
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

/** Everything else in frame: the word, its meaning, and nothing more. Tapping
 * it makes it the one being read, which is the same gesture as choosing what a
 * camera focuses on. */
const ObjectLabel = styled(
  Animated.createAnimatedComponent(styled.Pressable``),
)`
  position: absolute;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.overlayCardBorder};
  background-color: ${({ theme }) => theme.colors.overlayCardTranslucent};
  elevation: 8;
  shadow-color: #000000;
  shadow-opacity: 0.28;
  shadow-radius: 10px;
  shadow-offset: 2px 6px;
`;

const ObjectLabelWord = styled.Text`
  color: ${({ theme }) => theme.colors.overlayInk};
  font-size: 13px;
  font-weight: 800;
`;

const ObjectLabelMeaning = styled.Text`
  color: ${({ theme }) => theme.colors.overlayMuted};
  font-size: 12px;
`;

const ObjectCard = styled(Animated.View)`
  position: absolute;
  width: ${OBJECT_CARD_WIDTH}px;
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

const ObjectWordRow = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 7px;
`;

const ObjectWord = styled.Text`
  color: ${({ theme }) => theme.colors.overlayInk};
  font-size: 24px;
  line-height: 30px;
  font-weight: 700;
`;

const TranslationFlag = styled.Text`
  margin-right: 4px;
  font-size: 13px;
  line-height: 20px;
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
/** Holds the button and the halo that grows behind it, so the halo can spread
 * without moving anything else on the card. */
const PractiseSlot = styled.View`
  flex: 1;
  align-items: stretch;
  justify-content: center;
`;

/** With hearing moved to the word, practising is the only thing left to press,
 * so it takes the whole row. */

const PractiseHalo = styled(Animated.View)`
  position: absolute;
  inset: -3px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.overlayAction};
`;

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
      $primary ? theme.colors.overlayAction : theme.colors.overlayRule};
  border-radius: 999px;
  background-color: ${({ theme, $primary }) =>
    $primary ? theme.colors.overlayAction : 'transparent'};
`;

/** The same button, able to animate. It fills its slot rather than flexing,
 * because the slot around it is what holds the row's proportions. */
const PractiseButton = styled(Animated.createAnimatedComponent(ActionButton))`
  flex: 0;
  padding: 10px 8px;
  shadow-color: ${({ theme }) => theme.colors.overlayAction};
  shadow-offset: 0px 3px;
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
  padding-bottom: ${({ $landscape }) => ($landscape ? 16 : 26)}px;
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

/** Sits in the header, pushed up against the menu button, so the two controls
 * that change what the camera does are within a thumb's reach of each other. */
const LanguagePill = styled.Pressable`
  flex: none;
  flex-direction: row;
  align-items: center;
  gap: 7px;
  margin: 4px 8px 0px auto;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.overlayGlassBorder};
  background-color: ${({ theme }) => theme.colors.overlayGlass};
`;

const LanguageFlag = styled.Text`
  font-size: 17px;
  line-height: 21px;
`;

const LanguageArrow = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
`;

/** One surface rather than three loose icons: a dock the thumb can find
 * without looking, with room around each target. Cards are kept above it by
 * the placement's bottom inset, so nothing a learner is reading sits under it. */
const BottomBar = styled.View`
  flex-direction: row;
  justify-content: space-around;
  align-items: flex-end;
  margin-top: auto;
  padding: 10px 12px 0px;
`;

/** Three controls floating over the scene rather than a bar across it. A bar
 * is a piece of interface the camera has to look through; these are objects
 * resting on it. */
const BarItem = styled.Pressable`
  align-items: center;
  gap: 7px;
  min-width: 68px;
`;

const BarIcon = styled.View`
  width: 50px;
  height: 50px;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.overlayGlassBorder};
  border-radius: 25px;
  background-color: ${({ theme }) => theme.colors.overlayGlass};
`;

const BarLabel = styled.Text`
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 700;
  /* The label sits on the scene, not on a surface, so it carries its own
     shadow to stay readable over a bright floor. */
  text-shadow: 0px 1px 4px rgba(0, 0, 0, 0.8);
`;

/** Freezing is a mode, and a rare one, so it sits where a camera puts its
 * flash toggle rather than competing with the places a learner goes. */
const FreezeButton = styled.Pressable<{ $frozen: boolean }>`
  width: 38px;
  height: 38px;
  margin-top: 4px;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.overlayGlassBorder};
  border-radius: 19px;
  background-color: ${({ theme, $frozen }) =>
    $frozen ? theme.colors.overlayAction : theme.colors.overlayGlass};
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
