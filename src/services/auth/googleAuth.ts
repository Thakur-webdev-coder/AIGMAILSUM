import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { env } from '../../config/env';
import { AppError } from '../../types/appError';
import { getSupabaseClient } from '../supabase/client';

export function configureGoogleSignIn() {
  if (!env.googleWebClientId) {
    throw new AppError(
      'GOOGLE_AUTH_ERROR',
      'Set GOOGLE_WEB_CLIENT_ID before signing in.',
    );
  }
  GoogleSignin.configure({
    webClientId: env.googleWebClientId,
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],
  });
}

export async function signInWithGoogle() {
  let idToken: string | null;
  try {
    configureGoogleSignIn();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    if (!isSuccessResponse(result)) {
      return null;
    }
    idToken = result.data.idToken;
    if (!idToken) {
      throw new AppError(
        'GOOGLE_AUTH_ERROR',
        'Google did not return an ID token. Please try again.',
      );
    }
  } catch (error) {
    if (
      isErrorWithCode(error) &&
      error.code === statusCodes.SIGN_IN_CANCELLED
    ) {
      return null;
    }
    throw error instanceof AppError
      ? error
      : new AppError(
          'GOOGLE_AUTH_ERROR',
          'Google sign-in failed. Please try again.',
          { cause: error },
        );
  }
  try {
    const { data, error } = await getSupabaseClient().auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (__DEV__ && error) {
      // Temporary diagnostics: redact credentials that may be echoed in messages.
      const message = [idToken, ...Object.values(env)]
        .filter(Boolean)
        .reduce((text, value) => text.split(value).join('[REDACTED]'), error.message)
        .replace(/[\w-]+\.apps\.googleusercontent\.com/g, '[REDACTED]')
        .replace(/eyJ[\w-]*\.[\w-]+(?:\.[\w-]*)?/g, '[REDACTED]');
      console.log('Supabase signInWithIdToken failed', {
        message,
        code: error.code,
        status: error.status,
      });
    }
    if (error || !data.session) {
      throw error ?? new Error('Missing Supabase session');
    }
    return data.session;
  } catch (error) {
    throw new AppError(
      'SUPABASE_ERROR',
      'Unable to create your session. Please try signing in again.',
      { cause: error },
    );
  }
}

export async function signOut() {
  const results = await Promise.allSettled([
    Promise.resolve().then(async () => {
      const { error } = await getSupabaseClient().auth.signOut({
        scope: 'local',
      });
      if (error) {
        throw error;
      }
    }),
    Promise.resolve().then(async () => {
      configureGoogleSignIn();
      await GoogleSignin.signOut();
    }),
  ]);
  if (results[0].status === 'rejected') {
    throw new AppError(
      'SUPABASE_ERROR',
      'Could not sign out of Supabase. Please retry.',
      { cause: results[0].reason },
    );
  }
  if (results[1].status === 'rejected') {
    throw new AppError(
      'GOOGLE_AUTH_ERROR',
      'Your app session ended, but Google sign-out failed. Please retry logout.',
      { cause: results[1].reason },
    );
  }
}
