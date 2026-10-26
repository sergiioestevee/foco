import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/typography';
import { summarizeGoals, summarizeRoutinesToday } from '@/features/tasks/task-board';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { radii, spacing } from '@/theme/tokens';

/** «Rutinas hoy» and «Metas», always on top of Tareas; each opens its sheet. */
export function PinnedCards() {
  const routines = useFocoStore((state) => state.routines);
  const goals = useFocoStore((state) => state.goals);
  const projects = useFocoStore((state) => state.projects);
  const tasks = useFocoStore((state) => state.tasks);
  const today = summarizeRoutinesToday(routines);
  const metas = summarizeGoals(goals, projects, tasks);

  const routineDetail = today.total === 0
    ? 'Hoy no toca ninguna'
    : today.next
      ? [today.next.title, today.next.time].filter(Boolean).join(' · ')
      : 'Todas hechas';
  const metasValue = metas.percent === null ? '—' : `${metas.percent}%`;
  const metasDetail = metas.goals || metas.projects
    ? `${metas.goals} ${metas.goals === 1 ? 'objetivo' : 'objetivos'} · ${metas.projects} ${metas.projects === 1 ? 'proyecto' : 'proyectos'}`
    : 'Crea tu primera meta';

  return (
    <View style={styles.row}>
      <PinnedCard
        label="RUTINAS HOY"
        value={`${today.done} de ${today.total}`}
        detail={routineDetail}
        accessibilityLabel={`Rutinas de hoy: ${today.done} de ${today.total}. ${routineDetail}`}
        onPress={() => router.push('/routines')}
      />
      <PinnedCard
        label="METAS"
        value={metasValue}
        detail={metasDetail}
        accessibilityLabel={`Metas: ${metas.percent === null ? 'sin progreso todavía' : `${metas.percent} %`}. ${metasDetail}`}
        onPress={() => router.push('/goals')}
      />
    </View>
  );
}

function PinnedCard({ label, value, detail, accessibilityLabel, onPress }: {
  label: string;
  value: string;
  detail: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Abre la hoja"
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: theme.surf, borderColor: theme.line, opacity: pressed ? 0.85 : 1 }]}>
      <Typography kind="caption" style={[styles.label, { color: theme.muted }]}>{label}</Typography>
      <Typography style={styles.value}>{value}</Typography>
      <Typography kind="secondary" numberOfLines={1} style={styles.detail}>{detail}</Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  card: { flex: 1, borderRadius: radii.chip + 2, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: 2 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  value: { fontSize: 20, lineHeight: 26, fontWeight: '800' },
  detail: { fontSize: 13 },
});
