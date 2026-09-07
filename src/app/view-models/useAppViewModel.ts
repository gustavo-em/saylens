import { useCallback, useEffect, useRef, useState } from 'react';

import {
  defaultLearningLanguageFor,
  matchLearningLanguage,
  type LearningLanguage,
} from '../../features/learning/domain/LearningLanguage';
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
  getExperience,
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
import type { UsageReporter } from '../../features/learning/application/ports/UsageReporter';
import { getDaysSinceLastOpen } from '../../features/learning/domain/VisitGap';
import {
  EMPTY_REVIEW_INVITATION,
  recordDeclined,
  recordInvitationShown,
  recordPronunciationSuccess,
  recordRated,
  shouldInviteReview,
  type ReviewInvitationState,
} from '../../features/learning/domain/ReviewInvitation';
import { reportCloudFailure } from '../infrastructure/cloud/reportCloudFailure';
import { withTimeout } from '../infrastructure/cloud/withTimeout';
import { getCurrentDeviceRecord } from '../infrastructure/device/currentDeviceRecord';
import { getDeviceLanguageTags } from '../infrastructure/locale/deviceLanguageTags';
import { asyncStorageVisitStore } from '../infrastructure/usage/asyncStorageVisitStore';
import type { AppTab } from '../navigation/AppTab';
import type { AppearanceMode } from '../theme/theme';
import type {
  CloudLearningData,
  CloudLearningStore,
} from '../../features/learning/application/ports/CloudLearningStore';
import {
  mergeCloudLearningData,
  sanitizeCloudLearningData,
} from '../../features/learning/domain/CloudLearningData';

/** How long anything a learner is waiting on will wait for the server before
 * carrying on without it. */
const CLOUD_WAIT_MS = 4000;

