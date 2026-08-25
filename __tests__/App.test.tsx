import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../src/app/App';

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
    },
  }),
);

const mockPronunciationPlayer = jest.requireMock(
  '../src/features/learning/infrastructure/pronunciation/systemPronunciationPlayer',
).systemPronunciationPlayer as {
  speak: jest.Mock;
  stop: jest.Mock;
};

jest.mock(
  '../src/features/learning/infrastructure/speech/systemSpeechRecognizer',
  () => ({
    systemSpeechRecognizer: {
      isAvailable: jest.fn(async () => true),
      hasPermission: jest.fn(async () => true),
      listen: jest.fn(async () => ['Bottle']),
      cancel: jest.fn(async () => undefined),
    },
  }),
);

const mockSpeechRecognizer = jest.requireMock(
  '../src/features/learning/infrastructure/speech/systemSpeechRecognizer',
).systemSpeechRecognizer as {
  isAvailable: jest.Mock;
  hasPermission: jest.Mock;
  listen: jest.Mock;
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

          // The tracker only shows a layer once a label has been seen twice,
          // so the fake detector has to deliver two results like the real one.
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

async function pressCameraMenuItem(
  renderer: ReactTestRenderer.ReactTestRenderer,
  testID: string,
) {
  await ReactTestRenderer.act(() => {
    renderer.root.findByProps({ testID: 'camera-menu' }).props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer.root.findByProps({ testID }).props.onPress();
  });
}

describe('App', () => {
  beforeEach(() => {
    mockPronunciationPlayer.speak.mockReset().mockResolvedValue(undefined);
    mockPronunciationPlayer.stop.mockReset().mockResolvedValue(undefined);
    mockSpeechRecognizer.isAvailable.mockReset().mockResolvedValue(true);
    mockSpeechRecognizer.hasPermission.mockReset().mockResolvedValue(true);
    mockSpeechRecognizer.listen.mockReset().mockResolvedValue(['Bottle']);
    mockSpeechRecognizer.cancel.mockReset().mockResolvedValue(undefined);
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
    expect(renderedTree).toContain('camera-menu');
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
    expect(settingsTree).toContain('Perfil do dispositivo');
    expect(settingsTree).toContain('Máximo desempenho');
    expect(settingsTree).toContain(
      'Reconhecimento mais rápido e fluido. Usa mais bateria.',
    );
    expect(settingsTree).not.toContain('workers');
    expect(settingsTree).toContain('Modo economia');
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
      renderer!.root.findByProps({
        testID: 'performance-profile-maximum-performance',
      }).props.accessibilityState.checked,
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
        .findByProps({ testID: 'performance-profile-power-saving' })
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
        .findByProps({ testID: 'performance-profile-power-saving' })
        .props.onPress();
    });

    expect(
      renderer!.root.findByProps({
        testID: 'performance-profile-power-saving',
      }).props.accessibilityState.checked,
    ).toBe(true);
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
      renderer!.root.findByProps({
        testID: 'performance-profile-maximum-performance',
      }).props.accessibilityState.checked,
    ).toBe(true);
    renderer!.root.findByProps({
      testID: 'performance-profile-power-saving',
    });
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
    expect(renderedTree).toContain('Garrafa');
    expect(renderedTree).toContain('Botella');
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
        .findByProps({ testID: 'native-language-en-US' })
        .props.onPress();
    });

    expect(JSON.stringify(renderer!.toJSON())).toContain('Settings');
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
    expect(JSON.stringify(renderer!.toJSON())).toContain('Muito bem!');

    await ReactTestRenderer.act(() => {
      pressableWithTestID(renderer!, 'speak-close').props.onPress();
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
    expect(JSON.stringify(renderer!.toJSON())).toContain('Treinar');
  });

});
