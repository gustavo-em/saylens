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
import { getAppTheme } from './theme/theme';
import { useAppViewModel } from './view-models/useAppViewModel';

type AppViewModel = ReturnType<typeof useAppViewModel>;

function AppContent({ viewModel }: { viewModel: AppViewModel }) {
  const renderCamera = useCallback(
    (callbacks: CameraViewportCallbacks) => (
      <VisionCameraViewport
        isActive={viewModel.cameraIsActive}
        cameraErrorMessage={viewModel.copy.camera.previewFailed}
        detectionErrorMessage={viewModel.copy.camera.recognitionUnavailable}
        performanceCapabilities={viewModel.performanceCapabilities}
        performanceProfile={viewModel.performanceProfile}
        {...callbacks}
      />
    ),
    [
      viewModel.cameraIsActive,
      viewModel.copy.camera,
      viewModel.performanceCapabilities,
      viewModel.performanceProfile,
    ],
  );

  return (
    <Root>
      <StatusBar
        barStyle={
          viewModel.appearanceMode === 'dark' ? 'light-content' : 'dark-content'
        }
      />

      <CameraScreen
        cameraAccess={viewModel.cameraAccess}
        isActive={viewModel.cameraIsActive}
        languageSettings={viewModel.languageSettings}
        copy={viewModel.copy}
        renderCamera={renderCamera}
        vocabularyRepository={localVocabularyRepository}
      />

      {viewModel.activeTab === 'settings' ? (
        <SettingsScreen
          appearanceMode={viewModel.appearanceMode}
          copy={viewModel.copy}
          languageSettings={viewModel.languageSettings}
          onAppearanceModeChange={viewModel.changeAppearanceMode}
          onLearningLanguageChange={viewModel.changeLearningLanguage}
          onNativeLanguageChange={viewModel.changeNativeLanguage}
          onPerformanceProfileChange={viewModel.changePerformanceProfile}
          performanceCapabilities={viewModel.performanceCapabilities}
          performanceProfile={viewModel.performanceProfile}
        />
      ) : null}

      <AppTabBar
        activeTab={viewModel.activeTab}
        labels={viewModel.copy.tabs}
        onSelect={viewModel.selectTab}
      />
    </Root>
  );
}

export default function App() {
  const viewModel = useAppViewModel();

  return (
    <ThemeProvider theme={getAppTheme(viewModel.appearanceMode)}>
      <SafeAreaProvider>
        <AppContent viewModel={viewModel} />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const Root = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;
