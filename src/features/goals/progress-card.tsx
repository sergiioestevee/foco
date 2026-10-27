import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/progress-ring';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { toFraction, toPercent } from '@/features/progress/progress-stats';
import { TaskListRow } from '@/features/tasks/task-list-row';
import { sortTasksByDueDateAndPriority } from '@/features/tasks/task-date-utils';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';
import type { Task } from '@/types/models';

type ProgressCardProps = {
  title: string;
  /** Dot colour (projects); goals have none. */
  color?: string;
  meta: (string | null | undefined)[];
  description: string;
  /** Tasks linked to this goal or project. */
  tasks: Task[];
  onEdit: () => void;
  /** Asks before deleting; goals and projects offer to keep or delete their tasks. */
  onDelete: () => void;
  onAddTask: () => void;
  onToggleTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
};

/**
 * Goal or project on Metas: ring + big percentage. Tapping it unfolds its tasks, to tick or add
 * them without leaving the sheet.
 */
export function ProgressCard({ title, color, meta, description, tasks, onEdit, onDelete, onAddTask, onToggleTask, onEditTask }: ProgressCardProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const pending = sortTasksByDueDateAndPriority(tasks.filter((task) => !task.completed));
  const completed = tasks.filter((task) => task.completed);
  const total = tasks.length;
  const percent = toPercent({ completed: completed.length, total });
  const metaLabel = meta.filter(Boolean).join(' · ');
  const count = total ? `${completed.length} de ${total} ${total === 1 ? 'tarea' : 'tareas'}` : 'Sin tareas todavía';

  return (
    <View style={[styles.card, { backgroundColor: theme.surf, borderColor: theme.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${metaLabel}. ${count}${total ? `, ${percent} %` : ''}`}
        accessibilityState={{ expanded }}
        accessibilityHint={expanded ? 'Oculta sus tareas' : 'Muestra sus tareas'}
        onPress={() => setExpanded((value) => !value)}
        style={styles.header}>
        <View style={styles.top}>
          <ProgressRing progress={toFraction({ completed: completed.length, total })} size={56} />
          <View style={styles.copy}>
            <View style={styles.titleRow}>
              {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
              <Typography numberOfLines={2} style={styles.title}>{title}</Typography>
            </View>
            {metaLabel ? <Typography kind="caption" numberOfLines={1}>{metaLabel}</Typography> : null}
            <Typography kind="caption" style={{ color: theme.muted }}>{count}</Typography>
          </View>
          <View style={styles.right}>
            <Typography allowFontScaling={false} style={styles.percent}>{total ? `${percent}%` : '—'}</Typography>
            <SymbolIcon ios={expanded ? 'chevron.up' : 'chevron.down'} other={expanded ? 'expand_less' : 'expand_more'} color={theme.muted} size={14} />
          </View>
        </View>
        {description && !expanded ? <Typography kind="secondary" numberOfLines={2}>{description}</Typography> : null}
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          {description ? <Typography kind="secondary">{description}</Typography> : null}
          {pending.map((task) => (
            <TaskListRow key={task.id} task={task} onToggle={() => onToggleTask(task)} onEdit={() => onEditTask(task)} />
          ))}
          {!pending.length ? (
            <Typography kind="secondary" style={styles.empty}>
              {total ? 'Todas sus tareas están hechas.' : 'Añade la primera tarea para empezar a medir tu avance.'}
            </Typography>
          ) : null}
          {completed.length ? (
            <>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: showCompleted }} onPress={() => setShowCompleted((value) => !value)} style={styles.link}>
                <Typography style={[styles.linkText, { color: theme.muted }]}>
                  {showCompleted ? 'Ocultar completadas' : `Ver completadas (${completed.length})`}
                </Typography>
              </Pressable>
              {showCompleted ? completed.map((task) => (
                <TaskListRow key={task.id} task={task} onToggle={() => onToggleTask(task)} onEdit={() => onEditTask(task)} />
              )) : null}
            </>
          ) : null}
          <View style={[styles.actions, { borderTopColor: theme.line }]}>
            <Pressable accessibilityRole="button" onPress={onAddTask} style={styles.action}>
              <SymbolIcon ios="plus" other="add" color={theme.accent} size={16} />
              <Typography style={[styles.linkText, { color: theme.accent }]}>Añadir tarea</Typography>
            </Pressable>
            <View style={styles.trailing}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${title}`} onPress={onEdit} style={styles.action}>
                <SymbolIcon ios="pencil" other="edit" color={theme.muted} size={15} />
                <Typography style={[styles.linkText, { color: theme.muted }]}>Editar</Typography>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${title}`} onPress={onDelete} style={styles.action}>
                <SymbolIcon ios="trash" other="delete" color={theme.danger} size={15} />
                <Typography style={[styles.linkText, { color: theme.danger }]}>Eliminar</Typography>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.lg },
  header: { paddingVertical: spacing.lg, gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 9, height: 9, borderRadius: 5 },
  title: { flexShrink: 1, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  right: { alignItems: 'flex-end', gap: spacing.xxs },
  percent: { fontSize: 26, lineHeight: 30, fontWeight: '800', letterSpacing: -0.6 },
  body: { gap: spacing.xs, paddingBottom: spacing.sm },
  empty: { fontSize: 14, paddingVertical: spacing.xs },
  link: { minHeight: minTouchSize, justifyContent: 'center' },
  linkText: { fontSize: 14, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.xs },
  trailing: { flexDirection: 'row', gap: spacing.md },
  action: { minHeight: minTouchSize, flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
});
