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

import type { DetectedObject } from '../../domain/DetectedObject';
import type { CameraViewportCallbacks } from '../models/CameraViewportCallbacks';
import type { CameraViewModel } from '../view-models/useCameraViewModel';

interface CameraViewProps {
  renderCamera: (callbacks: CameraViewportCallbacks) => ReactNode;
  showGuidance: boolean;
  viewModel: CameraViewModel;
}

interface ViewportSize {
  width: number;
  height: number;
}

const OBJECT_CARD_WIDTH = 190;
const OBJECT_CARD_EDGE_INSET = 8;
const OBJECT_CARD_TOP_OFFSET = -57;
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
  const maximumLeft =
    viewport.width -
    targetStyle.left -
    OBJECT_CARD_WIDTH -
    OBJECT_CARD_EDGE_INSET;

  return {
    left: Math.max(minimumLeft, Math.min(-2, maximumLeft)),
    top:
      targetStyle.top >=
      Math.abs(OBJECT_CARD_TOP_OFFSET) + OBJECT_CARD_EDGE_INSET
        ? OBJECT_CARD_TOP_OFFSET
        : OBJECT_CARD_EDGE_INSET,
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
  renderCamera,
  showGuidance,
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
              A câmera é o começo
            </PermissionTitle>
            <PermissionBody>
              O SpellForMe precisa da câmera para mostrar os objetos ao seu
              redor. Nenhuma imagem é enviada para um servidor.
            </PermissionBody>
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
  const recognitionStatus =
    viewModel.recognitionError != null
      ? 'INDISPONÍVEL'
      : detectionFrame == null
      ? 'ANALISANDO'
      : detectionFrame.objects.length === 0
      ? 'PROCURANDO'
      : `${detectionFrame.objects.length} ${
          detectionFrame.objects.length === 1 ? 'OBJETO' : 'OBJETOS'
        }`;
  const displayedError = viewModel.cameraError ?? viewModel.recognitionError;
  const detectorAccessibilityLabel =
    detectionFrame == null
      ? `Detector: ${recognitionStatus}`
      : `Detector: ${recognitionStatus}, inferência ${Math.round(
          detectionFrame.inferenceTimeMs,
        )} milissegundos`;

  return (
    <Container onLayout={handleLayout} testID="camera-container">
      {renderCamera(viewModel.viewportCallbacks)}
      <Scrim pointerEvents="none" />

      {detectionFrame != null && viewport.width > 0 ? (
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
                accessibilityLabel={`${vocabulary.word}, ${
                  vocabulary.meaning
                }. Pronúncia: ${
                  vocabulary.pronunciationHint
                }. Confiança ${Math.round(object.confidence * 100)}%`}
                durationMs={viewModel.detectionInterpolationDurationMs}
                key={object.id}
                targetStyle={targetStyle}
                testID={`detected-object-${object.id}`}
              >
                <ObjectCard style={getObjectCardStyle(targetStyle, viewport)}>
                  <ObjectCardHeader>
                    <ObjectWord numberOfLines={1}>{vocabulary.word}</ObjectWord>
                    <ObjectConfidence>
                      {Math.round(object.confidence * 100)}%
                    </ObjectConfidence>
                  </ObjectCardHeader>
                  <ObjectLearningHint numberOfLines={1}>
                    {vocabulary.meaning} · {vocabulary.pronunciationHint}
                  </ObjectLearningHint>
                </ObjectCard>
              </InterpolatedObjectTarget>
            );
          })}
        </DetectionLayer>
      ) : null}

      <Overlay edges={['top']} pointerEvents="box-none">
        <Header>
          <BrandGroup>
            <Brand>SpellForMe</Brand>
            <Caption>Explore o inglês ao seu redor</Caption>
          </BrandGroup>

          <LiveBadge accessibilityLabel={detectorAccessibilityLabel} accessible>
            <LiveDot
              $ready={
                viewModel.isCameraLive && viewModel.recognitionError == null
              }
            />
            <LiveText>{recognitionStatus}</LiveText>
          </LiveBadge>
        </Header>

        {showGuidance && viewModel.detectionItems.length === 0 ? (
          <FocusArea pointerEvents="none">
            <TopLeftCorner />
            <TopRightCorner />
            <BottomLeftCorner />
            <BottomRightCorner />
            <GuidancePill>
              <GuidanceText>APONTE PARA UM OBJETO</GuidanceText>
            </GuidancePill>
          </FocusArea>
        ) : null}

        {displayedError != null ? (
          <ErrorBanner>
            <ErrorText>{displayedError}</ErrorText>
          </ErrorBanner>
        ) : null}
      </Overlay>
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
  background-color: rgba(1, 12, 8, 0.12);
