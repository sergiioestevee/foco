import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocoLogo } from '@/components/foco-logo';
import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { radii, spacing } from '@/theme/tokens';

/** Must match `imageWidth` of the expo-splash-screen plugin so the hand-off is seamless. */
export const SPLASH_LOGO_SIZE = 120;
export const BOOT_MIN_DURATION = 900;

export function BootScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0.08);

  useEffect(() => {
    progress.value = withTiming(1, { duration: BOOT_MIN_DURATION });
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <Animated.View
      exiting={FadeOut.duration(250)}
      accessibilityLabel="Foco. Cargando tu progreso"
      style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]}>
      <View style={styles.logo}>
        <FocoLogo size={SPLASH_LOGO_SIZE} />
      </View>
      <Animated.View entering={FadeIn.duration(350)} style={styles.copy}>
        <Typography allowFontScaling={false} style={styles.name}>Foco</Typography>
        <Typography kind="secondary" allowFontScaling={false} style={styles.tagline}>Tus estudios, en orden.</Typography>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(150).duration(350)} style={[styles.loader, { bottom: insets.bottom + spacing.xxl }]}>
        <View style={[styles.track, { backgroundColor: theme.track }]}>
          <Animated.View style={[styles.fill, { backgroundColor: theme.accent }, fillStyle]} />
        </View>
        <Typography kind="secondary" style={styles.loading}>Cargando tu progreso…</Typography>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  logo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -SPLASH_LOGO_SIZE / 2,
    marginLeft: -SPLASH_LOGO_SIZE / 2,
  },
  copy: { position: 'absolute', left: 0, right: 0, top: '50%', marginTop: SPLASH_LOGO_SIZE / 2 + spacing.xl, alignItems: 'center', gap: spacing.xs },
  name: { fontSize: 48, lineHeight: 54, fontWeight: '800', letterSpacing: -1.5 },
  tagline: { fontSize: 17, lineHeight: 23 },
  loader: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: spacing.md },
  track: { width: 150, height: 4, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
  loading: { fontSize: 14 },
});
