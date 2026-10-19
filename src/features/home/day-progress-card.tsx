import { StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/progress-ring';
import { Surface } from '@/components/surface';
import { Typography } from '@/components/typography';
import { toFraction, toPercent } from '@/features/progress/progress-stats';
import { spacing } from '@/theme/tokens';

type DayProgressCardProps = {
  completed: number;
  total: number;
  /** First pending task or study block of the day, used for the "llegas al…" hint. */
  nextTitle: string | undefined;
};

export function DayProgressCard({ completed, total, nextTitle }: DayProgressCardProps) {
  const percent = toPercent({ completed, total });

  return (
    <Surface style={styles.card}>
      <ProgressRing
        progress={toFraction({ completed, total })}
        accessibilityLabel={`Progreso del día: ${completed} de ${total} hechas`}
      />
      <View style={styles.copy}>
        <Typography allowFontScaling={false} style={styles.percent}>{percent}%</Typography>
        <Typography style={styles.label}>del día completado</Typography>
        <Typography kind="secondary" style={styles.hint}>{getHint(completed, total, nextTitle)}</Typography>
      </View>
    </Surface>
  );
}

function getHint(completed: number, total: number, nextTitle: string | undefined) {
  if (total === 0) return 'No tienes tareas para hoy. Añade alguna o acepta la propuesta de Foco IA.';
  const summary = `${completed} de ${total} hechas.`;
  if (completed === total) return `${summary} Día completado, buen trabajo.`;
  if (!nextTitle) return summary;
  return `${summary} Con «${nextTitle}» llegas al ${toPercent({ completed: completed + 1, total })}%.`;
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  copy: { flex: 1, gap: 2 },
  percent: { fontSize: 46, lineHeight: 52, fontWeight: '800', letterSpacing: -1.5 },
  label: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  hint: { fontSize: 14, lineHeight: 19, marginTop: spacing.xxs },
});
