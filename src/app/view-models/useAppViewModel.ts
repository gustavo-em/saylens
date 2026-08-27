import { useCallback, useEffect, useRef, useState } from 'react';

import type { LearningLanguage } from '../../features/learning/domain/LearningLanguage';
import type { PerformanceProfile } from '../../features/learning/domain/PerformanceProfile';
import { useVisionCameraAccess } from '../../features/learning/infrastructure/camera/useVisionCameraAccess';
import { getPerformanceCapabilities } from '../../features/learning/infrastructure/performance/getPerformanceCapabilities';
import { getLearningCopy } from '../../features/learning/presentation/localization/learningCopy';
import type { FavoriteWordStore } from '../../features/learning/application/ports/FavoriteWordStore';
import type { LearnerProgressStore } from '../../features/learning/application/ports/LearnerProgressStore';
import type { PronunciationProgressStore } from '../../features/learning/application/ports/PronunciationProgressStore';
import type { ViewedObjectStore } from '../../features/learning/application/ports/ViewedObjectStore';
import {
  sanitizeFavorites,
  toggleFavorite,
  type FavoriteWord,
} from '../../features/learning/domain/FavoriteWord';
import {
  EMPTY_LEARNER_PROGRESS,
  getStreakDays,
  recordFoundLabels,
  sanitizeLearnerProgress,
  type LearnerProgress,
} from '../../features/learning/domain/LearnerProgress';
import {
  getPronunciationStatus,
  recordPronunciationAttempt,
  sanitizePronunciationProgress,
  type PronunciationProgressEntry,
} from '../../features/learning/domain/PronunciationProgress';
import {
  recordViewedObjects,
  sanitizeViewedObjects,
  type ViewedObject,
} from '../../features/learning/domain/ViewedObject';
import type { PreferencesStore } from '../application/ports/PreferencesStore';
import {
  DEFAULT_APP_PREFERENCES,
  sanitizeAppPreferences,
  type AppPreferences,
} from '../domain/AppPreferences';
import type {
  AuthenticatedUser,
  Authenticator,
} from '../../features/learning/application/ports/Authenticator';
import type { ReviewInvitationStore } from '../../features/learning/application/ports/ReviewInvitationStore';
import {
  EMPTY_REVIEW_INVITATION,
  recordDeclined,
  recordInvitationShown,
  recordPronunciationSuccess,
  recordRated,
  shouldInviteReview,
  type ReviewInvitationState,
} from '../../features/learning/domain/ReviewInvitation';
import type { AppTab } from '../navigation/AppTab';
import type { AppearanceMode } from '../theme/theme';

