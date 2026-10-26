import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { FocoLogo } from '@/components/foco-logo';
import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

/** How long each status stays before the next one; the last one stays until the reply arrives. */
const STEP_MS = 1700;

const topics: [RegExp, string[]][] = [
  [/examen|parcial|final|recuperaci/i, ['Revisando tus exámenes…']],
  [/tarea|entrega|práctica|practica|trabajo/i, ['Mirando tus tareas…']],
  [/rutina/i, ['Revisando tus rutinas…']],
  [/plan|semana|organiz|horario|cuándo|cuando|hoy|mañana|estudi|repas/i, ['Buscando huecos libres…', 'Organizando tu semana…']],
];

/** Status lines that follow what the student asked, like "Revisando tus exámenes…" for an exam question. */
function stepsFor(prompt: string): string[] {
  const matched = topics.filter(([pattern]) => pattern.test(prompt)).flatMap(([, steps]) => steps);
  const middle = matched.length ? matched : ['Revisando tus exámenes y tareas…', 'Buscando huecos libres…'];
  return ['Pensando…', ...new Set(middle), 'Preparando la respuesta…'];
}

/** While Foco IA prepares its reply: the logo's ring spins and a status line says what it's looking at. */
export function TypingIndicator({ prompt }: { prompt: string }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const steps = useMemo(() => stepsFor(prompt), [prompt]);
  const [step, setStep] = useState(0);
  const spin = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (step >= steps.length - 1) return;
    const timer = setTimeout(() => setStep((current) => current + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [step, steps.length]);

  useEffect(() => {
    if (reduceMotion) return;
    spin.value = withRepeat(withTiming(360, { duration: 1100, easing: Easing.linear }), -1);
    pulse.value = withRepeat(withSequence(withTiming(0.45, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
  }, [pulse, reduceMotion, spin]);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View
      accessible
      accessibilityLabel={`Foco IA: ${steps[step]}`}
      accessibilityLiveRegion="polite"
      style={styles.row}>
      <Animated.View style={spinStyle}>
        <FocoLogo size={20} />
      </Animated.View>
      {/* Pulse and entrance on separate views: a layout animation would override the pulse's opacity. */}
      <Animated.View style={pulseStyle}>
        <Animated.View key={step} entering={reduceMotion ? undefined : FadeInDown.duration(260)}>
          <Typography style={[styles.status, { color: theme.muted }]}>{steps[step]}</Typography>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs, minHeight: 44 },
  status: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
});
