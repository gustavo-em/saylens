import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../src/app/App';
import { getDeviceLanguageTags } from '../src/app/infrastructure/locale/deviceLanguageTags';
import { lightTheme } from '../src/app/theme/theme';

// This file drives whole screens, and the count that rolls up on the words
// screen would leave state updates landing after each act block. The curve
// itself is covered by its own test.
jest.mock('../src/features/learning/presentation/animation/countUp', () => ({
  __esModule: true,
  getCountUpDurationMs: () => 0,
  getCountUpValue: (target: number) => target,
}));

// The app talks to Firebase through a port, and this suite is not testing the
// port's implementation: the real module is native and ships as ESM, neither
// of which belongs in a unit test.
jest.mock(
  '../src/features/learning/infrastructure/usage/firebaseUsageReporter',
  () => ({
    firebaseUsageReporter: {
      screenOpened: jest.fn(async () => undefined),
      appOpened: jest.fn(async () => undefined),
      speakingStarted: jest.fn(async () => undefined),
    },
    startUsageReporting: jest.fn(async () => undefined),
  }),
);

jest.mock('@invertase/react-native-apple-authentication', () => {
  const ReactModule = require('react');
  const { Pressable } = jest.requireActual('react-native');
  const AppleButton = (props: Record<string, unknown>) =>
    ReactModule.createElement(Pressable, props);
  AppleButton.Style = { BLACK: 'Black' };
  AppleButton.Type = { CONTINUE: 'Continue' };
  return { AppleButton };
});

jest.mock(
  '../src/features/learning/infrastructure/cloud/firestoreLearningStore',
  () => ({
    firestoreLearningStore: {
      load: jest.fn(async () => null),
      save: jest.fn(async () => undefined),
      delete: jest.fn(async () => undefined),
    },
  }),
);

jest.mock(
  '../src/features/learning/infrastructure/auth/firebaseAuthenticator',
  () => ({
    firebaseAuthenticator: {
      signInWithApple: jest.fn(async () => ({
        id: 'learner-1',
        name: 'Gustavo',
        email: 'gustavo@example.com',
      })),
      signInWithEmail: jest.fn(async () => ({
        id: 'learner-1',
        name: null,
        email: 'gustavo@example.com',
      })),
      createAccountWithEmail: jest.fn(async () => ({
        id: 'learner-1',
        name: null,
        email: 'gustavo@example.com',
      })),
      sendPasswordReset: jest.fn(async () => undefined),
      signInWithGoogle: jest.fn(async () => ({
        id: 'learner-1',
        name: 'Gustavo',
        email: 'gustavo@example.com',
      })),
      signOut: jest.fn(async () => undefined),
      deleteAccount: jest.fn(async () => undefined),
      subscribe: jest.fn(() => () => undefined),
    },
  }),
);

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('react-native-lesingo-object-detector', () => ({
  objectDetector: {
    getRecommendedCpuWorkerCount: () => 8,
    getRecommendedPerformanceProfile: () => 'maximum-performance',
    getSupportsGpuDelegate: () => true,
    getSupportedPerformanceProfiles: () => [
      'maximum-performance',
      'power-saving',
    ],
  },
}));

jest.mock(
  '../src/features/learning/infrastructure/pronunciation/systemPronunciationPlayer',
  () => ({
    systemPronunciationPlayer: {
      speak: jest.fn(async () => undefined),
      stop: jest.fn(async () => undefined),
      level: jest.fn(async () => 0),
    },
  }),
);

const mockPronunciationPlayer = jest.requireMock(
  '../src/features/learning/infrastructure/pronunciation/systemPronunciationPlayer',
).systemPronunciationPlayer as {
  speak: jest.Mock;
  stop: jest.Mock;
  level: jest.Mock;
};

jest.mock(
  '../src/features/learning/infrastructure/speech/systemSpeechRecognizer',
  () => ({
    systemSpeechRecognizer: {
      isAvailable: jest.fn(async () => true),
      hasPermission: jest.fn(async () => true),
      listen: jest.fn(async () => ['Bottle']),
      stop: jest.fn(async () => undefined),
      level: jest.fn(async () => 0),
      cancel: jest.fn(async () => undefined),
    },
  }),
);