export function useAppViewModel(
  preferencesStore: PreferencesStore,
  viewedObjectStore: ViewedObjectStore,
  favoriteWordStore: FavoriteWordStore,
  pronunciationProgressStore: PronunciationProgressStore,
  learnerProgressStore: LearnerProgressStore,
  reviewInvitationStore: ReviewInvitationStore,
  authenticator: Authenticator,
  usageReporter: UsageReporter,
  cloudLearningStore: CloudLearningStore,
) {
  const [performanceCapabilities] = useState(getPerformanceCapabilities);
  /** When this run of the app began. It is what the account records as the last
   * time it was seen, so the answer is the same for every write of this run. */
  const [openedAtMs] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<AppTab>('camera');
  /** False until the stored words have been read back. Before that the list is
   * empty because nothing has loaded, not because nothing was found. */
  const [hasRestoredWords, setHasRestoredWords] = useState(false);
  const [reviewInvitation, setReviewInvitation] =
    useState<ReviewInvitationState>(EMPTY_REVIEW_INVITATION);
  const [isInvitingReview, setIsInvitingReview] = useState(false);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [hasRestoredFavorites, setHasRestoredFavorites] = useState(false);
  const [hasRestoredPronunciation, setHasRestoredPronunciation] =
    useState(false);
  const [hasRestoredLearnerProgress, setHasRestoredLearnerProgress] =
    useState(false);
  const [cloudSyncedUserId, setCloudSyncedUserId] = useState<string | null>(
    null,
  );
  /** Set when a round is opened for a particular set of words, such as the
   * ones due for review, and cleared when practice is opened at large. */
  const [reviewLabels, setReviewLabels] = useState<readonly string[] | null>(
    null,
  );
  const [preferences, setPreferences] = useState<AppPreferences>(() => {
    // The app opens in the language the phone is already set to, so the first
    // screen is readable before anybody has been asked anything. It is only a
    // starting point: the first step of the walk-through puts the choice in
    // the learner's hands, and a stored choice overrides it on every later run.
    const deviceLanguage = matchLearningLanguage(getDeviceLanguageTags());

    return {
      ...DEFAULT_APP_PREFERENCES,
      performanceProfile: performanceCapabilities.recommendedProfile,
      ...(deviceLanguage == null
        ? {}
        : {
            nativeLanguage: deviceLanguage,
            learningLanguage: defaultLearningLanguageFor(deviceLanguage),
          }),
    };
  });
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
  /** Where the level bar stood before the word that was just said landed, set
   * only when a word is matched for the first time and cleared once the words
   * screen has played the gain. Null the rest of the time, which is what tells
   * an ordinary visit from an arrival. */
  const [celebratedFromExperience, setCelebratedFromExperience] = useState<
    number | null
  >(null);
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
      .catch(() => undefined)
      .finally(() => {
        if (isCurrent) setHasRestoredFavorites(true);
      });

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
      .catch(() => undefined)
      .finally(() => {
        if (isCurrent) setHasRestoredPronunciation(true);
      });

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
      // Only the first time a word is matched earns anything, so only that
      // takes a reading of where the bar was standing.
      const isFirstMatch =
        matched &&
        getPronunciationStatus(pronunciationProgress, label) !== 'matched';

      if (isFirstMatch) {
        setCelebratedFromExperience(
          getExperience(
            learnerProgress.foundLabels.length,
            pronunciationProgress.filter(entry => entry.status === 'matched')
              .length,
          ),
        );
      }

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
    [
      learnerProgress.foundLabels.length,
      pronunciationProgress,
      pronunciationProgressStore,
      reviewInvitation,
      saveReviewInvitation,
    ],
  );

  const clearLevelCelebration = useCallback(
    () => setCelebratedFromExperience(null),
    [],
  );

  useEffect(() => authenticator.subscribe(setUser), [authenticator]);

  const authErrorMessage = useCallback(
    (error: unknown) => {
      const account = getLearningCopy(preferences.nativeLanguage).account;
      const code = ((error as { code?: string }).code ?? '').toLowerCase();

      if (
        code.includes('invalid-credential') ||
        code.includes('wrong-password') ||
        code.includes('user-not-found')
      ) {
        return account.invalidCredentials;
      }
      if (code.includes('invalid-email')) return account.invalidEmail;
      if (code.includes('email-already-in-use'))
        return account.emailAlreadyUsed;
      if (code.includes('weak-password')) return account.weakPassword;
      if (code.includes('network-request-failed')) return account.networkError;
      if (code.includes('requires-recent-login')) {
        return account.recentLoginRequired;
      }
      // Google can hand back a perfectly good token and Firebase still refuse
      // it, which is a different problem with a different fix.
      if (code.includes('operation-not-allowed')) {
        return account.googleProviderDisabled;
      }
      if (code.includes('account-exists-with-different-credential')) {
        return account.emailBelongsToAnotherSignIn;
      }

      // Google's own sign-in reports numbers rather than `auth/...` strings,
      // so none of the codes above ever match one of its failures and every
      // one of them used to read as the same shrug.
      if (code === '10') return account.googleRejectedThisBuild;
      if (code === '7') return account.networkError;
      if (code === '12500' || code === 'play_services_not_available') {
        return account.playServicesUnavailable;
      }
      if (code === '12502' || code === 'async_op_in_progress') {
        return account.signInAlreadyRunning;
      }

      // Whatever is left is worth naming: a code the learner can read out is
      // worth more to them than a sentence that says nothing.
      return code === ''
        ? account.unexpectedAuthError
        : `${account.unexpectedAuthError} (${code})`;
    },
    [preferences.nativeLanguage],
  );

  const signIn = useCallback(
    async (provider: 'apple' | 'google') => {
      setSignInError(null);
      setAccountMessage(null);

      try {
        if (provider === 'apple') {
          await authenticator.signInWithApple();
        } else {
          await authenticator.signInWithGoogle();
        }
      } catch (error) {
        // Closing an identity sheet is a decision, not a failure, and the screen
        // says nothing about it.
        if ((error as Error).name === 'SignInCancelledError') return;

        setSignInError(authErrorMessage(error));
      }
    },
    [authErrorMessage, authenticator],
  );

  const signInWithApple = useCallback(() => signIn('apple'), [signIn]);
  const signInWithGoogle = useCallback(() => signIn('google'), [signIn]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setSignInError(null);
      setAccountMessage(null);
      try {
        await authenticator.signInWithEmail(email, password);
      } catch (error) {
        setSignInError(authErrorMessage(error));
      }
    },
    [authErrorMessage, authenticator],
  );

  const createAccountWithEmail = useCallback(
    async (email: string, password: string) => {
      const account = getLearningCopy(preferences.nativeLanguage).account;
      setSignInError(null);
      setAccountMessage(null);

      if (password.length < 6) {
        setSignInError(account.weakPassword);
        return;
      }

      try {
        await authenticator.createAccountWithEmail(email, password);
        setAccountMessage(account.verificationSent);
      } catch (error) {
        setSignInError(authErrorMessage(error));
      }
    },
    [authErrorMessage, authenticator, preferences.nativeLanguage],
  );

  const sendPasswordReset = useCallback(
    async (email: string) => {
      const account = getLearningCopy(preferences.nativeLanguage).account;
      setSignInError(null);
      setAccountMessage(null);

      if (!email.includes('@')) {
        setSignInError(account.invalidEmail);
        return;
      }

      try {
        await authenticator.sendPasswordReset(email);
        setAccountMessage(account.resetSent);
      } catch (error) {
        setSignInError(authErrorMessage(error));
      }
    },
    [authErrorMessage, authenticator, preferences.nativeLanguage],
  );

  const signOut = useCallback(async () => {
    if (user != null && cloudSyncedUserId === user.id) {
      // A last write before leaving is worth a moment, never a wait: with no
      // signal this promise settles only when a connection comes back, and
      // nobody is holding the phone until then. Firestore keeps the write.
      await withTimeout(
        cloudLearningStore
          .save(user.id, {
            schemaVersion: 3,
            updatedAtMs: Date.now(),
            device: getCurrentDeviceRecord(openedAtMs),
            profile: {
              displayName: user.name,
              email: user.email,
              providerIds: user.providerIds ?? [],
              emailVerified: user.emailVerified ?? false,
              createdAtMs: user.createdAtMs ?? null,
              lastSignInAtMs: user.lastSignInAtMs ?? null,
            },
            preferences: {
              appearanceMode: preferences.appearanceMode,
              learningLanguage: preferences.learningLanguage,
              nativeLanguage: preferences.nativeLanguage,
            },
            favorites,
            learnerProgress,
            pronunciationProgress,
            viewedObjects,
          })
          .catch(error => reportCloudFailure('save on sign-out', error)),
        CLOUD_WAIT_MS,
      );
    }
    await authenticator.signOut().catch(() => undefined);
    setCloudSyncedUserId(null);
  }, [
    authenticator,
    cloudLearningStore,
    cloudSyncedUserId,
    favorites,
    learnerProgress,
    openedAtMs,
    pronunciationProgress,
    preferences,
    user,
    viewedObjects,
  ]);

  const deleteAccount = useCallback(async () => {
    if (user == null) return;

    setSignInError(null);
    setCloudSyncedUserId(null);
    try {
      // Erasing the cloud copy is attempted first, but an unreachable server
      // must not stand between a learner and deleting their account: the
      // deletion stays queued, and removing the account is what they asked for.
      await withTimeout(cloudLearningStore.delete(user.id), CLOUD_WAIT_MS);
      await authenticator.deleteAccount();
    } catch (error) {
      setSignInError(authErrorMessage(error));
    }
  }, [authErrorMessage, authenticator, cloudLearningStore, user]);

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
      .catch(() => undefined)
      .finally(() => {
        if (isCurrent) setHasRestoredLearnerProgress(true);
      });

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

  const learningSnapshot = useCallback(
    (updatedAtMs: number, account: AuthenticatedUser): CloudLearningData => ({
      schemaVersion: 3,
      updatedAtMs,
      device: getCurrentDeviceRecord(openedAtMs),
      profile: {
        displayName: account.name,
        email: account.email,
        providerIds: account.providerIds ?? [],
        emailVerified: account.emailVerified ?? false,
        createdAtMs: account.createdAtMs ?? null,
        lastSignInAtMs: account.lastSignInAtMs ?? null,
      },
      preferences: {
        appearanceMode: preferences.appearanceMode,
        learningLanguage: preferences.learningLanguage,
        nativeLanguage: preferences.nativeLanguage,
      },
      favorites,
      learnerProgress,
      pronunciationProgress,
      viewedObjects,
    }),
    [
      favorites,
      learnerProgress,
      openedAtMs,
      preferences.appearanceMode,
      preferences.learningLanguage,
      preferences.nativeLanguage,
      pronunciationProgress,
      viewedObjects,
    ],
  );

  const hasRestoredAllLearningData =
    hasRestoredWords &&
    hasRestoredFavorites &&
    hasRestoredPronunciation &&
    hasRestoredLearnerProgress;

  useEffect(() => {
    if (user == null) {
      setCloudSyncedUserId(null);
      return;
    }
    if (!hasRestoredAllLearningData || cloudSyncedUserId === user.id) {
      return;
    }

    let isCurrent = true;
    const userId = user.id;

    cloudLearningStore
      .load(userId)
      .then(stored => {
        if (!isCurrent) return;

        const local = learningSnapshot(Date.now(), user);
        const cloud = sanitizeCloudLearningData(stored, local);
        const next =
          cloud == null ? local : mergeCloudLearningData(local, cloud);
        const saved = { ...next, updatedAtMs: Date.now() };

        setCloudSyncedUserId(userId);
        setFavorites([...saved.favorites]);
        setLearnerProgress(saved.learnerProgress);
        setPronunciationProgress([...saved.pronunciationProgress]);
        setViewedObjects([...saved.viewedObjects]);
        setPreferences(current => {
          const nextPreferences = sanitizeAppPreferences(
            { ...current, ...saved.preferences },
            current,
            performanceCapabilities.supportedProfiles,
          );
          preferencesStore.save(nextPreferences).catch(() => undefined);
          return nextPreferences;
        });

        favoriteWordStore.save(saved.favorites).catch(() => undefined);
        learnerProgressStore.save(saved.learnerProgress).catch(() => undefined);
        pronunciationProgressStore
          .save(saved.pronunciationProgress)
          .catch(() => undefined);
        viewedObjectStore.save(saved.viewedObjects).catch(() => undefined);

        cloudLearningStore
          .save(userId, saved)
          .catch(error => reportCloudFailure('first save', error));
      })
      .catch(error => reportCloudFailure('load', error));

    return () => {
      isCurrent = false;
    };
  }, [
    cloudLearningStore,
    cloudSyncedUserId,
    favoriteWordStore,
    hasRestoredAllLearningData,
    learnerProgressStore,
    learningSnapshot,
    pronunciationProgressStore,
    performanceCapabilities.supportedProfiles,
    preferencesStore,
    user,
    viewedObjectStore,
  ]);

  useEffect(() => {
    if (user == null || cloudSyncedUserId !== user.id) return;

    const timeout = setTimeout(() => {
      cloudLearningStore
        .save(user.id, learningSnapshot(Date.now(), user))
        .catch(error => reportCloudFailure('save', error));
    }, 1200);

    return () => clearTimeout(timeout);
  }, [cloudLearningStore, cloudSyncedUserId, learningSnapshot, user]);

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

  // Whether the learner came back, reported once when the app opens.
  useEffect(() => {
    let isCurrent = true;

    asyncStorageVisitStore
      .load()
      .then(lastOpenedAtMs => {
        if (!isCurrent) return;

        const now = Date.now();
        usageReporter
          .appOpened(getDaysSinceLastOpen(lastOpenedAtMs, now))
          .catch(() => undefined);
        asyncStorageVisitStore.save(now).catch(() => undefined);
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [usageReporter]);

  // Which screens are opened, reported as they are opened.
  useEffect(() => {
    usageReporter.screenOpened(activeTab).catch(() => undefined);
  }, [activeTab, usageReporter]);

  const selectTab = useCallback((tab: AppTab) => {
    setActiveTab(tab);
  }, []);

  const practiseSpeaking = useCallback(
    (label: string, returnTab: AppTab = 'history') => {
      usageReporter.speakingStarted(label, returnTab).catch(() => undefined);
      setSpeakLabel(label);
      setSpeakReturnTab(returnTab);
      setActiveTab('speak');
    },
    [usageReporter],
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

  const finishOnboarding = useCallback(
    () => updatePreference('hasSeenOnboarding', true),
    [updatePreference],
  );

  useEffect(() => {
    if (
      !isRestored ||
      !preferences.hasSeenOnboarding ||
      preferences.hasSeenSignInPrompt ||
      user != null ||
      learnerProgress.foundLabels.length < 10
    ) {
      return;
    }

    updatePreference('hasSeenSignInPrompt', true);
    setActiveTab('account');
  }, [
    isRestored,
    learnerProgress.foundLabels.length,
    preferences.hasSeenOnboarding,
    preferences.hasSeenSignInPrompt,
    updatePreference,
    user,
  ]);

  return {
    activeTab,
    appearanceMode: preferences.appearanceMode,
    cameraAccess,
    // The detector is not run behind the walk-through: nothing of what it
    // finds can be seen, and the frames still cost battery.
    cameraIsActive: activeTab === 'camera' && preferences.hasSeenOnboarding,
    changeAppearanceMode,
    changeLearningLanguage,
    changeNativeLanguage,
    changePerformanceProfile,
    finishOnboarding,
    hasSeenOnboarding: preferences.hasSeenOnboarding,
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
    celebratedFromExperience,
    clearLevelCelebration,
    user,
    accountMessage,
    signInError,
    signInWithApple,
    signInWithEmail,
    signInWithGoogle,
    createAccountWithEmail,
    sendPasswordReset,
    signOut,
    deleteAccount,
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
