import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/progress-ring';
import { StreakFlame } from '@/components/streak-flame';
import { Surface } from '@/components/surface';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

type StatTilesProps = {
  /** Share of this week's work done, or null when there is none. */
  weekPercent: number | null;
  goals: { completed: number; total: number };
  /** Days in a row with everything done. */
  streak: number;
};

const VISUAL_SIZE = 28;

/** Inicio's stats in one card of three columns: each has its visual (ring, target, live flame) beside a big figure. */
export function StatTiles({ weekPercent, goals, streak }: StatTilesProps) {
  const theme = useTheme();
  const days = streak === 1 ? 'día' : 'días';

  return (
    <Surface inset={false} style={styles.card}>
      <Stat
        label="Semana"
        accessibilityLabel={weekPercent === null ? 'Semana: sin tareas' : `Semana: ${weekPercent} % completado`}
        visual={<ProgressRing progress={(weekPercent ?? 0) / 100} size={VISUAL_SIZE} />}
        value={weekPercent === null ? '—' : `${weekPercent}`}
        unit={weekPercent === null ? undefined : '%'}
      />
      <View style={[styles.divider, { backgroundColor: theme.line }]} />
      <Stat
        label="Objetivos"
        accessibilityLabel={`Objetivos: ${goals.completed} de ${goals.total} logrados`}
        visual={(
          <View style={[styles.badge, { backgroundColor: theme.aiBg }]}>
            <SymbolIcon ios="target" other="flag" color={theme.accent} size={15} />
          </View>
        )}
        value={`${goals.completed}`}
        unit={`/${goals.total}`}
      />
      <View style={[styles.divider, { backgroundColor: theme.line }]} />
      <Stat
        label="Racha"
        accessibilityLabel={`Racha: ${streak} ${days}`}
        visual={<StreakFlame lit={streak > 0} size={VISUAL_SIZE} />}
        value={`${streak}`}
        unit={` ${days}`}
      />
    </Surface>
  );
}

type StatProps = { label: string; accessibilityLabel: string; visual: ReactNode; value: string; unit?: string };

function Stat({ label, accessibilityLabel, visual, value, unit }: StatProps) {
  const theme = useTheme();
  return (
    <View style={styles.stat} accessible accessibilityLabel={accessibilityLabel}>
      {visual}
      <View style={styles.copy}>
        {/* One line, shrunk to fit when the number grows; the unit rides along smaller. */}
        <Typography allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.value}>
          {value}
          {unit ? <Typography allowFontScaling={false} style={[styles.unit, { color: theme.muted }]}>{unit}</Typography> : null}
        </Typography>
        <Typography kind="caption" numberOfLines={1}>{label}</Typography>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xs, borderRadius: 20 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  copy: { flexShrink: 1, gap: 1 },
  value: { fontSize: 21, lineHeight: 26, fontWeight: '800', letterSpacing: -0.4 },
  unit: { fontSize: 13, fontWeight: '700', letterSpacing: 0 },
  badge: { width: VISUAL_SIZE, height: VISUAL_SIZE, borderRadius: VISUAL_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: spacing.xs, marginHorizontal: spacing.xxs },
});
