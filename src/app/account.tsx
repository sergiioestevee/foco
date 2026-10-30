import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocoLogo } from '@/components/foco-logo';
import { GoogleLogo } from '@/components/google-logo';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { useGoogleSignIn } from '@/services/use-google-sign-in';
import { useTheme } from '@/theme/use-theme';
import { radii, spacing } from '@/theme/tokens';

export default function AccountScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const goToOnboarding = () => router.push(preview === '1' ? { pathname: '/onboarding', params: { preview: '1' } } : '/onboarding');
  const google = useGoogleSignIn(goToOnboarding);

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.intro}>
        <FocoLogo size={64} />
        <Typography accessibilityRole="header" style={styles.title}>¿Dónde guardamos tu progreso?</Typography>
        <Typography kind="secondary" style={styles.body}>
          Con una cuenta, tus tareas, exámenes y chats con la IA se sincronizan entre dispositivos y no se pierden si cambias de iPhone.
        </Typography>
      </View>

      <View style={styles.options}>
        {/* Apple waits for the Apple Developer account; Google already works. */}
        <SignInButton
          label="Continuar con Apple"
          icon={<SymbolIcon ios="lock" other="lock" color={theme.bg} size={20} />}
          backgroundColor={theme.text}
          color={theme.bg}
        />
        <SignInButton
          label={google.busy ? 'Conectando…' : 'Continuar con Google'}
          icon={<GoogleLogo size={20} />}
          backgroundColor={theme.surf}
          borderColor={theme.line}
          color={theme.text}
          onPress={google.start}
          busy={google.busy}
        />

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.line }]} />
          <Typography kind="secondary">o</Typography>
          <View style={[styles.dividerLine, { backgroundColor: theme.line }]} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Usar sin cuenta"
          accessibilityHint="Se guarda solo en este iPhone. Podrás vincular una cuenta más tarde."
          onPress={goToOnboarding}
          style={({ pressed }) => [styles.localOption, { borderColor: theme.muted, opacity: pressed ? 0.7 : 1 }]}>
          <SymbolIcon ios="iphone" other="smartphone" color={theme.muted} size={20} />
          <View style={styles.localCopy}>
            <Typography style={styles.localTitle}>Usar sin cuenta</Typography>
            <Typography kind="secondary" style={styles.localBody}>
              Se guarda solo en este iPhone. Podrás vincular una cuenta más tarde.
            </Typography>
          </View>
          <SymbolIcon ios="chevron.right" other="chevron_right" color={theme.muted} size={14} />
        </Pressable>

        <Typography kind="caption" style={styles.legal}>
          Al continuar aceptas los Términos y la Política de privacidad.
        </Typography>
      </View>
    </ScrollView>
  );
}

/** Without onPress it shows as «Pronto» and can't be tapped. */
function SignInButton({ label, icon, backgroundColor, borderColor, color, onPress, busy = false }: {
  label: string;
  icon: ReactNode;
  backgroundColor: string;
  borderColor?: string;
  color: string;
  onPress?: () => void;
  busy?: boolean;
}) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={onPress}
        style={({ pressed }) => [styles.signIn, { backgroundColor, borderColor: borderColor ?? backgroundColor, opacity: pressed || busy ? 0.7 : 1 }]}>
        <View style={styles.signInContent}>
          {icon}
          <Typography style={[styles.signInLabel, { color }]}>{label}</Typography>
        </View>
      </Pressable>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Disponible próximamente"
      accessibilityState={{ disabled: true }}
      style={[styles.signIn, { backgroundColor, borderColor: borderColor ?? backgroundColor }]}>
      <View style={styles.signInDisabled}>
        {icon}
        <Typography style={[styles.signInLabel, { color }]}>{label}</Typography>
      </View>
      <View style={[styles.soon, { borderColor: color }]}>
        <Typography kind="caption" style={{ color, fontWeight: '700' }}>Pronto</Typography>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: spacing.lg, gap: spacing.xl },
  intro: { gap: spacing.md },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8, marginTop: spacing.lg },
  body: { fontSize: 17, lineHeight: 25 },
  options: { gap: spacing.sm },
  signIn: {
    minHeight: 56,
    borderRadius: radii.button,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  signInContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  signInDisabled: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, opacity: 0.55 },
  signInLabel: { fontSize: 17, fontWeight: '700' },
  soon: { position: 'absolute', right: spacing.md, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.xs, paddingVertical: 2, opacity: 0.7 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xs },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  localOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  localCopy: { flex: 1, gap: 2 },
  localTitle: { fontSize: 17, fontWeight: '700' },
  localBody: { fontSize: 14, lineHeight: 19 },
  legal: { textAlign: 'center', marginTop: spacing.md },
});
