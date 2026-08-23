import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../src/app/App';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

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
          if (isActive) {
            onDetections({
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
            });
          }
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
  it('opens on the camera screen with both navigation tabs', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    const renderedTree = JSON.stringify(renderer!.toJSON());

    expect(renderedTree).toContain('SpellForMe');
    expect(renderedTree).toContain('Câmera');
    expect(renderedTree).toContain('Configurações');
    expect(renderedTree).toContain('camera-preview');
  });

  it('pauses the camera while the settings screen is selected', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    expect(
      renderer!.root.findByProps({ testID: 'camera-preview' }).props.isActive,
    ).toBe(true);

    const settingsTabs = renderer!.root.findAllByProps({
      testID: 'tab-settings',
    });
    const pressableSettingsTab = settingsTabs.find(
      tab => typeof tab.props.onPress === 'function',
    );

    await ReactTestRenderer.act(() => {
      pressableSettingsTab!.props.onPress();
    });

    expect(
      renderer!.root.findByProps({ testID: 'camera-preview' }).props.isActive,
    ).toBe(false);
    expect(
      renderer!.root.findAllByProps({ testID: 'detected-object-bottle-0' }),
    ).toHaveLength(0);
    const settingsTree = JSON.stringify(renderer!.toJSON());
    expect(settingsTree).toContain('Perfil do dispositivo');
    expect(settingsTree).toContain('Dispositivo básico');
    expect(settingsTree).not.toContain('BASE TÉCNICA');
    expect(settingsTree).not.toContain('MILESTONE');
    expect(settingsTree).not.toContain('Guia de enquadramento');
    expect(settingsTree).not.toContain('APONTE PARA UM OBJETO');
  });

  it('switches to the low-device performance profile', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    expect(
      renderer!.root.findByProps({ testID: 'camera-preview' }).props
        .performanceProfile,
    ).toBe('high-performance');

    await ReactTestRenderer.act(() => {
      renderer!.root.findByProps({ testID: 'tab-settings' }).props.onPress();
    });

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'performance-profile-low-device' })
        .props.onPress();
    });

    expect(
      renderer!.root.findByProps({ testID: 'performance-profile-low-device' })
        .props.accessibilityState.checked,
    ).toBe(true);
    expect(
      renderer!.root.findByProps({ testID: 'camera-preview' }).props
        .performanceProfile,
    ).toBe('low-device');
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
      testID: 'detected-object-bottle-0',
    });

    const renderedTree = JSON.stringify(renderer!.toJSON());
    expect(renderedTree).toContain('Bottle');
    expect(renderedTree).toContain('Garrafa');
    expect(renderedTree).toContain('BÓ-tl');
    expect(renderedTree).toContain('SIGNIFICADO');
    expect(renderedTree).toContain('PRONÚNCIA');
    expect(renderedTree).toContain('Aa');
    expect(renderedTree).toContain('91');
    expect(
      renderer!.root.findAllByProps({ testID: 'close-word-modal' }),
    ).toHaveLength(0);
  });

  it('updates the interface and vocabulary when language preferences change', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    await ReactTestRenderer.act(() => {
      renderer!.root.findByProps({ testID: 'tab-settings' }).props.onPress();
    });

    await ReactTestRenderer.act(() => {
      renderer!.root
        .findByProps({ testID: 'native-language-en' })
        .props.onPress();
    });

    expect(JSON.stringify(renderer!.toJSON())).toContain('Settings');
    expect(
      renderer!.root.findByProps({ testID: 'learning-language-en' }).props
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
      renderer!.root.findByProps({ testID: 'tab-camera' }).props.onPress();
      renderer!.root
        .findByProps({ testID: 'camera-container' })
        .props.onLayout({
          nativeEvent: { layout: { width: 360, height: 640 } },
        });
    });

    const renderedTree = JSON.stringify(renderer!.toJSON());
    expect(renderedTree).toContain('Botella');
    expect(renderedTree).toContain('Bottle');
    expect(renderedTree).toContain('Explore spanish around you');
  });
});
