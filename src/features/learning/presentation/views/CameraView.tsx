import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

import { AppMark } from '../../../../app/components/AppMark';
import type { DetectedObject } from '../../domain/DetectedObject';
import type { LearningCopy } from '../localization/learningCopy';
import type { CameraViewportCallbacks } from '../models/CameraViewportCallbacks';
import type { CameraViewModel } from '../view-models/useCameraViewModel';

interface CameraViewProps {
  copy: LearningCopy;
  isActive: boolean;
  renderCamera: (callbacks: CameraViewportCallbacks) => ReactNode;
  viewModel: CameraViewModel;
}

interface ViewportSize {
  width: number;
  height: number;
}

const OBJECT_CARD_WIDTH = 190;
const OBJECT_CARD_EDGE_INSET = 8;
const OBJECT_CARD_ESTIMATED_HEIGHT = 76;
const OBJECT_CARD_TOP_SAFE_INSET = 92;
const OBJECT_CARD_BOTTOM_SAFE_INSET = 116;
const OBJECT_INTERPOLATION_EASING = Easing.out(Easing.cubic);

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
  accessibilityLabel: string;
  children: ReactNode;
  durationMs: number;
  targetStyle: ReturnType<typeof getObjectStyle>;
  testID: string;
}

function InterpolatedObjectTarget({
  accessibilityLabel,
  children,
  durationMs,
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
      accessibilityLabel={accessibilityLabel}
      accessible
      style={animatedStyle}
      testID={testID}
    >
      {children}
    </ObjectTarget>
  );
}

export function CameraView({
  copy,
  isActive,
  renderCamera,
  viewModel,
}: CameraViewProps) {
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
  const recognitionStatus =
    viewModel.recognitionError != null
      ? copy.camera.unavailable
      : detectionFrame == null
      ? copy.camera.analyzing
      : detectionFrame.objects.length === 0
      ? copy.camera.searching
      : copy.camera.objectsDetected(detectionFrame.objects.length);
  const displayedError = viewModel.cameraError ?? viewModel.recognitionError;
  const detectorAccessibilityLabel =
    detectionFrame == null
      ? copy.camera.detectorAccessibility(recognitionStatus)
      : copy.camera.detectorAccessibility(
          recognitionStatus,
          Math.round(detectionFrame.inferenceTimeMs),
        );

  return (
    <Container onLayout={handleLayout} testID="camera-container">
      {renderCamera(viewModel.viewportCallbacks)}
      {isActive ? <Scrim pointerEvents="none" /> : null}

      {isActive && detectionFrame != null && viewport.width > 0 ? (
        <DetectionLayer pointerEvents="none">
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
                key={object.id}
                targetStyle={targetStyle}
                testID={`detected-object-${object.id}`}
              >
                <ObjectCard style={getObjectCardStyle(targetStyle, viewport)}>
                  <ObjectCardSheen pointerEvents="none" />
                  <ObjectCardHeader>
                    <ObjectIdentity>
                      <LearningBadge>Aa</LearningBadge>
                      <ObjectWord numberOfLines={1}>
                        {vocabulary.word}
                      </ObjectWord>
                    </ObjectIdentity>
                  </ObjectCardHeader>
                  <ObjectDetails>
                    <ObjectDetail>
                      <ObjectDetailLabel>
                        {copy.camera.meaningLabel}
                      </ObjectDetailLabel>
                      <ObjectDetailValue numberOfLines={1}>
                        {vocabulary.meaning}
                      </ObjectDetailValue>
                    </ObjectDetail>
                    <ObjectDetailDivider />
                    <ObjectDetail>
                      <ObjectDetailLabel>
                        {copy.camera.pronunciationLabel}
                      </ObjectDetailLabel>
                      <ObjectDetailValue numberOfLines={1}>
                        {vocabulary.pronunciationHint}
                      </ObjectDetailValue>
                    </ObjectDetail>
                  </ObjectDetails>
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
            <HeaderMark accessibilityLabel="SpellForMe" accessible>
              <AppMark height={42} testID="camera-brand-logo" width={42} />
            </HeaderMark>
            <ObjectCountBadge
              accessibilityLabel={detectorAccessibilityLabel}
              accessible
            >
              <ObjectCountDot />
              <ObjectCountText>
                {copy.camera.objectsDetected(
                  detectionFrame?.objects.length ?? 0,
                )}
              </ObjectCountText>
            </ObjectCountBadge>
          </Header>

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
  border: 1.5px solid rgba(100, 166, 255, 0.92);
  border-radius: 14px;
  background-color: rgba(26, 111, 236, 0.09);
`;

const ObjectCard = styled.View`
  position: absolute;
  width: ${OBJECT_CARD_WIDTH}px;
  overflow: hidden;
  padding: 11px;
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: 16px;
  background-color: ${({ theme }) => theme.colors.glassStrong};
  elevation: 12;
`;

const ObjectCardSheen = styled.View`
  position: absolute;
  top: 0px;
  right: 14px;
  left: 14px;
  height: 1px;
  background-color: ${({ theme }) => theme.colors.glassHighlight};
`;

const ObjectCardHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const ObjectIdentity = styled.View`
  flex: 1;
  flex-direction: row;
  align-items: center;
  gap: 7px;
`;

const LearningBadge = styled.Text`
  width: 28px;
  height: 28px;
  overflow: hidden;
  border-radius: 9px;
  border: 1px solid rgba(184, 217, 255, 0.28);
  background-color: ${({ theme }) => theme.colors.glassBlue};
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  line-height: 28px;
  text-align: center;
`;

const ObjectWord = styled.Text`
  flex: 1;
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.4px;
`;

const ObjectDetails = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 9px;
  padding: 7px 8px;
  border-radius: 9px;
  border: 1px solid rgba(133, 183, 255, 0.18);
  background-color: rgba(26, 111, 236, 0.18);
`;

const ObjectDetail = styled.View`
  flex: 1;
  min-width: 0px;
`;

const ObjectDetailLabel = styled.Text`
  color: #82b5ff;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.9px;
`;

const ObjectDetailValue = styled.Text`
  margin-top: 2px;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
`;

const ObjectDetailDivider = styled.View`
  width: 1px;
  height: 26px;
  margin: 0px 8px;
  background-color: rgba(130, 181, 255, 0.35);
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

const HeaderMark = styled.View`
  width: 42px;
  height: 42px;
  overflow: hidden;
  border-radius: 8px;
  elevation: 8;
`;

const ObjectCountBadge = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: ${({ theme }) => theme.colors.glass};
  elevation: 6;
`;

const ObjectCountDot = styled.View`
  width: 5px;
  height: 5px;
  border-radius: 3px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const ObjectCountText = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.8px;
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
