import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/services/supabase-client';

const callbackPath = 'auth/callback';

function getCallbackCode(url: string) {
  const value = Linking.parse(url).queryParams?.code;
  return Array.isArray(value) ? value[0] : value;
}

export async function signInWithGoogle(): Promise<Session | null> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Google estará disponible cuando conectemos Supabase. Puedes empezar ahora y guardar tus datos en este dispositivo.');
  }

  const redirectTo = Linking.createURL(callbackPath);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) throw new Error('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
  if (!data.url) throw new Error('Google no devolvió un enlace para iniciar sesión.');

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') throw new Error('El acceso con Google no está disponible en este entorno.');
    window.location.assign(data.url);
    return null;
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) return null;

  const code = getCallbackCode(result.url);
  if (typeof code !== 'string' || !code) {
    throw new Error('No se pudo completar el regreso desde Google. Vuelve a intentarlo.');
  }

  return finishGoogleRedirectCode(code);
}

export async function finishGoogleRedirectCode(code: string): Promise<Session> {
  if (!supabase) throw new Error('Falta configurar el acceso seguro de Foco.');
  if (!code) throw new Error('No se encontró el código de regreso de Google.');

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) throw new Error('No se pudo validar la sesión de Google.');
  return data.session;
}
