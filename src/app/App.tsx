import { useCallback } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import styled, { ThemeProvider } from 'styled-components/native';

import { VisionCameraViewport } from '../features/learning/infrastructure/camera/VisionCameraViewport';
import { systemPronunciationPlayer } from '../features/learning/infrastructure/pronunciation/systemPronunciationPlayer';
import { localVocabularyRepository } from '../features/learning/infrastructure/vocabulary/localVocabularyRepository';
import type { CameraViewportCallbacks } from '../features/learning/presentation/models/CameraViewportCallbacks';
import { asyncStorageViewedObjectStore } from '../features/learning/infrastructure/history/asyncStorageViewedObjectStore';
import { CameraScreen } from '../features/learning/presentation/screens/CameraScreen';
import { HistoryScreen } from '../features/learning/presentation/screens/HistoryScreen';
import { SettingsScreen } from '../features/learning/presentation/screens/SettingsScreen';
import { asyncStoragePreferencesStore } from './infrastructure/preferences/asyncStoragePreferencesStore';
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
        onObjectsSeen={viewModel.recordViewedLabels}
        onOpenHistory={() => viewModel.selectTab('history')}
        onOpenSettings={() => viewModel.selectTab('settings')}
        showDiagnostics={viewModel.showDiagnostics}
        pronunciationPlayer={systemPronunciationPlayer}
        renderCamera={renderCamera}
        vocabularyRepository={localVocabularyRepository}
      />

      {viewModel.activeTab === 'history' ? (
        <HistoryScreen
          copy={viewModel.copy}
          languageSettings={viewModel.languageSettings}
          onClose={() => viewModel.selectTab('camera')}
          pronunciationPlayer={systemPronunciationPlayer}
          viewedObjects={viewModel.viewedObjects}
          vocabularyRepository={localVocabularyRepository}
        />
      ) : null}

      {viewModel.activeTab === 'settings' ? (
        <SettingsScreen
          appearanceMode={viewModel.appearanceMode}
          copy={viewModel.copy}
          languageSettings={viewModel.languageSettings}
          onAppearanceModeChange={viewModel.changeAppearanceMode}
          onClose={() => viewModel.selectTab('camera')}
          onLearningLanguageChange={viewModel.changeLearningLanguage}
          onNativeLanguageChange={viewModel.changeNativeLanguage}
          onPerformanceProfileChange={viewModel.changePerformanceProfile}
          onToggleDiagnostics={viewModel.toggleDiagnostics}
          showDiagnostics={viewModel.showDiagnostics}
          performanceCapabilities={viewModel.performanceCapabilities}
          performanceProfile={viewModel.performanceProfile}
        />
      ) : null}
    </Root>
  );
}

export default function App() {
  const viewModel = useAppViewModel(
    asyncStoragePreferencesStore,
    asyncStorageViewedObjectStore,
  );

  return (
    <ThemeProvider theme={getAppTheme(viewModel.appearanceMode)}>
      <SafeAreaProvider>
        {viewModel.isRestored ? <AppContent viewModel={viewModel} /> : <Root />}
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const Root = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;
