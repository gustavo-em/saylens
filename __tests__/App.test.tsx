import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../src/app/App';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

describe('App', () => {
  it('renders the Android foundation milestone', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    const renderedTree = JSON.stringify(renderer!.toJSON());

    expect(renderedTree).toContain('SpellForMe');
    expect(renderedTree).toContain('ANDROID FOUNDATION READY');
  });
});
