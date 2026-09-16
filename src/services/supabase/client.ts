import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { env } from '../../config/env';
import { AppError } from '../../types/appError';

function createSupabaseClient() {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new AppError(
      'SUPABASE_ERROR',
      'Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY before using Supabase.',
    );
  }

  return createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });
}

let client: ReturnType<typeof createSupabaseClient> | undefined;

// Lazy initialization keeps the foundation usable without configured services.
export function getSupabaseClient() {
  client ??= createSupabaseClient();
  return client;
}
