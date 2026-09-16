import {
  GoogleSignin,
  type SignInSilentlyResponse,
} from '@react-native-google-signin/google-signin';
import { AppError } from '../../types/appError';
import { getSupabaseClient } from '../supabase/client';
import { configureGoogleSignIn } from './googleAuth';

function isSilentSignInSuccess(
  response: SignInSilentlyResponse,
): response is Extract<SignInSilentlyResponse, { type: 'success' }> {
  return response.type === 'success';
}

/** Native Google credentials are separate from the persisted Supabase session. */
export async function getGoogleAccessToken(
  invalidToken?: string,
): Promise<string> {
  try {
    configureGoogleSignIn();
    let googleUser = GoogleSignin.getCurrentUser();
    if (!googleUser) {
      const result = await GoogleSignin.signInSilently();
      if (!isSilentSignInSuccess(result)) {
        throw new AppError(
          'GOOGLE_AUTH_ERROR',
          'Please log out and sign in with Google again to access Gmail.',
        );
      }
      googleUser = result.data;
    }
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error || !data.session) {
      throw new AppError(
        'SESSION_EXPIRED',
        'Your session expired. Please sign in again.',
      );
    }
    const matchesAccount = data.session.user.identities?.some(
      identity =>
        identity.provider === 'google' &&
        (identity.identity_data?.sub === googleUser.user.id ||
          identity.id === googleUser.user.id),
    );
    if (!matchesAccount) {
      throw new AppError(
        'GOOGLE_AUTH_ERROR',
        'Your Google account does not match this session. Please log out and sign in again.',
      );
    }
    if (invalidToken) {
      await GoogleSignin.clearCachedAccessToken(invalidToken);
    }
    const { accessToken } = await GoogleSignin.getTokens();
    if (!accessToken?.trim()) {
      throw new AppError(
        'GOOGLE_AUTH_ERROR',
        'Google access is unavailable. Please log out and sign in again.',
      );
    }
    return accessToken;
  } catch (error) {
    throw error instanceof AppError
      ? error
      : new AppError(
          'GOOGLE_AUTH_ERROR',
          'Unable to access Google credentials. Retry, or log out and sign in again.',
          { cause: error },
        );
  }
}