const mockUsageReporter = jest.requireMock(
  '../src/features/learning/infrastructure/usage/firebaseUsageReporter',
).firebaseUsageReporter as {
  screenOpened: jest.Mock;
  appOpened: jest.Mock;
  speakingStarted: jest.Mock;
};

const mockAuthenticator = jest.requireMock(
  '../src/features/learning/infrastructure/auth/firebaseAuthenticator',
).firebaseAuthenticator as {
  signInWithApple: jest.Mock;
  signInWithEmail: jest.Mock;
  createAccountWithEmail: jest.Mock;
  sendPasswordReset: jest.Mock;
  signInWithGoogle: jest.Mock;
  signOut: jest.Mock;
  deleteAccount: jest.Mock;
  subscribe: jest.Mock;
};

const mockCloudLearningStore = jest.requireMock(
  '../src/features/learning/infrastructure/cloud/firestoreLearningStore',
).firestoreLearningStore as {
  load: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
};

const mockSpeechRecognizer = jest.requireMock(
  '../src/features/learning/infrastructure/speech/systemSpeechRecognizer',
).systemSpeechRecognizer as {
  isAvailable: jest.Mock;
  hasPermission: jest.Mock;
  listen: jest.Mock;
  stop: jest.Mock;
  level: jest.Mock;
  cancel: jest.Mock;
};

jest.mock('react-native-vision-camera', () => {
  const ReactModule = require('react');
  const { View: MockView } = jest.requireActual('react-native');

  return {
    Camera: ({ isActive }: { isActive: boolean }) =>
      ReactModule.createElement(MockView, {
        isActive,
        testID: 'camera-preview',
      }),
    useCameraDevice: () => ({ id: 'back-camera' }),
    useCameraPermission: () => ({
      canRequestPermission: false,
      hasPermission: true,
      requestPermission: jest.fn(async () => true),
      status: 'authorized',
    }),
  };
});

jest.mock(
  '../src/features/learning/infrastructure/camera/VisionCameraViewport',
  () => {
    const ReactModule = require('react');
    const { View: MockView } = jest.requireActual('react-native');

    return {
      VisionCameraViewport: ({
        isActive,
        onDetections,
        performanceProfile,
      }: {
        isActive: boolean;
        onDetections: (frame: unknown) => void;
        performanceProfile: string;
      }) => {
        ReactModule.useEffect(() => {
          if (!isActive) return;

          let delivered = 0;
          const result = {
            objects: [
              {
                id: 'bottle-0',
                label: 'bottle',
                confidence: 0.91,
                bounds: { x: 0.2, y: 0.25, width: 0.3, height: 0.4 },
              },
            ],
            sourceWidth: 360,
            sourceHeight: 640,
            inferenceTimeMs: 45,
          };

          // The tracker asks for a few readings and for the time a real
          // detector would take to produce them, so the fake one delivers
          // four results with the clock moving between them. Four in the same
          // millisecond is what six workers finishing together looks like,
          // and the tracker is right to refuse it.
          const startedAtMs = Date.now();
          const clock = jest
            .spyOn(Date, 'now')
            .mockImplementation(() => startedAtMs + delivered * 150);

          for (delivered = 0; delivered < 4; delivered += 1) {
            onDetections(result);
          }

          clock.mockRestore();
        }, [isActive, onDetections]);

        return ReactModule.createElement(MockView, {
          isActive,
          performanceProfile,
          testID: 'camera-preview',
        });
      },
    };
  },
);

/** What the celebration counts down before it opens the words screen. */
const CELEBRATION_MS = 5000;

function pressableWithTestID(
  renderer: ReactTestRenderer.ReactTestRenderer,
  testID: string,
) {
  const pressable = renderer.root
    .findAllByProps({ testID })
    .find(node => typeof node.props.onPress === 'function');

  if (pressable == null) throw new Error(`No pressable for ${testID}`);

  return pressable;
}

/**
 * Answers the step the walk-through opens on. Nothing past it moves until a
 * learning language has been tapped, so every test that wants a later step
 * goes through here first.
 */
