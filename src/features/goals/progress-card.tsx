import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/progress-ring';
import { Typography } from '@/components/typography';
import { toFraction, toPercent } from '@/features/progress/progress-stats';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';

type ProgressCardProps = {
  title: string;
  /** Dot colour (projects); goals have none. */
  color?: string;
  meta: (string | null | undefined)[];
  description: string;
  completed: number;
  total: number;
  onPress: () => void;
  tasksLink: Href;
};

/** Goal or project card on Metas: ring + big percentage, opens the editor on press. */
export function ProgressCard({ title, color, meta, description, completed, total, onPress, tasksLink }: ProgressCardProps) {
  const theme = useTheme();
  const percent = toPercent({ completed, total });
  const metaLabel = meta.filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${metaLabel}. ${completed} de ${total} tareas, ${percent} %`}
      accessibilityHint="Abre para editar"
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: theme.surf, borderColor: theme.line, opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.top}>
        <ProgressRing progress={toFraction({ completed, total })} size={56} />
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
            <Typography numberOfLines={2} style={styles.title}>{title}</Typography>
          </View>
          {metaLabel ? <Typography kind="caption" numberOfLines={1}>{metaLabel}</Typography> : null}
        </View>
        <Typography allowFontScaling={false} style={styles.percent}>{total ? `${percent}%` : '—'}</Typography>
      </View>
      {description ? <Typography kind="secondary" numberOfLines={2}>{description}</Typography> : null}
      <View style={[styles.footer, { borderTopColor: theme.line }]}>
        <Typography kind="secondary" style={styles.count}>
          {total ? `${completed} de ${total} ${total === 1 ? 'tarea' : 'tareas'}` : 'Sin tareas vinculadas'}
        </Typography>
        {/* From the Metas sheet: close it and show those tasks in Tareas. */}
        <Pressable accessibilityRole="link" onPress={() => router.dismissTo(tasksLink)} hitSlop={6} style={styles.link}>
          <Typography style={{ color: theme.accent, fontWeight: '700' }}>{total ? 'Ver tareas' : 'Añadir tareas'}</Typography>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 9, height: 9, borderRadius: 5 },
  title: { flexShrink: 1, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  percent: { fontSize: 26, lineHeight: 30, fontWeight: '800', letterSpacing: -0.6 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.xs },
  count: { fontSize: 14 },
  link: { minHeight: minTouchSize, justifyContent: 'center' },
});