export function useAppViewModel(
  preferencesStore: PreferencesStore,
  viewedObjectStore: ViewedObjectStore,
  favoriteWordStore: FavoriteWordStore,
  pronunciationProgressStore: PronunciationProgressStore,
  learnerProgressStore: LearnerProgressStore,
  reviewInvitationStore: ReviewInvitationStore,
  authenticator: Authenticator,
) {
  const [performanceCapabilities] = useState(getPerformanceCapabilities);
  const [activeTab, setActiveTab] = useState<AppTab>('camera');
  /** False until the stored words have been read back. Before that the list is
   * empty because nothing has loaded, not because nothing was found. */
  const [hasRestoredWords, setHasRestoredWords] = useState(false);
  const [reviewInvitation, setReviewInvitation] =
    useState<ReviewInvitationState>(EMPTY_REVIEW_INVITATION);
  const [isInvitingReview, setIsInvitingReview] = useState(false);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);
  /** Set when a round is opened for a particular set of words, such as the
   * ones due for review, and cleared when practice is opened at large. */
  const [reviewLabels, setReviewLabels] = useState<readonly string[] | null>(
    null,
  );
  const [preferences, setPreferences] = useState<AppPreferences>(() => ({
    ...DEFAULT_APP_PREFERENCES,
    performanceProfile: performanceCapabilities.recommendedProfile,
  }));
  // Preferences are only rendered once they have been read from storage, so the
  // theme never flashes and the detector is never configured with a profile the
  // user did not choose.
  const [isRestored, setIsRestored] = useState(false);
  const [viewedObjects, setViewedObjects] = useState<ViewedObject[]>([]);
  const [favorites, setFavorites] = useState<FavoriteWord[]>([]);
  const [pronunciationProgress, setPronunciationProgress] = useState<
    readonly PronunciationProgressEntry[]
  >([]);
  const [learnerProgress, setLearnerProgress] = useState<LearnerProgress>(
    EMPTY_LEARNER_PROGRESS,
  );
  const [speakLabel, setSpeakLabel] = useState<string | null>(null);
  // Practising can start from the camera or from history, and closing has to
  // land back where the learner came from.
  const [speakReturnTab, setSpeakReturnTab] = useState<AppTab>('history');
  const cameraAccess = useVisionCameraAccess();

  useEffect(() => {
    let isCurrent = true;

    reviewInvitationStore
      .load()
      .then(stored => {
        if (isCurrent && stored != null) setReviewInvitation(stored);
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [reviewInvitationStore]);

  useEffect(() => {
    let isCurrent = true;

    viewedObjectStore
      .load()
      .then(stored => {
        if (!isCurrent) return;

        setViewedObjects(sanitizeViewedObjects(stored));
        setHasRestoredWords(true);
      })
      .catch(() => {
        // A store that cannot be read is an empty list, not a permanent
        // loading state.
        if (isCurrent) setHasRestoredWords(true);
      });

    return () => {
      isCurrent = false;
    };
  }, [viewedObjectStore]);

  useEffect(() => {
    let isCurrent = true;

    favoriteWordStore
      .load()
      .then(stored => {
        if (isCurrent) setFavorites(sanitizeFavorites(stored));
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [favoriteWordStore]);

  useEffect(() => {
    let isCurrent = true;

    pronunciationProgressStore
      .load()
      .then(stored => {
        if (isCurrent) {
          setPronunciationProgress(sanitizePronunciationProgress(stored));
        }
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [pronunciationProgressStore]);

  const saveReviewInvitation = useCallback(
    (next: ReviewInvitationState) => {
      setReviewInvitation(next);
      reviewInvitationStore.save(next).catch(() => undefined);
    },
    [reviewInvitationStore],
  );

  const recordPronunciationResult = useCallback(
    (label: string, matched: boolean) => {
      if (matched) {
        // Asking right after something went right is the only honest moment
        // to ask; the rules for how often live in the domain.
        const counted = recordPronunciationSuccess(reviewInvitation);

        if (shouldInviteReview(counted, Date.now())) {
          saveReviewInvitation(recordInvitationShown(counted, Date.now()));
          setIsInvitingReview(true);
        } else {
          saveReviewInvitation(counted);
        }
      }

      setPronunciationProgress(current => {
        const next = recordPronunciationAttempt(
          current,
          label,
          matched,
          Date.now(),
        );
        if (next === current) return current;

        pronunciationProgressStore.save(next).catch(() => undefined);
        return next;
      });
    },
    [pronunciationProgressStore, reviewInvitation, saveReviewInvitation],
  );

  useEffect(() => authenticator.subscribe(setUser), [authenticator]);

  const signInWithGoogle = useCallback(async () => {
    setSignInError(null);

    try {
      await authenticator.signInWithGoogle();
    } catch (error) {
      // Closing the Google sheet is a decision, not a failure, and the screen
      // says nothing about it.
      if ((error as Error).name === 'SignInCancelledError') return;

      setSignInError((error as Error).message);
    }
  }, [authenticator]);

  const signOut = useCallback(async () => {
    await authenticator.signOut().catch(() => undefined);
  }, [authenticator]);

  const dismissReviewInvitation = useCallback(() => {
    setIsInvitingReview(false);
  }, []);

  const declineReviewInvitation = useCallback(() => {
    saveReviewInvitation(recordDeclined(reviewInvitation));
    setIsInvitingReview(false);
  }, [reviewInvitation, saveReviewInvitation]);

  const acceptReviewInvitation = useCallback(() => {
    saveReviewInvitation(recordRated(reviewInvitation));
  }, [reviewInvitation, saveReviewInvitation]);

  const toggleFavoriteLabel = useCallback(
    (label: string) => {
      setFavorites(current => {
        const next = toggleFavorite(current, label, Date.now());
        favoriteWordStore.save(next).catch(() => undefined);
        return next;
      });
    },
    [favoriteWordStore],
  );

  useEffect(() => {
    let isCurrent = true;

    learnerProgressStore
      .load()
      .then(stored => {
        if (isCurrent) setLearnerProgress(sanitizeLearnerProgress(stored));
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [learnerProgressStore]);

  const recordViewedLabels = useCallback(
    (labels: readonly string[]) => {
      setLearnerProgress(current => {
        const next = recordFoundLabels(current, labels, Date.now());
        if (next === current) return current;

        learnerProgressStore.save(next).catch(() => undefined);
        return next;
      });

      setViewedObjects(current => {
        const next = recordViewedObjects(current, labels, Date.now());
        if (
          next.length === current.length &&
          next[0]?.label === current[0]?.label
        ) {
          return current;
        }

        viewedObjectStore.save(next).catch(() => undefined);
        return next;
      });
    },
    [learnerProgressStore, viewedObjectStore],
  );

  useEffect(() => {
    let isCurrent = true;

    preferencesStore
      .load()
      .then(stored => {
        if (!isCurrent) return;

        setPreferences(current =>
          sanitizeAppPreferences(
            stored,
            current,
            performanceCapabilities.supportedProfiles,
          ),
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (isCurrent) setIsRestored(true);
      });

    return () => {
      isCurrent = false;
    };
  }, [performanceCapabilities.supportedProfiles, preferencesStore]);

  const hasSettledAfterRestore = useRef(false);

  useEffect(() => {
    if (!isRestored) return;

    // Skip the pass that follows the restore itself, so reading from storage
    // never writes straight back and defaults never overwrite a saved choice.
    if (!hasSettledAfterRestore.current) {
      hasSettledAfterRestore.current = true;
      return;
    }

    preferencesStore.save(preferences).catch(() => undefined);
  }, [isRestored, preferences, preferencesStore]);

  const updatePreference = useCallback(
    <Key extends keyof AppPreferences>(
      key: Key,
      value: AppPreferences[Key],
    ) => {
      setPreferences(current =>
        current[key] === value ? current : { ...current, [key]: value },
      );
    },
    [],
  );

  const selectTab = useCallback((tab: AppTab) => {
    setActiveTab(tab);
  }, []);

  const practiseSpeaking = useCallback(
    (label: string, returnTab: AppTab = 'history') => {
      setSpeakLabel(label);
      setSpeakReturnTab(returnTab);
      setActiveTab('speak');
    },
    [],
  );

  const changeNativeLanguage = useCallback(
    (language: LearningLanguage) =>
      updatePreference('nativeLanguage', language),
    [updatePreference],
  );

  const changeLearningLanguage = useCallback(
    (language: LearningLanguage) =>
      updatePreference('learningLanguage', language),
    [updatePreference],
  );

  const changePerformanceProfile = useCallback(
    (profile: PerformanceProfile) =>
      updatePreference('performanceProfile', profile),
    [updatePreference],
  );

  const toggleDiagnostics = useCallback(
    (enabled: boolean) => updatePreference('showDiagnostics', enabled),
    [updatePreference],
  );

  const changeAppearanceMode = useCallback(
    (mode: AppearanceMode) => updatePreference('appearanceMode', mode),
    [updatePreference],
  );

  return {
    activeTab,
    appearanceMode: preferences.appearanceMode,
    cameraAccess,
    cameraIsActive: activeTab === 'camera',
    changeAppearanceMode,
    changeLearningLanguage,
    changeNativeLanguage,
    changePerformanceProfile,
    isRestored,
    recordViewedLabels,
    selectTab,
    favorites,
    // Practice draws on everything the learner has met: what is still in
    // history plus everything kept as a favourite.
    hasRestoredWords,
    quizLabels:
      reviewLabels ??
      Array.from(
        new Set([
          ...viewedObjects.map(entry => entry.label),
          ...favorites.map(entry => entry.label),
        ]),
      ),
    /** Opens a round. Given a set of words, the round asks only about those. */
    openQuiz: (labels?: readonly string[]) => {
      setReviewLabels(labels != null && labels.length > 0 ? labels : null);
      setActiveTab('quiz');
    },
    practiseSpeaking,
    foundLabels: learnerProgress.foundLabels,
    streakDays: getStreakDays(learnerProgress, Date.now()),
    matchedPronunciations: pronunciationProgress.filter(
      entry => entry.status === 'matched',
    ).length,
    pronunciationProgress,
    pronunciationStatusOf: (label: string) =>
      getPronunciationStatus(pronunciationProgress, label),
    recordPronunciationResult,
    user,
    signInError,
    signInWithGoogle,
    signOut,
    isInvitingReview,
    acceptReviewInvitation,
    declineReviewInvitation,
    dismissReviewInvitation,
    showDiagnostics: preferences.showDiagnostics,
    speakLabel,
    speakReturnTab,
    toggleFavoriteLabel,
    toggleDiagnostics,
    viewedObjects,
    languageSettings: {
      nativeLanguage: preferences.nativeLanguage,
      learningLanguage: preferences.learningLanguage,
    },
    performanceCapabilities,
    performanceProfile: preferences.performanceProfile,
    copy: getLearningCopy(preferences.nativeLanguage),
  };
}