`;

const DetectionLayer = styled.View`
  position: absolute;
  inset: 0px;
`;

const ObjectTarget = styled(Animated.View)`
  position: absolute;
  min-width: 42px;
  min-height: 42px;
  border: 2px solid ${({ theme }) => theme.colors.accent};
  border-radius: 10px;
  background-color: rgba(7, 19, 15, 0.08);
`;

const ObjectCard = styled.View`
  position: absolute;
  width: ${OBJECT_CARD_WIDTH}px;
  padding: 8px 10px;
  border: 1px solid rgba(112, 241, 181, 0.38);
  border-radius: 9px;
  background-color: rgba(7, 19, 15, 0.92);
`;

const ObjectCardHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const ObjectWord = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.accent};
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.4px;
`;

const ObjectLearningHint = styled.Text`
  flex-shrink: 1;
  margin-top: 3px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 11px;
  font-weight: 600;
`;

const ObjectConfidence = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: 10px;
  font-weight: 800;
`;

const Overlay = styled(SafeAreaView)`
  flex: 1;
  padding-bottom: 112px;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 0px;
`;

const BrandGroup = styled.View``;

const Brand = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.6px;
`;

const Caption = styled.Text`
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: 12px;
  margin-top: 2px;
`;

const LiveBadge = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 7px;
  padding: 8px 11px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: rgba(7, 19, 15, 0.78);
`;

const LiveDot = styled.View<{ $ready: boolean }>`
  width: 7px;
  height: 7px;
  border-radius: 4px;
  background-color: ${({ $ready, theme }) =>
    $ready ? theme.colors.accent : '#8A9A93'};
`;

const LiveText = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
`;

const FocusArea = styled.View`
  width: 280px;
  height: 250px;
  align-self: center;
  align-items: center;
  justify-content: flex-end;
  margin: auto 0px;
`;

const FocusCorner = styled.View`
  position: absolute;
  width: 34px;
  height: 34px;
  border-color: rgba(112, 241, 181, 0.78);
`;

const TopLeftCorner = styled(FocusCorner)`
  top: 0px;
  left: 0px;
  border-top-width: 2px;
  border-left-width: 2px;
`;

const TopRightCorner = styled(FocusCorner)`
  top: 0px;
  right: 0px;
  border-top-width: 2px;
  border-right-width: 2px;
`;

const BottomLeftCorner = styled(FocusCorner)`
  bottom: 0px;
  left: 0px;
  border-bottom-width: 2px;
  border-left-width: 2px;
`;

const BottomRightCorner = styled(FocusCorner)`
  right: 0px;
  bottom: 0px;
  border-right-width: 2px;
  border-bottom-width: 2px;
`;

const GuidancePill = styled.View`
  padding: 9px 16px;
  margin-bottom: 20px;
  border-radius: ${({ theme }) => theme.radii.pill}px;
  background-color: rgba(7, 19, 15, 0.8);
`;

const GuidanceText = styled.Text`
  color: ${({ theme }) => theme.colors.accent};
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.4px;
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
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.extraLarge}px;
  background-color: ${({ theme }) => theme.colors.card};
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
