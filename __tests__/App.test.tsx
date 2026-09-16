import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import App from '../App';
import { LoginScreen } from '../src/features/auth/screens/LoginScreen';
import { LoginView } from '../src/features/auth/components/LoginView';
import { AppButton } from '../src/components/common/AppButton';
import { AuthenticatedTabs } from '../src/app/navigation/AuthenticatedTabs';
import { getSupabaseClient } from '../src/services/supabase/client';

jest.mock('../src/services/supabase/client', () => ({
  getSupabaseClient: jest.fn(),
}));

test('login and logout buttons switch between signed-out and authenticated navigation', async () => {
  const signOut = jest.fn().mockResolvedValue({ error: null });
  (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
    type: 'success',
    data: { idToken: 'google-token' },
  });
  (getSupabaseClient as jest.Mock).mockReturnValue({
    auth: {
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      signInWithIdToken: jest
        .fn()
        .mockResolvedValue({
          data: { session: { access_token: 'session-token' } },
          error: null,
        }),
      signOut,
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
  });
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<App />);
    });
    expect(renderer?.root.findAllByType(LoginScreen)).toHaveLength(1);
    expect(renderer?.root.findAllByType(AuthenticatedTabs)).toHaveLength(0);
    await ReactTestRenderer.act(async () => {
      renderer?.root.findByType(LoginView).props.onGoogleSignIn();
    });
    expect(renderer?.root.findAllByType(LoginScreen)).toHaveLength(0);
    expect(renderer?.root.findAllByType(AuthenticatedTabs)).toHaveLength(1);
    await ReactTestRenderer.act(async () => {
      renderer?.root
        .findAllByType(AppButton)
        .find(button => button.props.label === 'Log out')
        ?.props.onPress();
    });
    expect(signOut).toHaveBeenCalled();
    expect(GoogleSignin.signOut).toHaveBeenCalled();
    expect(renderer?.root.findAllByType(LoginScreen)).toHaveLength(1);
    expect(renderer?.root.findAllByType(AuthenticatedTabs)).toHaveLength(0);
  } finally {
    await ReactTestRenderer.act(async () => {
      renderer?.unmount();
    });
  }
});