async function chooseOnboardingLanguages(
  renderer: ReactTestRenderer.ReactTestRenderer,
  learningLanguage = 'en-US',
) {
  await ReactTestRenderer.act(() => {
    pressableWithTestID(
      renderer,
      `onboarding-learning-${learningLanguage}`,
    ).props.onPress();
  });
}

async function layOutCamera(renderer: ReactTestRenderer.ReactTestRenderer) {
  await ReactTestRenderer.act(() => {
    renderer.root.findByProps({ testID: 'camera-container' }).props.onLayout({
      nativeEvent: { layout: { width: 360, height: 640 } },
    });
  });
}

/** The camera's destinations sit in a bar at the bottom, one tap away. */
async function pressCameraMenuItem(
  renderer: ReactTestRenderer.ReactTestRenderer,
  testID: string,
) {
  await ReactTestRenderer.act(() => {
    renderer.root.findByProps({ testID }).props.onPress();
  });
}

const PREFERENCES_KEY = 'lesingo.preferences.v1';
const PROGRESS_KEY = 'lesingo.progress.v1';

describe('App', () => {
  beforeEach(async () => {
    // Every test here but the walk-through's own opens the app as someone who
    // has been here before, so the first run is not standing in front of the
    // screens being driven.
    await AsyncStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ hasSeenOnboarding: true }),
    );
    mockPronunciationPlayer.speak.mockReset().mockResolvedValue(undefined);
    mockPronunciationPlayer.stop.mockReset().mockResolvedValue(undefined);
    mockSpeechRecognizer.isAvailable.mockReset().mockResolvedValue(true);
    mockSpeechRecognizer.hasPermission.mockReset().mockResolvedValue(true);
    mockSpeechRecognizer.listen.mockReset().mockResolvedValue(['Bottle']);
    mockSpeechRecognizer.stop.mockReset().mockResolvedValue(undefined);
    mockSpeechRecognizer.level.mockReset().mockResolvedValue(0);
    mockSpeechRecognizer.cancel.mockReset().mockResolvedValue(undefined);
    mockCloudLearningStore.load.mockReset().mockResolvedValue(null);
    mockCloudLearningStore.save.mockReset().mockResolvedValue(undefined);
    mockCloudLearningStore.delete.mockReset().mockResolvedValue(undefined);
    mockAuthenticator.signOut.mockClear();
    mockAuthenticator.signInWithGoogle.mockClear();
    mockAuthenticator.signInWithEmail.mockClear();
    mockAuthenticator.createAccountWithEmail.mockClear();
    mockAuthenticator.sendPasswordReset.mockClear();
    mockUsageReporter.screenOpened.mockClear();
    mockUsageReporter.speakingStarted.mockClear();
  });

  it('opens on the camera screen with a settings control', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'camera-container' })
        .props.onLayout({
          nativeEvent: { layout: { height: 1280, width: 720 } },
        });
    });

    const renderedTree = JSON.stringify(renderer!.toJSON());

    expect(renderedTree).toContain('Lesingo');
    // The destinations are a bar at the bottom rather than a menu to open.
    expect(renderedTree).toContain('camera-open-settings');
    expect(renderedTree).toContain('camera-open-history');
    expect(renderedTree).toContain('camera-language-pair');
    expect(renderedTree).toContain('camera-preview');
    expect(renderedTree).toContain('Bottle');
    expect(renderedTree).not.toContain('91%');
  });

  it('pauses the camera while the settings screen is selected', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    expect(
      renderer!.root.findByProps({ testID: 'camera-preview' }).props.isActive,
    ).toBe(true);

    await pressCameraMenuItem(renderer!, 'camera-open-settings');

    expect(
      renderer!.root.findByProps({ testID: 'camera-preview' }).props.isActive,
    ).toBe(false);
    expect(
      renderer!.root.findAllByProps({ testID: 'detected-object-bottle-1' }),
    ).toHaveLength(0);
    const settingsTree = JSON.stringify(renderer!.toJSON());
    expect(settingsTree).toContain('Configurações');
    expect(settingsTree).toContain('Máximo desempenho');
    // An option is labelled by what it costs the device.
    expect(settingsTree).toContain('núcleos do processador');
    expect(settingsTree).not.toContain('workers');
    // The economy profile is the switch turned off rather than a card of its
    // own, so its name is no longer on the screen.
    expect(settingsTree).not.toContain('BASE TÉCNICA');
    expect(settingsTree).not.toContain('MILESTONE');
    expect(settingsTree).not.toContain('Guia de enquadramento');
    expect(settingsTree).not.toContain('APONTE PARA UM OBJETO');
  });

  it('starts with maximum performance selected', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    await pressCameraMenuItem(renderer!, 'camera-open-settings');

    expect(
      renderer!.root.findByProps({ testID: 'performance-profile-toggle' }).props
        .accessibilityState.checked,
    ).toBe(true);
    expect(
      renderer!.root.findByProps({ testID: 'camera-preview' }).props
        .performanceProfile,
    ).toBe('maximum-performance');
  });

  it('switches between dark and light appearance modes', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    await pressCameraMenuItem(renderer!, 'camera-open-settings');

    expect(
      renderer!.root.findByProps({ testID: 'appearance-dark' }).props
        .accessibilityState.checked,
    ).toBe(true);

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'appearance-light' })
        .props.onPress();
    });

    expect(
      renderer!.root.findByProps({ testID: 'appearance-light' }).props
        .accessibilityState.checked,
    ).toBe(true);
    expect(JSON.stringify(renderer!.toJSON())).toContain(
      lightTheme.colors.background,
    );
  });

  it('restores the saved preferences on the next launch', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    await pressCameraMenuItem(renderer!, 'camera-open-settings');

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'appearance-light' })
        .props.onPress();
    });
    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'performance-profile-toggle' })
        .props.onPress();
    });
    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'learning-language-row' })
        .props.onPress();
    });
    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'learning-language-es' })
        .props.onPress();
    });

    await ReactTestRenderer.act(() => {
      renderer!.unmount();
    });

    let relaunched: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      relaunched = ReactTestRenderer.create(<App />);
    });

    expect(
      relaunched!.root.findByProps({ testID: 'camera-preview' }).props
        .performanceProfile,
    ).toBe('power-saving');

    await pressCameraMenuItem(relaunched!, 'camera-open-settings');

    expect(
      relaunched!.root.findByProps({ testID: 'appearance-light' }).props
        .accessibilityState.checked,
    ).toBe(true);

    await ReactTestRenderer.act(() => {
      relaunched!.root
        .findByProps({ testID: 'learning-language-row' })
        .props.onPress();
    });

    expect(
      relaunched!.root.findByProps({ testID: 'learning-language-es' }).props
        .accessibilityState.checked,
    ).toBe(true);
  });

  it('switches to the power-saving performance profile', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    expect(
      renderer!.root.findByProps({ testID: 'camera-preview' }).props
        .performanceProfile,
    ).toBe('maximum-performance');

    await pressCameraMenuItem(renderer!, 'camera-open-settings');

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'performance-profile-toggle' })
        .props.onPress();
    });

    expect(
      renderer!.root.findByProps({ testID: 'performance-profile-toggle' }).props
        .accessibilityState.checked,
    ).toBe(false);
    expect(
      renderer!.root.findByProps({ testID: 'camera-preview' }).props
        .performanceProfile,
    ).toBe('power-saving');
  });

  it('shows both performance profiles on every device', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    await pressCameraMenuItem(renderer!, 'camera-open-settings');

    expect(
      renderer!.root.findByProps({ testID: 'performance-profile-toggle' }).props
        .accessibilityState.checked,
    ).toBe(true);
    // Both profiles are reachable from one switch, so the control being
    // present is what says the device supports the pair.
    expect(JSON.stringify(renderer!.toJSON())).toContain('Máximo desempenho');
  });

  it('shows compact vocabulary details on a detected object', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'camera-container' })
        .props.onLayout({
          nativeEvent: { layout: { width: 360, height: 640 } },
        });
    });

    renderer!.root.findByProps({
      testID: 'detected-object-bottle-1',
    });

    const renderedTree = JSON.stringify(renderer!.toJSON());
    expect(renderedTree).toContain('Bottle');
    expect(renderedTree).toContain('Garrafa');
    expect(renderedTree).toContain('BÓ-tl');
    // Only the two languages the learner chose. A word in a third one they
    // never asked for is noise, and the flag says which language this is.
    expect(renderedTree).toContain('🇧🇷');
    expect(renderedTree).not.toContain('Botella');
    // The sentence on the card is written in the language being learned.
    expect(renderedTree).toContain('This is my water bottle.');
    expect(renderedTree).not.toContain('Esta é minha garrafa de água.');
    expect(renderedTree).toContain('PT');
    expect(
      renderer!.root.findAllByProps({ testID: 'close-word-modal' }),
    ).toHaveLength(0);
  });

  it('leaves the frame around the object silent when it is touched', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });
    await layOutCamera(renderer!);

    const frames = renderer!.root.findAllByProps({
      testID: 'detected-object-bottle-1',
    });

    expect(frames.length).toBeGreaterThan(0);
    frames.forEach(frame => expect(frame.props.onPress).toBeUndefined());
    expect(mockPronunciationPlayer.speak).not.toHaveBeenCalled();
  });

  it('updates the interface and vocabulary when language preferences change', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    await pressCameraMenuItem(renderer!, 'camera-open-settings');

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'native-language-row' })
        .props.onPress();
    });
    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'native-language-en-US' })
        .props.onPress();
    });

    expect(JSON.stringify(renderer!.toJSON())).toContain('Settings');

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'learning-language-row' })
        .props.onPress();
    });

    expect(
      renderer!.root.findByProps({ testID: 'learning-language-en-US' }).props
        .accessibilityState.checked,
    ).toBe(true);
    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'learning-language-es' })
        .props.onPress();
    });

    expect(
      renderer!.root.findByProps({ testID: 'learning-language-es' }).props
        .accessibilityState.checked,
    ).toBe(true);

    await ReactTestRenderer.act(() => {
      renderer!.root.findByProps({ testID: 'settings-close' }).props.onPress();
      renderer!.root
        .findByProps({ testID: 'camera-container' })
        .props.onLayout({
          nativeEvent: { layout: { width: 360, height: 640 } },
        });
    });

    const renderedTree = JSON.stringify(renderer!.toJSON());
    expect(renderedTree).toContain('Botella');
    expect(renderedTree).toContain('Bottle');
    expect(renderedTree).toContain('EN');
    expect(renderedTree).toContain('ES');
    expect(renderedTree).not.toContain('Explore spanish around you');

    await ReactTestRenderer.act(async () => {
      pressableWithTestID(renderer!, 'hear-object-bottle-1').props.onPress();
      await Promise.resolve();
    });

    expect(mockPronunciationPlayer.speak).toHaveBeenCalledWith('Botella', 'es');
  });

  it('keeps working, and lets go, when the account cannot be reached', async () => {
    mockAuthenticator.subscribe.mockImplementationOnce(
      (listen: (user: unknown) => void) => {
        listen({
          id: 'learner-1',
          name: 'Gustavo',
          email: 'gustavo@example.com',
        });

        return () => undefined;
      },
    );
    // What a device with no signal sees: the read fails, and the write is never
    // acknowledged because there is nobody there to acknowledge it.
    mockCloudLearningStore.load.mockRejectedValueOnce({
      code: 'firestore/unavailable',
    });
    mockCloudLearningStore.save.mockReturnValue(new Promise(() => undefined));

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });
    await layOutCamera(renderer!);

    // The camera is what the app is for, and it never needed the network.
    expect(
      renderer!.root.findByProps({ testID: 'camera-preview' }).props.isActive,
    ).toBe(true);

    await pressCameraMenuItem(renderer!, 'camera-open-history');
    expect(JSON.stringify(renderer!.toJSON())).toContain('Garrafa');

    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'history-close').props.onPress();
    });
    await pressCameraMenuItem(renderer!, 'camera-open-settings');
    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'settings-open-account').props.onPress();
    });

    // Signing out waits a moment for the last write and then leaves anyway. A
    // promise that never settles must not be the thing standing between a
    // learner and their own account.
    jest.useFakeTimers();
    const leaving = ReactTestRenderer.act(async () => {
      pressableWithTestID(renderer!, 'sign-in-sign-out').props.onPress();
      await Promise.resolve();
      jest.advanceTimersByTime(5000);
    });

    await leaving;
    jest.useRealTimers();

    expect(mockAuthenticator.signOut).toHaveBeenCalled();
  });

  it('offers the profile in settings once someone has signed in', async () => {
    mockAuthenticator.subscribe.mockImplementationOnce(
      (listen: (user: unknown) => void) => {
        listen({
          id: 'learner-1',
          name: 'Gustavo',
          email: 'gustavo@example.com',
        });

        return () => undefined;
      },
    );

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });
    await layOutCamera(renderer!);
    await pressCameraMenuItem(renderer!, 'camera-open-settings');

    const settingsTree = JSON.stringify(renderer!.toJSON());
    expect(settingsTree).toContain('Gustavo');
    expect(settingsTree).toContain('gustavo@example.com');
    expect(settingsTree).not.toContain('Continuar com o Google');
  });

  it('signs in with email and password from the account screen', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });
    await layOutCamera(renderer!);
    await pressCameraMenuItem(renderer!, 'camera-open-settings');

    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'settings-open-account').props.onPress();
    });
    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'sign-in-email').props.onPress();
    });
    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'sign-in-email-input' })
        .props.onChangeText('learner@example.com');
      renderer!.root
        .findByProps({ testID: 'sign-in-password-input' })
        .props.onChangeText('secret12');
    });
    await ReactTestRenderer.act(async () => {
      pressableWithTestID(renderer!, 'sign-in-email-submit').props.onPress();
      await Promise.resolve();
    });

    expect(mockAuthenticator.signInWithEmail).toHaveBeenCalledWith(
      'learner@example.com',
      'secret12',
    );
  });

  it('practises a detected word and comes back to the camera', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });
    await layOutCamera(renderer!);

    await ReactTestRenderer.act(() => {
      pressableWithTestID(
        renderer!,
        'practise-object-bottle-1',
      ).props.onPress();
    });

    renderer!.root.findByProps({ testID: 'speak-listen' });
    expect(JSON.stringify(renderer!.toJSON())).toContain('Bottle');
    expect(mockUsageReporter.speakingStarted).toHaveBeenCalledWith(
      'bottle',
      'camera',
    );
    expect(mockUsageReporter.screenOpened).toHaveBeenCalledWith('speak');

    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'speak-close').props.onPress();
    });

    expect(
      renderer!.root.findByProps({ testID: 'camera-preview' }).props.isActive,
    ).toBe(true);
  });

  it('marks the outcome of a pronunciation in history and filters by it', async () => {
    // Two words already found, and the bottle below makes three: thirty points,
    // ten short of the second level. Saying it right is what crosses it, which
    // is what the words screen is opened to show.
    await AsyncStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({
        foundLabels: ['cup', 'chair'],
        streakDays: 1,
        lastFoundDayMs: 0,
      }),
    );

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });
    await layOutCamera(renderer!);

    await pressCameraMenuItem(renderer!, 'camera-open-history');

    expect(
      renderer!.root.findByProps({ testID: 'history-filter-untried' }).props
        .accessibilityLabel,
    ).toBe('Não tentei, 1');

    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'history-speak-bottle').props.onPress();
    });

    // The celebration counts itself down, so the clock is taken over before it
    // starts rather than after, when its interval already exists.
    jest.useFakeTimers();
    await ReactTestRenderer.act(async () => {
      pressableWithTestID(renderer!, 'speak-listen').props.onPress();
      await Promise.resolve();
    });

    expect(mockSpeechRecognizer.listen).toHaveBeenCalledWith('en-US');

    // A word said right is celebrated rather than merely reported, and the
    // celebration offers both ways out.
    const celebrated = JSON.stringify(renderer!.toJSON());
    expect(celebrated).toContain('Parabéns!');
    // The word just went up a level, so the celebration is on its way to the
    // screen that shows it rather than back to the camera.
    expect(celebrated).toContain('Abrindo suas palavras em 5s');
    renderer!.root.findByProps({ testID: 'speak-celebration-camera' });

    // Nothing is pressed: the countdown runs out and the words screen is where
    // it lands, because that is where the word that was just earned shows up.
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(CELEBRATION_MS + 500);
    });
    jest.useRealTimers();

    expect(
      renderer!.root.findByProps({ testID: 'history-filter-matched' }).props
        .accessibilityLabel,
    ).toBe('Acertei, 1');
    // The bar opens on the level the learner arrived with rather than the one
    // they have already been given, so the crossing happens in front of them.
    expect(
      renderer!.root.findByProps({ testID: 'history-level' }).props.children,
    ).toBe(1);
    // The level underneath really is the second one: the hint counts towards
    // the third. The number above it catches up when the bar gets there.
    expect(JSON.stringify(renderer!.toJSON())).toContain('para o nível 3');
    expect(JSON.stringify(renderer!.toJSON())).toContain('#3FCB86');

    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'history-filter-untried').props.onPress();
    });

    renderer!.root.findByProps({ testID: 'history-filter-empty' });

    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'history-filter-matched').props.onPress();
    });

    renderer!.root.findByProps({ testID: 'history-bottle' });
  });

  it('hears a detected word from the button on its card', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });
    await layOutCamera(renderer!);

    await ReactTestRenderer.act(async () => {
      pressableWithTestID(renderer!, 'hear-object-bottle-1').props.onPress();
      await Promise.resolve();
    });

    expect(mockPronunciationPlayer.speak).toHaveBeenCalledWith(
      'Bottle',
      'en-US',
    );
    expect(JSON.stringify(renderer!.toJSON())).toContain('Falar');
  });

  it('collects a detected object into its rooms and counts a streak', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });
    await layOutCamera(renderer!);

    // The rooms are reached from the list of words, which is where progress
    // lives now that the camera carries one destination.
    await pressCameraMenuItem(renderer!, 'camera-open-history');
    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'history-open-collection' })
        .props.onPress();
    });

    const collectionTree = JSON.stringify(renderer!.toJSON());
    expect(collectionTree).toContain('Cozinha');
    expect(collectionTree).toContain('1 objeto encontrado');
    expect(collectionTree).toContain('1 dia');
    expect(collectionTree).toContain('Nível 1');
    expect(collectionTree).toContain('1/20 objetos');
    expect(
      renderer!.root.findAllByProps({ testID: 'collection-empty' }),
    ).toHaveLength(0);

    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'collection-kitchen').props.onPress();
    });

    const detailTree = JSON.stringify(renderer!.toJSON());
    expect(detailTree).toContain('Bottle');
    expect(detailTree).toContain('Copo');

    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'collection-close').props.onPress();
    });

    expect(
      renderer!.root.findByProps({ testID: 'camera-preview' }).props.isActive,
    ).toBe(true);
  });

  it('walks a first run through the app and never asks again', async () => {
    await AsyncStorage.removeItem(PREFERENCES_KEY);

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    const firstStep = JSON.stringify(renderer!.toJSON());
    // The languages come before anything is explained, so everything after
    // them is in the pair the learner chose.
    expect(firstStep).toContain('Escolha seus idiomas');
    // There is no way past that step, and no way out of it either.
    expect(
      renderer!.root.findAllByProps({ testID: 'onboarding-skip' }),
    ).toHaveLength(0);
    expect(
      pressableWithTestID(renderer!, 'onboarding-advance').props.disabled,
    ).toBe(true);
    // The detector does not run behind a screen that covers it.
    expect(
      renderer!.root.findByProps({ testID: 'camera-preview' }).props.isActive,
    ).toBe(false);

    await chooseOnboardingLanguages(renderer!);

    expect(
      pressableWithTestID(renderer!, 'onboarding-advance').props.disabled,
    ).toBe(false);

    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'onboarding-advance').props.onPress();
    });

    const cameraStep = JSON.stringify(renderer!.toJSON());
    expect(cameraStep).toContain('Aponte para qualquer coisa');
    // The detector's limits are declared where the camera is promised.
    expect(cameraStep).toContain(
      'O reconhecimento não é perfeito e pode errar',
    );

    // Three more taps to reach the last step.
    for (let taps = 0; taps < 3; taps += 1) {
      await ReactTestRenderer.act(() => {
        pressableWithTestID(renderer!, 'onboarding-advance').props.onPress();
      });
    }

    // The last step asks for an account instead of carrying on.
    expect(JSON.stringify(renderer!.toJSON())).toContain(
      'Guarde seu progresso',
    );
    expect(
      renderer!.root.findAllByProps({ testID: 'onboarding-advance' }),
    ).toHaveLength(0);

    // Doing it later is a real answer, and it ends the walk-through.
    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'onboarding-later').props.onPress();
    });

    expect(
      renderer!.root.findAllByProps({ testID: 'onboarding' }),
    ).toHaveLength(0);
    expect(
      renderer!.root.findByProps({ testID: 'camera-preview' }).props.isActive,
    ).toBe(true);
    expect(
      JSON.parse((await AsyncStorage.getItem(PREFERENCES_KEY)) ?? '{}'),
    ).toMatchObject({ hasSeenOnboarding: true });
  });

  it('lets a first run skip straight to the camera', async () => {
    await AsyncStorage.removeItem(PREFERENCES_KEY);

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    // Leaving opens up as soon as the languages are answered.
    await chooseOnboardingLanguages(renderer!);
    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'onboarding-advance').props.onPress();
    });

    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'onboarding-skip').props.onPress();
    });

    expect(
      renderer!.root.findAllByProps({ testID: 'onboarding' }),
    ).toHaveLength(0);
  });

  it('follows the swiped page rather than the button alone', async () => {
    await AsyncStorage.removeItem(PREFERENCES_KEY);

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    await chooseOnboardingLanguages(renderer!);

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'onboarding-pages' })
        .props.onMomentumScrollEnd({
          nativeEvent: { contentOffset: { x: 750 * 4 } },
        });
    });

    expect(
      renderer!.root.findAllByProps({ testID: 'onboarding-google' }),
    ).not.toHaveLength(0);
  });

  it('opens in the language the device is already set to', async () => {
    await AsyncStorage.removeItem(PREFERENCES_KEY);
    // A phone asking for Japanese first and Spanish after it opens in Spanish
    // rather than in a default nobody chose.
    (getDeviceLanguageTags as jest.Mock).mockReturnValueOnce([
      'ja-JP',
      'es-MX',
    ]);

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    expect(JSON.stringify(renderer!.toJSON())).toContain('Elige tus idiomas');
  });

  it('keeps the two languages apart and follows the choice at once', async () => {
    await AsyncStorage.removeItem(PREFERENCES_KEY);

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    // The device is set to Portuguese, so English is what it offers to learn.
    // Claiming English as the language already spoken trades the two places
    // instead of leaving both on English.
    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'onboarding-native-en-US').props.onPress();
    });

    const afterSwap = JSON.stringify(renderer!.toJSON());
    expect(afterSwap).toContain('Choose your languages');

    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'onboarding-advance').props.onPress();
    });

    // Swapping is not the same as answering: the step still waits for what the
    // learner came to learn.
    expect(JSON.stringify(renderer!.toJSON())).toContain(
      'Choose your languages',
    );

    await chooseOnboardingLanguages(renderer!, 'pt-BR');
    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'onboarding-advance').props.onPress();
    });

    expect(
      JSON.parse((await AsyncStorage.getItem(PREFERENCES_KEY)) ?? '{}'),
    ).toMatchObject({ nativeLanguage: 'en-US', learningLanguage: 'pt-BR' });
  });

  it('offers the account from the last step of the first run', async () => {
    await AsyncStorage.removeItem(PREFERENCES_KEY);

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    await chooseOnboardingLanguages(renderer!);

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'onboarding-pages' })
        .props.onMomentumScrollEnd({
          nativeEvent: { contentOffset: { x: 750 * 4 } },
        });
    });

    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'onboarding-google').props.onPress();
    });

    expect(mockAuthenticator.signInWithGoogle).toHaveBeenCalled();

    // Leaving stays one tap away on the step that asks for something.
    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'onboarding-skip').props.onPress();
    });

    expect(
      renderer!.root.findAllByProps({ testID: 'onboarding' }),
    ).toHaveLength(0);
  });
});
