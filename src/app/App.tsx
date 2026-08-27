import { useCallback, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import styled, { ThemeProvider } from 'styled-components/native';

import { VisionCameraViewport } from '../features/learning/infrastructure/camera/VisionCameraViewport';
import { systemPronunciationPlayer } from '../features/learning/infrastructure/pronunciation/systemPronunciationPlayer';
import { localVocabularyRepository } from '../features/learning/infrastructure/vocabulary/localVocabularyRepository';
import type { CameraViewportCallbacks } from '../features/learning/presentation/models/CameraViewportCallbacks';
import { asyncStorageFavoriteWordStore } from '../features/learning/infrastructure/favorites/asyncStorageFavoriteWordStore';
import { asyncStorageViewedObjectStore } from '../features/learning/infrastructure/history/asyncStorageViewedObjectStore';
import { asyncStorageLearnerProgressStore } from '../features/learning/infrastructure/progress/asyncStorageLearnerProgressStore';
import { asyncStoragePronunciationProgressStore } from '../features/learning/infrastructure/progress/asyncStoragePronunciationProgressStore';
import { CameraScreen } from '../features/learning/presentation/screens/CameraScreen';
import { CollectionScreen } from '../features/learning/presentation/screens/CollectionScreen';
import { HistoryScreen } from '../features/learning/presentation/screens/HistoryScreen';
import { QuizScreen } from '../features/learning/presentation/screens/QuizScreen';
import { AppSplash } from './components/AppSplash';
import { firebaseAuthenticator } from '../features/learning/infrastructure/auth/firebaseAuthenticator';
import { ReviewInvitation } from '../features/learning/presentation/views/ReviewInvitation';
import { systemAppReviewPrompter } from '../features/learning/infrastructure/review/systemAppReviewPrompter';
import { SpeakScreen } from '../features/learning/presentation/screens/SpeakScreen';
import { systemSpeechRecognizer } from '../features/learning/infrastructure/speech/systemSpeechRecognizer';
import { SettingsScreen } from '../features/learning/presentation/screens/SettingsScreen';
import { SignInScreen } from '../features/learning/presentation/screens/SignInScreen';
import { asyncStoragePreferencesStore } from './infrastructure/preferences/asyncStoragePreferencesStore';
import { asyncStorageReviewInvitationStore } from './infrastructure/review/asyncStorageReviewInvitationStore';
import { getPerformanceProfileSettings } from '../features/learning/domain/PerformanceProfile';
import { getAppTheme } from './theme/theme';
import { useAppViewModel } from './view-models/useAppViewModel';

type AppViewModel = ReturnType<typeof useAppViewModel>;

function AppContent({ viewModel }: { viewModel: AppViewModel }) {
  const [isOpening, setIsOpening] = useState(true);
  const workerSettings = getPerformanceProfileSettings(
    viewModel.performanceProfile,
    viewModel.performanceCapabilities,
  );
  const renderCamera = useCallback(
    (callbacks: CameraViewportCallbacks, options: { isActive: boolean }) => (
      <VisionCameraViewport
        isActive={options.isActive}
        cameraErrorMessage={viewModel.copy.camera.previewFailed}
        detectionErrorMessage={viewModel.copy.camera.recognitionUnavailable}
        performanceCapabilities={viewModel.performanceCapabilities}
        performanceProfile={viewModel.performanceProfile}
        {...callbacks}
      />
    ),
    [
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
        onPractiseSpeaking={label =>
          viewModel.practiseSpeaking(label, 'camera')
        }
        diagnostics={{
          cpuWorkers: workerSettings.cpuWorkerCount,
          gpuWorkers: workerSettings.gpuWorkerCount,
          profileLabel:
            viewModel.performanceProfile === 'maximum-performance'
              ? viewModel.copy.settings.maximumPerformanceTitle
              : viewModel.copy.settings.powerSavingTitle,
        }}
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
          favorites={viewModel.favorites}
          foundLabels={viewModel.foundLabels}
          hasRestoredWords={viewModel.hasRestoredWords}
          matchedPronunciations={viewModel.matchedPronunciations}
          streakDays={viewModel.streakDays}
          onOpenCollection={() => viewModel.selectTab('collection')}
          onOpenQuiz={viewModel.openQuiz}
          onPractiseSpeaking={label =>
            viewModel.practiseSpeaking(label, 'history')
          }
          onToggleFavorite={viewModel.toggleFavoriteLabel}
          pronunciationProgress={viewModel.pronunciationProgress}
          viewedObjects={viewModel.viewedObjects}
          vocabularyRepository={localVocabularyRepository}
        />
      ) : null}

      {viewModel.activeTab === 'collection' ? (
        <CollectionScreen
          copy={viewModel.copy}
          foundLabels={viewModel.foundLabels}
          languageSettings={viewModel.languageSettings}
          matchedPronunciations={viewModel.matchedPronunciations}
          onClose={() => viewModel.selectTab('camera')}
          streakDays={viewModel.streakDays}
          vocabularyRepository={localVocabularyRepository}
        />
      ) : null}

      {viewModel.activeTab === 'speak' && viewModel.speakLabel != null ? (
        <SpeakScreen
          copy={viewModel.copy}
          label={viewModel.speakLabel}
          languageSettings={viewModel.languageSettings}
          onAttempt={viewModel.recordPronunciationResult}
          onClose={() => viewModel.selectTab(viewModel.speakReturnTab)}
          onOpenHistory={() => viewModel.selectTab('history')}
          onReturnToCamera={() => viewModel.selectTab('camera')}
          pronunciationProgress={viewModel.pronunciationProgress}
          pronunciationPlayer={systemPronunciationPlayer}
          speechRecognizer={systemSpeechRecognizer}
          vocabularyRepository={localVocabularyRepository}
        />
      ) : null}

      {viewModel.activeTab === 'quiz' ? (
        <QuizScreen
          copy={viewModel.copy}
          labels={viewModel.quizLabels}
          languageSettings={viewModel.languageSettings}
          onClose={() => viewModel.selectTab('history')}
          pronunciationPlayer={systemPronunciationPlayer}
          vocabularyRepository={localVocabularyRepository}
        />
      ) : null}

      {viewModel.activeTab === 'account' ? (
        <SignInScreen
          copy={viewModel.copy}
          onClose={() => viewModel.selectTab('settings')}
          onSignInWithGoogle={viewModel.signInWithGoogle}
          signInError={viewModel.signInError}
          user={viewModel.user}
        />
      ) : null}

      {viewModel.activeTab === 'settings' ? (
        <SettingsScreen
          appearanceMode={viewModel.appearanceMode}
          copy={viewModel.copy}
          languageSettings={viewModel.languageSettings}
          onAppearanceModeChange={viewModel.changeAppearanceMode}
          onClose={() => viewModel.selectTab('camera')}
          onOpenAccount={() => viewModel.selectTab('account')}
          onLearningLanguageChange={viewModel.changeLearningLanguage}
          onNativeLanguageChange={viewModel.changeNativeLanguage}
          onPerformanceProfileChange={viewModel.changePerformanceProfile}
          onToggleDiagnostics={viewModel.toggleDiagnostics}
          showDiagnostics={viewModel.showDiagnostics}
          performanceCapabilities={viewModel.performanceCapabilities}
          performanceProfile={viewModel.performanceProfile}
        />
      ) : null}

      {isOpening ? (
        <AppSplash
          isReady={viewModel.hasRestoredWords}
          onFinished={() => setIsOpening(false)}
        />
      ) : null}

      {viewModel.isInvitingReview ? (
        <ReviewInvitation
          copy={viewModel.copy}
          onDismiss={viewModel.dismissReviewInvitation}
          onNever={viewModel.declineReviewInvitation}
          onRate={() => {
            viewModel.acceptReviewInvitation();
            systemAppReviewPrompter
              .requestReview()
              .catch(() => undefined)
              .finally(viewModel.dismissReviewInvitation);
          }}
        />
      ) : null}
    </Root>
  );
}

export default function App() {
  const viewModel = useAppViewModel(
    asyncStoragePreferencesStore,
    asyncStorageViewedObjectStore,
    asyncStorageFavoriteWordStore,
    asyncStoragePronunciationProgressStore,
    asyncStorageLearnerProgressStore,
    asyncStorageReviewInvitationStore,
    firebaseAuthenticator,
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
