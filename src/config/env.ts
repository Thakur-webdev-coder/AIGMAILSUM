import {
  GOOGLE_WEB_CLIENT_ID,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from '@env';

// These public values are substituted at build time, never read from Node at runtime.
export const env = Object.freeze({
  supabaseUrl: SUPABASE_URL?.trim() ?? '',
  supabasePublishableKey: SUPABASE_PUBLISHABLE_KEY?.trim() ?? '',
  googleWebClientId: GOOGLE_WEB_CLIENT_ID?.trim() ?? '',
});
