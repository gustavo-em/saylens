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
      }: {
        isActive: boolean;
        onDetections: (frame: unknown) => void;
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
    expect(JSON.stringify(renderer!.toJSON())).toContain(
      'On-device learning loop',
    );
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
    expect(renderedTree).toContain('garrafa');
    expect(renderedTree).toContain('BÓ-tl');
    expect(renderedTree).toContain('91');
    expect(
      renderer!.root.findAllByProps({ testID: 'close-word-modal' }),
    ).toHaveLength(0);
  });
});
