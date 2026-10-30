import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { parseAuthCallback } from '@/services/auth-callback';
import { isSupabaseConfigured, supabase } from '@/services/supabase-client';

export type GoogleSignInResult = 'signedIn' | 'cancelled' | 'identityExists';

const callbackPath = 'auth/callback';
const NOT_CONFIGURED = 'Google estará disponible cuando conectemos Supabase. Puedes seguir sin cuenta.';
const LINKING_DISABLED = 'Falta activar la vinculación de cuentas en Supabase.';
const FAILED = 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.';

/**
 * Opens Google in the system browser (Supabase OAuth with PKCE) and finishes the session when it
 * comes back. `getUrl` asks Supabase for the address to open: a sign-in or an identity link.
 */
async function runOAuth(getUrl: (redirectTo: string) => Promise<string | null>): Promise<GoogleSignInResult> {
  if (!isSupabaseConfigured || !supabase) throw new Error(NOT_CONFIGURED);
  const redirectTo = Linking.createURL(callbackPath);
  const url = await getUrl(redirectTo);
  if (!url) throw new Error(FAILED);

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') throw new Error(FAILED);
    window.location.assign(url);
    return 'cancelled';
  }

  const result = await WebBrowser.openAuthSessionAsync(url, redirectTo);
  if (result.type !== 'success' || !result.url) return 'cancelled';

  const callback = parseAuthCallback(result.url);
  if (callback.kind === 'cancelled') return 'cancelled';
  if (callback.kind === 'identityExists') return 'identityExists';
  if (callback.kind === 'linkingDisabled') throw new Error(LINKING_DISABLED);
  if (callback.kind === 'error') throw new Error(FAILED);

  const { error } = await supabase.auth.exchangeCodeForSession(callback.code);
  if (error) throw new Error(FAILED);
  return 'signedIn';
}

async function oauthUrl(redirectTo: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  if (error) throw new Error(FAILED);
  return data.url;
}

/**
 * «Continuar con Google». Someone already using Foco without an account has an anonymous session:
 * Google is linked to it, so they keep the same user (and their Foco IA quota). Otherwise it signs in.
 * 'identityExists' means that Google account already belongs to another Foco user.
 */
export function signInWithGoogle(): Promise<GoogleSignInResult> {
  return runOAuth(async (redirectTo) => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user.is_anonymous) return oauthUrl(redirectTo);
    const { data: link, error } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
    if (error) throw new Error(error.code === 'manual_linking_disabled' ? LINKING_DISABLED : FAILED);
    return link.url;
  });
}

/** Signs in to the Foco account a Google account already has, leaving the anonymous one. */
export function signInWithExistingGoogle(): Promise<GoogleSignInResult> {
  return runOAuth(oauthUrl);
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error('No se pudo cerrar la sesión. Inténtalo de nuevo.');
}
