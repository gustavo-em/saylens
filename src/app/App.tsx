import { useCallback } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import styled, { ThemeProvider } from 'styled-components/native';

import { VisionCameraViewport } from '../features/learning/infrastructure/camera/VisionCameraViewport';
import { localVocabularyRepository } from '../features/learning/infrastructure/vocabulary/localVocabularyRepository';
import type { CameraViewportCallbacks } from '../features/learning/presentation/models/CameraViewportCallbacks';
import { CameraScreen } from '../features/learning/presentation/screens/CameraScreen';
import { SettingsScreen } from '../features/learning/presentation/screens/SettingsScreen';
import { AppTabBar } from './navigation/AppTabBar';
import { appTheme } from './theme/theme';
import { useAppViewModel } from './view-models/useAppViewModel';

function AppContent() {
  const viewModel = useAppViewModel();

  const renderCamera = useCallback(
    (callbacks: CameraViewportCallbacks) => (
      <VisionCameraViewport
        isActive={viewModel.cameraIsActive}
        {...callbacks}
      />
    ),
    [viewModel.cameraIsActive],
  );

  return (
    <Root>
      <StatusBar barStyle="light-content" />

      <CameraScreen
        cameraAccess={viewModel.cameraAccess}
        isActive={viewModel.cameraIsActive}
        renderCamera={renderCamera}
        showGuidance={viewModel.showGuidance}
        vocabularyRepository={localVocabularyRepository}
      />

      {viewModel.activeTab === 'settings' ? (
        <SettingsScreen
          onShowGuidanceChange={viewModel.changeGuidanceVisibility}
          showGuidance={viewModel.showGuidance}
        />
      ) : null}

      <AppTabBar
        activeTab={viewModel.activeTab}
        onSelect={viewModel.selectTab}
      />
    </Root>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const Root = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;
