import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../src/app/App';

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

jest.mock(
  '../src/features/learning/infrastructure/auth/firebaseAuthenticator',
  () => ({
    firebaseAuthenticator: {
      signInWithGoogle: jest.fn(async () => ({
        id: 'learner-1',
        name: 'Gustavo',
        email: 'gustavo@example.com',
      })),
      signOut: jest.fn(async () => undefined),
      subscribe: jest.fn(() => () => undefined),
    },
  }),
);

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('react-native-saylens-object-detector', () => ({
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
  signInWithGoogle: jest.Mock;
  signOut: jest.Mock;
  subscribe: jest.Mock;
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

          // The tracker only shows a layer once a label has landed on the same
          // place four times, so the fake detector delivers four results the
          // way the real one would.
          onDetections(result);
          onDetections(result);
          onDetections(result);
          onDetections(result);
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

const PREFERENCES_KEY = 'saylens.preferences.v1';

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
    mockAuthenticator.signInWithGoogle.mockClear();
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

    expect(renderedTree).toContain('SayLens');
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
    expect(JSON.stringify(renderer!.toJSON())).toContain('#EFF5FD');
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

    await ReactTestRenderer.act(async () => {
      pressableWithTestID(renderer!, 'speak-listen').props.onPress();
      await Promise.resolve();
    });

    expect(mockSpeechRecognizer.listen).toHaveBeenCalledWith('en-US');

    // A word said right is celebrated rather than merely reported, and the
    // celebration offers both ways out.
    const celebrated = JSON.stringify(renderer!.toJSON());
    expect(celebrated).toContain('Parabéns!');
    expect(celebrated).toContain('Voltando em 5s');
    renderer!.root.findByProps({ testID: 'speak-celebration-camera' });

    await ReactTestRenderer.act(() => {
      pressableWithTestID(
        renderer!,
        'speak-celebration-history',
      ).props.onPress();
    });

    expect(
      renderer!.root.findByProps({ testID: 'history-filter-matched' }).props
        .accessibilityLabel,
    ).toBe('Acertei, 1');
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
    expect(firstStep).toContain('Aponte para qualquer coisa');
    // The detector does not run behind a screen that covers it.
    expect(
      renderer!.root.findByProps({ testID: 'camera-preview' }).props.isActive,
    ).toBe(false);

    // Three taps to reach the fourth step.
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

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'onboarding-pages' })
        .props.onMomentumScrollEnd({
          nativeEvent: { contentOffset: { x: 750 * 3 } },
        });
    });

    expect(
      renderer!.root.findAllByProps({ testID: 'onboarding-google' }),
    ).not.toHaveLength(0);
  });

  it('offers the account from the last step of the first run', async () => {
    await AsyncStorage.removeItem(PREFERENCES_KEY);

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'onboarding-pages' })
        .props.onMomentumScrollEnd({
          nativeEvent: { contentOffset: { x: 750 * 3 } },
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
