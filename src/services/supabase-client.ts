import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Tolerate a pasted REST URL (…/rest/v1/): the client expects the bare project URL.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

const secureSessionStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      persistSession: true,
      storage: Platform.OS === 'web' ? AsyncStorage : secureSessionStorage,
    },
  })
  : null;

export const isSupabaseConfigured = supabase !== null;

/**
 * Returns the current session, creating an anonymous one if there is none. Lets people who use Foco
 * without an account call server features (Foco IA) under their own id, so RLS and quotas apply.
 * Requires "Allow anonymous sign-ins" in the Supabase project.
 */
export async function ensureSupabaseSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: signedIn, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return signedIn.session;
}
