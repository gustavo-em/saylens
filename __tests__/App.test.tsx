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

describe('App', () => {
  beforeEach(() => {
    mockPronunciationPlayer.speak.mockReset().mockResolvedValue(undefined);
    mockPronunciationPlayer.stop.mockReset().mockResolvedValue(undefined);
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
    expect(renderedTree).toContain('camera-open-settings');
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

    const settingsControls = renderer!.root.findAllByProps({
      testID: 'camera-open-settings',
    });
    const pressableSettingsTab = settingsControls.find(
      control => typeof control.props.onPress === 'function',
    );

    await ReactTestRenderer.act(() => {
      pressableSettingsTab!.props.onPress();
    });

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

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'camera-open-settings' })
        .props.onPress();
    });

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

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'camera-open-settings' })
        .props.onPress();
    });

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

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'camera-open-settings' })
        .props.onPress();
    });

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

    await ReactTestRenderer.act(() => {
      relaunched!.root
        .findByProps({ testID: 'camera-open-settings' })
        .props.onPress();
    });

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

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'camera-open-settings' })
        .props.onPress();
    });

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

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'camera-open-settings' })
        .props.onPress();
    });

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
    expect(renderedTree).toContain('Toque para ouvir a pronúncia.');
    expect(renderedTree).toContain('PT');
    expect(
      renderer!.root.findAllByProps({ testID: 'close-word-modal' }),
    ).toHaveLength(0);
  });

  it('pronounces a detected word in the selected learning language', async () => {
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

    const detectedObjects = renderer!.root.findAllByProps({
      testID: 'detected-object-bottle-1',
    });
    const detectedObjectButton = detectedObjects.find(
      object =>
        object.props.accessibilityRole === 'button' &&
        typeof object.props.onPress === 'function',
    );

    expect(detectedObjectButton!.props.accessibilityRole).toBe('button');
    await ReactTestRenderer.act(async () => {
      detectedObjectButton!.props.onPress();
      await Promise.resolve();
    });

    expect(mockPronunciationPlayer.speak).toHaveBeenCalledWith(
      'Bottle',
      'en-US',
    );
  });

  it('updates the interface and vocabulary when language preferences change', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'camera-open-settings' })
        .props.onPress();
    });

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

    const spanishObjectButton = renderer!.root
      .findAllByProps({ testID: 'detected-object-bottle-1' })
      .find(
        object =>
          object.props.accessibilityRole === 'button' &&
          typeof object.props.onPress === 'function',
      );

    await ReactTestRenderer.act(async () => {
      spanishObjectButton!.props.onPress();
      await Promise.resolve();
    });

    expect(mockPronunciationPlayer.speak).toHaveBeenCalledWith('Botella', 'es');
  });
});
