import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { LoginScreen } from '../src/features/auth/screens/LoginScreen';
import { AuthenticatedTabs } from '../src/app/navigation/AuthenticatedTabs';

test('starts signed out with only the login screen', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  try {
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    expect(renderer?.root.findAllByType(LoginScreen)).toHaveLength(1);
    expect(renderer?.root.findAllByType(AuthenticatedTabs)).toHaveLength(0);
  } finally {
    await ReactTestRenderer.act(() => {
      renderer?.unmount();
    });
  }
});
