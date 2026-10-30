import { useState } from 'react';
import { Alert } from 'react-native';

import { signInWithExistingGoogle, signInWithGoogle, type GoogleSignInResult } from '@/services/google-auth';

/**
 * «Continuar con Google» for any screen: one flow at a time (busy), an offer to switch when the
 * Google account already uses Foco, silence on cancel, and errors as an alert.
 */
export function useGoogleSignIn(onSignedIn?: () => void) {
  const [busy, setBusy] = useState(false);

  const run = async (attempt: () => Promise<GoogleSignInResult>) => {
    setBusy(true);
    try {
      const result = await attempt();
      if (result === 'signedIn') onSignedIn?.();
      if (result === 'identityExists') {
        Alert.alert(
          'Esta cuenta de Google ya usa Foco',
          '¿Quieres entrar con ella? Cuando llegue la sincronización podrás elegir qué hacer con los datos de este iPhone.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Entrar', onPress: () => void run(signInWithExistingGoogle) },
          ],
        );
      }
    } catch (error) {
      Alert.alert('No se pudo entrar', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return { busy, start: () => (busy ? undefined : void run(signInWithGoogle)) };
}
