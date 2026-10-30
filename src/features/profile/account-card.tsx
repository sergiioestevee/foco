import { Alert, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { GoogleLogo } from '@/components/google-logo';
import { Surface } from '@/components/surface';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { signOut } from '@/services/google-auth';
import { useAuthSession } from '@/services/use-auth-session';
import { useGoogleSignIn } from '@/services/use-google-sign-in';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

/** «Cuenta» in Perfil: who you're signed in as (shown only here, never sent to Foco IA), or Google to sign in. */
export function AccountCard() {
  const theme = useTheme();
  const { status, email } = useAuthSession();
  const google = useGoogleSignIn();

  if (status === 'loading') return null;

  const confirmSignOut = () => {
    Alert.alert('¿Cerrar sesión?', 'Tus datos se quedan en este iPhone.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => {
          signOut().catch((error: unknown) => Alert.alert('No se pudo cerrar la sesión', error instanceof Error ? error.message : 'Inténtalo de nuevo.'));
        },
      },
    ]);
  };

  return (
    <Surface style={styles.card}>
      <Typography kind="heading">Cuenta</Typography>
      {status === 'account' ? (
        <>
          <View style={styles.row}>
            <SymbolIcon ios="person.crop.circle.badge.checkmark" other="verified_user" color={theme.ok} size={22} />
            <View style={styles.copy}>
              <Typography style={styles.title}>Has entrado con Google</Typography>
              {email ? <Typography kind="secondary" numberOfLines={1}>{email}</Typography> : null}
            </View>
          </View>
          <ActionButton label="Cerrar sesión" variant="plain" onPress={confirmSignOut} style={styles.signOut} />
        </>
      ) : (
        <>
          <View style={styles.row}>
            <SymbolIcon ios="iphone" other="smartphone" color={theme.muted} size={22} />
            <Typography kind="secondary" style={styles.copy}>Tus datos solo están en este iPhone.</Typography>
          </View>
          <ActionButton
            label={google.busy ? 'Conectando…' : 'Continuar con Google'}
            variant="secondary"
            icon={<GoogleLogo size={17} />}
            disabled={google.busy}
            onPress={google.start}
          />
        </>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  copy: { flex: 1, gap: 2 },
  title: { fontWeight: '700' },
  signOut: { alignSelf: 'flex-start', paddingHorizontal: 0 },
});
