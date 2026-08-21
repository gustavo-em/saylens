import { useCallback, useState, type ReactNode } from 'react';
import { Modal, type LayoutChangeEvent } from 'react-native';
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
        <DetectionLayer pointerEvents="box-none">
          {detectionFrame.objects.map(object => (
            <ObjectTarget
              accessibilityHint="Abre o significado e a pronúncia"
              accessibilityLabel={`Aprender a palavra ${object.label}`}
              accessibilityRole="button"
              hitSlop={8}
              key={object.id}
              onPress={() => viewModel.onObjectPress(object)}
              style={getObjectStyle(
                object,
                detectionFrame.sourceWidth,
                detectionFrame.sourceHeight,
                viewport,
              )}
              testID={`detected-object-${object.id}`}
            >
              <ObjectLabel>
                <ObjectLabelText numberOfLines={1}>
                  {object.label.toUpperCase()}
                </ObjectLabelText>
                <ObjectConfidence>
                  {Math.round(object.confidence * 100)}%
                </ObjectConfidence>
              </ObjectLabel>
            </ObjectTarget>
          ))}
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

        {showGuidance && viewModel.detections.length === 0 ? (
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

      <Modal
        animationType="fade"
        onRequestClose={viewModel.dismissObject}
        statusBarTranslucent
        transparent
        visible={viewModel.selectedVocabulary != null}
      >
        <ModalSurface>
          <ModalDismissArea
            accessibilityLabel="Fechar detalhes da palavra"
            accessibilityRole="button"
            onPress={viewModel.dismissObject}
          />

          {viewModel.selectedVocabulary != null &&
          viewModel.selectedObject != null ? (
            <WordCard>
              <WordEyebrow>VOCÊ ENCONTROU</WordEyebrow>
              <WordTitle>{viewModel.selectedVocabulary.word}</WordTitle>
              <Pronunciation>
                {viewModel.selectedVocabulary.pronunciation}
              </Pronunciation>
              <PronunciationHint>
                Fale assim: {viewModel.selectedVocabulary.pronunciationHint}
              </PronunciationHint>

              <Divider />

              <DetailLabel>EM PORTUGUÊS</DetailLabel>
              <Meaning>{viewModel.selectedVocabulary.meaning}</Meaning>
              <DetailLabel>EXEMPLO</DetailLabel>
              <Example>“{viewModel.selectedVocabulary.example}”</Example>
              <ConfidenceText>
                Confiança do modelo:{' '}
                {Math.round(viewModel.selectedObject.confidence * 100)}%
              </ConfidenceText>

              <CloseButton
                accessibilityRole="button"
                onPress={viewModel.dismissObject}
                testID="close-word-modal"
              >
                <CloseButtonText>CONTINUAR EXPLORANDO</CloseButtonText>
              </CloseButton>
            </WordCard>
          ) : null}
        </ModalSurface>
      </Modal>
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

const ObjectTarget = styled.Pressable`
  position: absolute;
  min-width: 42px;
  min-height: 42px;
  border: 2px solid ${({ theme }) => theme.colors.accent};
  border-radius: 10px;
  background-color: rgba(7, 19, 15, 0.08);
`;

const ObjectLabel = styled.View`
  position: absolute;
  top: -31px;
  left: -2px;
  max-width: 190px;
  flex-direction: row;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const ObjectLabelText = styled.Text`
  flex-shrink: 1;
  color: ${({ theme }) => theme.colors.background};
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.6px;
`;

const ObjectConfidence = styled.Text`
  color: rgba(7, 19, 15, 0.68);
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

const ModalSurface = styled.View`
  flex: 1;
  align-items: center;
  justify-content: flex-end;
  padding: 24px 20px 34px;
  background-color: rgba(0, 0, 0, 0.62);
`;

const ModalDismissArea = styled.Pressable`
  position: absolute;
  inset: 0px;
`;

const WordCard = styled.View`
  width: 100%;
  padding: 28px 24px 22px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.extraLarge}px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const WordEyebrow = styled.Text`
  color: ${({ theme }) => theme.colors.accent};
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.6px;
`;

const WordTitle = styled.Text`
  margin-top: 7px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 40px;
  font-weight: 900;
  letter-spacing: -1px;
`;

const Pronunciation = styled.Text`
  margin-top: 3px;
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: 17px;
`;

const PronunciationHint = styled.Text`
  align-self: flex-start;
  margin-top: 12px;
  padding: 8px 11px;
  border-radius: 9px;
  color: ${({ theme }) => theme.colors.background};
  font-size: 12px;
  font-weight: 800;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const Divider = styled.View`
  height: 1px;
  margin: 23px 0px 20px;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const DetailLabel = styled.Text`
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.2px;
`;

const Meaning = styled.Text`
  margin-top: 5px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 20px;
  font-weight: 700;
`;

const Example = styled.Text`
  margin-top: 5px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-style: italic;
  line-height: 23px;
`;

const ConfidenceText = styled.Text`
  margin-top: 19px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 11px;
`;

const CloseButton = styled.Pressable`
  margin-top: 22px;
  padding: 15px 18px;
  border-radius: ${({ theme }) => theme.radii.medium}px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const CloseButtonText = styled.Text`
  color: ${({ theme }) => theme.colors.background};
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1.1px;
  text-align: center;
`;
