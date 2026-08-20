import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

import type { CameraViewportCallbacks } from '../models/CameraViewportCallbacks';
import type { CameraViewModel } from '../view-models/useCameraViewModel';

interface CameraViewProps {
  renderCamera: (callbacks: CameraViewportCallbacks) => ReactNode;
  showGuidance: boolean;
  viewModel: CameraViewModel;
}

export function CameraView({
  renderCamera,
  showGuidance,
  viewModel,
}: CameraViewProps) {
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

  return (
    <Container>
      {renderCamera(viewModel.viewportCallbacks)}
      <Scrim pointerEvents="none" />

      <Overlay edges={['top']}>
        <Header>
          <BrandGroup>
            <Brand>SpellForMe</Brand>
            <Caption>Explore o inglês ao seu redor</Caption>
          </BrandGroup>

          <LiveBadge>
            <LiveDot $ready={viewModel.isCameraLive} />
            <LiveText>
              {viewModel.isCameraLive ? 'AO VIVO' : 'INICIANDO'}
            </LiveText>
          </LiveBadge>
        </Header>

        {showGuidance ? (
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

        {viewModel.cameraError != null ? (
          <ErrorBanner>
            <ErrorText>{viewModel.cameraError}</ErrorText>
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
