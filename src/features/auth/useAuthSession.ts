import { useEffect } from 'react';
import { AppState } from 'react-native';
import {
  isAuthApiError,
  isAuthSessionMissingError,
} from '@supabase/supabase-js';
import { getSupabaseClient } from '../../services/supabase/client';
import { AppError } from '../../types/appError';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import {
  authFailed,
  authFailure,
  restorationFinished,
  sessionChanged,
} from './authSlice';

export function useAuthSession() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    let active = true;
    let revision = 0;
    let checking = false;
    let cleanup = () => {};
    try {
      const { auth } = getSupabaseClient();
      const {
        data: { subscription },
      } = auth.onAuthStateChange((event, session) => {
        // Restoration is verified with the server below before opening navigation.
        if (!active || event === 'INITIAL_SESSION') {
          return;
        }
        if (event !== 'TOKEN_REFRESHED') {
          revision += 1;
        }
        dispatch(
          sessionChanged(
            Boolean(
              session &&
                session.expires_at &&
                session.expires_at * 1000 > Date.now(),
            ),
          ),
        );
        if (event === 'SIGNED_OUT') {
          dispatch(
            authFailed(
              authFailure(
                new AppError(
                  'SESSION_EXPIRED',
                  'Your session ended. Please sign in again.',
                ),
              ),
            ),
          );
        }
      });
      const validate = async () => {
        if (checking) {
          return;
        }
        checking = true;
        const currentRevision = revision;
        try {
          const { data, error } = await auth.getSession();
          if (error) {
            throw error;
          }
          if (data.session) {
            const { data: userData, error: userError } = await auth.getUser();
            if (userError) {
              throw userError;
            }
            if (!userData.user) {
              throw new AppError(
                'SESSION_EXPIRED',
                'Your session is invalid. Please sign in again.',
              );
            }
          }
          if (active && revision === currentRevision) {
            dispatch(sessionChanged(Boolean(data.session)));
          }
        } catch (error) {
          if (!active || revision !== currentRevision) {
            return;
          }
          dispatch(sessionChanged(false));
          const invalid =
            isAuthSessionMissingError(error) ||
            (isAuthApiError(error) &&
              [400, 401, 403, 404].includes(error.status)) ||
            (error instanceof AppError && error.code === 'SESSION_EXPIRED');
          if (invalid) {
            try {
              await auth.signOut({ scope: 'local' });
            } catch {
              /* Keep invalid sessions out of navigation even if cleanup fails. */
            }
          }
          if (active) {
            dispatch(
              authFailed(
                authFailure(
                  new AppError(
                    invalid ? 'SESSION_EXPIRED' : 'SUPABASE_ERROR',
                    invalid
                      ? 'Your session expired. Please sign in again.'
                      : 'Unable to verify your session. Check your connection and try again.',
                    { cause: error },
                  ),
                ),
              ),
            );
          }
        } finally {
          checking = false;
          if (active) {
            dispatch(restorationFinished());
          }
        }
      };
      const updateAppState = (state: string | null | undefined) => {
        if (state === 'active') {
          auth.startAutoRefresh();
          validate();
        } else {
          auth.stopAutoRefresh();
        }
      };
      const listener = AppState.addEventListener('change', updateAppState);
      updateAppState(AppState.currentState);
      validate();
      cleanup = () => {
        subscription.unsubscribe();
        listener.remove();
        auth.stopAutoRefresh();
      };
    } catch (error) {
      dispatch(authFailed(authFailure(error)));
      dispatch(restorationFinished());
    }
    return () => {
      active = false;
      cleanup();
    };
  }, [dispatch]);
}
