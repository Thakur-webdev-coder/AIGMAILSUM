import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AppState, type AppStateStatus } from 'react-native';
import { AuthApiError, type Session } from '@supabase/supabase-js';
import { authReducer } from '../../src/features/auth/authSlice';
import { useAuthSession } from '../../src/features/auth/useAuthSession';
import { getSupabaseClient } from '../../src/services/supabase/client';

jest.mock('../../src/services/supabase/client', () => ({
  getSupabaseClient: jest.fn(),
}));
const getSession = jest.fn();
const getUser = jest.fn();
const signOut = jest.fn();
const unsubscribe = jest.fn();
const startAutoRefresh = jest.fn();
const stopAutoRefresh = jest.fn();
let onAuthChange: (event: string, session: Partial<Session> | null) => void;
let onAppChange: (state: AppStateStatus) => void;
const remove = jest.fn();
const session = {
  access_token: 'stored',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};
function Harness() {
  useAuthSession();
  return null;
}
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, handler) => {
      onAppChange = handler;
      return { remove };
    });
  getSession.mockResolvedValue({ data: { session }, error: null });
  getUser.mockResolvedValue({ data: { user: { id: 'user' } }, error: null });
  signOut.mockImplementation(async () => {
    onAuthChange('SIGNED_OUT', null);
    return { error: null };
  });
  (getSupabaseClient as jest.Mock).mockReturnValue({
    auth: {
      getSession,
      getUser,
      signOut,
      startAutoRefresh,
      stopAutoRefresh,
      onAuthStateChange: jest.fn(callback => {
        onAuthChange = callback;
        return { data: { subscription: { unsubscribe } } };
      }),
    },
  });
});
afterEach(() => jest.restoreAllMocks());
async function mount() {
  const store = configureStore({ reducer: { auth: authReducer } });
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <Provider store={store}>
        <Harness />
      </Provider>,
    );
  });
  return {
    store,
    unmount: async () => {
      await act(async () => {
        renderer.unmount();
      });
    },
  };
}
test('restores stored session after validation and cleans up listeners', async () => {
  const { store, unmount } = await mount();
  expect(store.getState().auth).toMatchObject({
    isAuthenticated: true,
    initializing: false,
  });
  expect(getUser).toHaveBeenCalled();
  await unmount();
  expect(unsubscribe).toHaveBeenCalled();
  expect(remove).toHaveBeenCalled();
  expect(stopAutoRefresh).toHaveBeenCalled();
});
test('invalid session returns to login and clears the stored session', async () => {
  getUser.mockResolvedValue({
    data: { user: null },
    error: new AuthApiError('invalid', 401, undefined),
  });
  const { store, unmount } = await mount();
  expect(store.getState().auth).toMatchObject({
    isAuthenticated: false,
    initializing: false,
    error: { code: 'SESSION_EXPIRED' },
  });
  expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  await unmount();
});
test('refresh failure during restoration is handled', async () => {
  getSession.mockResolvedValue({
    data: { session: null },
    error: new AuthApiError('invalid refresh token', 400, undefined),
  });
  const { store, unmount } = await mount();
  expect(store.getState().auth).toMatchObject({
    isAuthenticated: false,
    error: { code: 'SESSION_EXPIRED' },
  });
  await unmount();
});
test('temporary network failure preserves storage and reports retryable error', async () => {
  getUser.mockRejectedValue(new Error('offline'));
  const { store, unmount } = await mount();
  expect(store.getState().auth).toMatchObject({
    isAuthenticated: false,
    initializing: false,
    error: { code: 'SUPABASE_ERROR' },
  });
  expect(signOut).not.toHaveBeenCalled();
  await unmount();
});
test('foreground validates and refreshes; sign-out event removes authenticated navigation state', async () => {
  const { store, unmount } = await mount();
  await act(async () => {
    onAppChange('background');
  });
  expect(stopAutoRefresh).toHaveBeenCalled();
  await act(async () => {
    onAppChange('active');
  });
  expect(startAutoRefresh).toHaveBeenCalled();
  expect(getSession).toHaveBeenCalledTimes(2);
  await act(async () => {
    onAuthChange('TOKEN_REFRESHED', session);
  });
  expect(store.getState().auth.isAuthenticated).toBe(true);
  await act(async () => {
    onAuthChange('SIGNED_OUT', null);
  });
  expect(store.getState().auth.isAuthenticated).toBe(false);
  await unmount();
});
