import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
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
import type { CameraViewModel } from '../view-models/useCameraViewModel';

interface CameraViewProps {
  copy: LearningCopy;
  isActive: boolean;
  onOpenHistory: () => void;
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
const OBJECT_CARD_ESTIMATED_HEIGHT = 76;
const OBJECT_CARD_TOP_SAFE_INSET = 92;
const OBJECT_CARD_BOTTOM_SAFE_INSET = 116;
const OBJECT_INTERPOLATION_EASING = Easing.out(Easing.cubic);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const TARGET_CORNERS = [
  'topLeft',
  'topRight',
  'bottomLeft',
  'bottomRight',
] as const;

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

function SpeakerIcon() {
  return (
    <Svg height={18} viewBox="0 0 24 24" width={18}>
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

function getObjectCardStyle(
  targetStyle: ReturnType<typeof getObjectStyle>,
  viewport: ViewportSize,
) {
  const minimumLeft = OBJECT_CARD_EDGE_INSET - targetStyle.left;
  const rightSafeInset =
    viewport.width > viewport.height ? 166 : OBJECT_CARD_EDGE_INSET;
  const maximumLeft =
    viewport.width - targetStyle.left - OBJECT_CARD_WIDTH - rightSafeInset;
  const preferredAbsoluteTop =
    targetStyle.top - OBJECT_CARD_ESTIMATED_HEIGHT - OBJECT_CARD_EDGE_INSET;
  const maximumAbsoluteTop =
    viewport.height -
    OBJECT_CARD_BOTTOM_SAFE_INSET -
    OBJECT_CARD_ESTIMATED_HEIGHT;
  const absoluteTop = Math.max(
    OBJECT_CARD_TOP_SAFE_INSET,
    Math.min(preferredAbsoluteTop, maximumAbsoluteTop),
  );

  return {
    left: Math.max(minimumLeft, Math.min(-2, maximumLeft)),
    top: absoluteTop - targetStyle.top,
  };
}

interface InterpolatedObjectTargetProps {
  accessibilityHint: string;
  accessibilityLabel: string;
  children: ReactNode;
  durationMs: number;
  onPress: () => void;
  targetStyle: ReturnType<typeof getObjectStyle>;
  testID: string;
}

function InterpolatedObjectTarget({
  accessibilityHint,
  accessibilityLabel,
  children,
  durationMs,
  onPress,
  targetStyle,
  testID,
}: InterpolatedObjectTargetProps) {
  const left = useSharedValue(targetStyle.left);
  const top = useSharedValue(targetStyle.top);
  const width = useSharedValue(targetStyle.width);
  const height = useSharedValue(targetStyle.height);

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
  }, [
    durationMs,
    height,
    left,
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

  return (
    <ObjectTarget
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessible
      android_ripple={{ color: 'rgba(139, 190, 255, 0.28)' }}
      hitSlop={8}
      onPress={onPress}
      style={animatedStyle}
      testID={testID}
    >
      {TARGET_CORNERS.map(corner => (
        <TargetCorner key={corner} $corner={corner} pointerEvents="none" />
      ))}
      {children}
    </ObjectTarget>
  );
}

export function CameraView({
  copy,
  isActive,
  onOpenHistory,
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

      {isActive ? (
        <FreezeSurface
          accessibilityHint={
            viewModel.isFrozen
              ? copy.camera.tapToResume
              : copy.camera.tapToFreeze
          }
          accessibilityLabel={
            viewModel.isFrozen ? copy.camera.frozen : copy.camera.live
          }
          accessibilityRole="button"
          onPress={viewModel.toggleFrozen}
          testID="camera-freeze-surface"
        />
      ) : null}
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
                accessibilityHint={copy.camera.tapToHearPronunciation}
                accessibilityLabel={`${vocabulary.word}, ${vocabulary.meaning}. ${vocabulary.pronunciationHint}`}
                durationMs={viewModel.detectionInterpolationDurationMs}
                key={object.id}
                onPress={() => viewModel.onObjectPress(vocabulary)}
                targetStyle={targetStyle}
                testID={`detected-object-${object.id}`}
              >
                <CardAnchor pointerEvents="none" />
                <ObjectCard style={getObjectCardStyle(targetStyle, viewport)}>
                  <ObjectWord numberOfLines={1}>{vocabulary.word}</ObjectWord>
                  <TranslationRow>
                    {vocabulary.translations.map((translation, index) => (
                      <React.Fragment key={translation}>
                        {index > 0 ? <TranslationDot>•</TranslationDot> : null}
                        <Translation numberOfLines={1} $secondary={index > 0}>
                          {translation}
                        </Translation>
                      </React.Fragment>
                    ))}
                  </TranslationRow>
                  <ObjectDefinition numberOfLines={3}>
                    {vocabulary.definition}
                  </ObjectDefinition>
                  <ObjectRule />
                  <ObjectPronunciation>
                    <SpeakerIcon />
                    <PronunciationText numberOfLines={1}>
                      {vocabulary.pronunciation}
                    </PronunciationText>
                  </ObjectPronunciation>
                </ObjectCard>
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
            <HeaderMark
              accessibilityHint={copy.history.title}
              accessibilityLabel="SayLens"
              accessibilityRole="button"
              onPress={onOpenHistory}
              testID="camera-open-history"
            >
              <AppMark height={42} testID="camera-brand-logo" width={42} />
            </HeaderMark>
            <SettingsButton
              accessibilityLabel={copy.tabs.settings}
              accessibilityRole="button"
              onPress={onOpenSettings}
              testID="camera-open-settings"
            >
              <SettingsIcon color={theme.colors.text} />
            </SettingsButton>
          </Header>

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
                  {`${diagnostics.cpuWorkers} CPU · ${diagnostics.gpuWorkers} GPU`}
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

const ObjectTarget = styled(AnimatedPressable)`
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

const ObjectCard = styled.View`
  position: absolute;
  width: 208px;
  padding: 16px;
  border-radius: 20px;
  background-color: ${({ theme }) => theme.colors.overlayCard};
  elevation: 14;
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

const ObjectDefinition = styled.Text`
  margin-top: 10px;
  color: ${({ theme }) => theme.colors.overlayInk};
  font-size: 14px;
  line-height: 20px;
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

const Overlay = styled(SafeAreaView)<{ $landscape: boolean }>`
  flex: 1;
  padding-right: ${({ $landscape }) => ($landscape ? 154 : 0)}px;
  padding-bottom: ${({ $landscape }) => ($landscape ? 16 : 112)}px;
  z-index: 2;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 10px 12px 0px;
`;

const HeaderMark = styled.Pressable`
  width: 42px;
  height: 42px;
  overflow: hidden;
  border-radius: 8px;
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

const SettingsButton = styled.Pressable`
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: 21px;
  background-color: ${({ theme }) => theme.colors.glassStrong};
  elevation: 6;
`;

const DiagnosticsPanel = styled.View`
  align-self: flex-start;
  margin: 12px;
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

/** Sits under the detection layer, so tapping a card still speaks its word. */
const FreezeSurface = styled.Pressable`
  position: absolute;
  inset: 0px;
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
