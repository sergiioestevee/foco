import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { SymbolIcon } from '@/components/symbol-icon';
import { useTheme } from '@/theme/use-theme';

/** Orange reads well on the dark theme; on the light one the app's purple stands out more. */
export function useStreakColor() {
  const theme = useTheme();
  return theme.colorScheme === 'dark' ? theme.warn : theme.accent;
}

/** Streak flame: gently flickers with a soft glow while the streak is alive, grey and still when it's 0. */
export function StreakFlame({ lit, size = 36 }: { lit: boolean; size?: number }) {
  const theme = useTheme();
  const color = useStreakColor();
  const reduceMotion = useReducedMotion();
  const flicker = useSharedValue(0);

  useEffect(() => {
    if (!lit || reduceMotion) {
      cancelAnimation(flicker);
      flicker.value = 0;
      return;
    }
    flicker.value = withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(flicker);
  }, [flicker, lit, reduceMotion]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + flicker.value * 0.12 }, { scaleX: 1 - flicker.value * 0.04 }, { rotate: `${(flicker.value - 0.5) * 6}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.14 + flicker.value * 0.14,
    transform: [{ scale: 0.8 + flicker.value * 0.2 }],
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {lit ? <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: color }, glowStyle]} /> : null}
      <Animated.View style={[styles.flame, flameStyle]}>
        <SymbolIcon ios="flame.fill" other="local_fire_department" color={lit ? color : theme.muted} size={Math.round(size * 0.62)} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  // Flicker from the base, like a real flame.
  flame: { transformOrigin: 'center bottom' },
});
