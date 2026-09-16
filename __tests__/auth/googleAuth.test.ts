import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { configureStore } from '@reduxjs/toolkit';
import { signInWithGoogle, signOut } from '../../src/services/auth/googleAuth';
import { authReducer, login, logout } from '../../src/features/auth/authSlice';
import { getSupabaseClient } from '../../src/services/supabase/client';

jest.mock('../../src/services/supabase/client', () => ({
  getSupabaseClient: jest.fn(),
}));
const exchange = jest.fn();
const supabaseSignOut = jest.fn();
const session = { access_token: 'test-token' };
beforeEach(() => {
  jest.clearAllMocks();
  (getSupabaseClient as jest.Mock).mockReturnValue({
    auth: { signInWithIdToken: exchange, signOut: supabaseSignOut },
  });
  (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
    type: 'success',
    data: { idToken: 'google-token' },
  });
  (GoogleSignin.signOut as jest.Mock).mockResolvedValue(null);
  exchange.mockResolvedValue({ data: { session }, error: null });
  supabaseSignOut.mockResolvedValue({ error: null });
});
test('requests Gmail modify and exchanges the Google ID token for a Supabase session', async () => {
  expect(await signInWithGoogle()).toBe(session);
  expect(GoogleSignin.configure).toHaveBeenCalledWith({
    webClientId: 'test-client',
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],
  });
  expect(exchange).toHaveBeenCalledWith({
    provider: 'google',
    token: 'google-token',
  });
});
test.each([{ type: 'cancelled' }, { code: 'SIGN_IN_CANCELLED' }])(
  'cancellation stays signed out without an error: %j',
  async result => {
    if ('code' in result) {
      (GoogleSignin.signIn as jest.Mock).mockRejectedValue(result);
    } else {
      (GoogleSignin.signIn as jest.Mock).mockResolvedValue(result);
    }
    const store = configureStore({ reducer: { auth: authReducer } });
    await store.dispatch(login());
    expect(store.getState().auth).toMatchObject({
      isAuthenticated: false,
      busy: false,
      error: null,
    });
    expect(exchange).not.toHaveBeenCalled();
  },
);
test('missing ID token never reaches Supabase', async () => {
  (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
    type: 'success',
    data: { idToken: null },
  });
  await expect(signInWithGoogle()).rejects.toMatchObject({
    code: 'GOOGLE_AUTH_ERROR',
  });
  expect(exchange).not.toHaveBeenCalled();
});
test('Google failure uses AppError', async () => {
  (GoogleSignin.signIn as jest.Mock).mockRejectedValue(
    new Error('native failure'),
  );
  await expect(signInWithGoogle()).rejects.toMatchObject({
    code: 'GOOGLE_AUTH_ERROR',
  });
});
test('Supabase failure is serializable in auth state', async () => {
  exchange.mockResolvedValue({
    data: { session: null },
    error: new Error('exchange failed'),
  });
  const store = configureStore({ reducer: { auth: authReducer } });
  await store.dispatch(login());
  expect(store.getState().auth).toMatchObject({
    isAuthenticated: false,
    busy: false,
    error: { code: 'SUPABASE_ERROR' },
  });
});
test('successful login and logout update auth state', async () => {
  const store = configureStore({ reducer: { auth: authReducer } });
  await store.dispatch(login());
  expect(store.getState().auth.isAuthenticated).toBe(true);
  await store.dispatch(logout());
  expect(store.getState().auth.isAuthenticated).toBe(false);
  expect(supabaseSignOut).toHaveBeenCalledWith({ scope: 'local' });
  expect(GoogleSignin.signOut).toHaveBeenCalled();
});
test('both logout providers are attempted when Supabase fails', async () => {
  supabaseSignOut.mockRejectedValue(new Error('offline'));
  await expect(signOut()).rejects.toMatchObject({ code: 'SUPABASE_ERROR' });
  expect(GoogleSignin.signOut).toHaveBeenCalled();
});
test('Google logout failure is reported after Supabase logout', async () => {
  (GoogleSignin.signOut as jest.Mock).mockRejectedValue(
    new Error('native failure'),
  );
  await expect(signOut()).rejects.toMatchObject({ code: 'GOOGLE_AUTH_ERROR' });
  expect(supabaseSignOut).toHaveBeenCalled();
});
