import { format } from 'date-fns';
import { Pressable, StyleSheet, View } from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { formatCountdown } from '@/features/exams/exam-utils';
import { formatDueLabel } from '@/features/tasks/task-board';
import { taskKindLabel } from '@/features/tasks/task-kinds';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';
import type { Exam, Task } from '@/types/models';

/** Task row of the Tareas tab: the box completes it, the rest of the row opens it. */
export function TaskListRow({ task, showCategory = false, onToggle, onEdit }: {
  task: Task;
  /** «Por fecha» has no subject cards around the rows, so each row names its subject or project. */
  showCategory?: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const theme = useTheme();
  const category = useFocoStore((state) => (!showCategory ? undefined
    : task.categoryType === 'subject'
      ? state.subjects.find((item) => item.id === task.categoryId)
      : task.categoryType === 'project'
        ? state.projects.find((item) => item.id === task.categoryId)
        : undefined));
  const dueDay = task.dueDate ? formatDueLabel(task.dueDate) : null;
  const due = dueDay && task.dueTime ? { ...dueDay, label: `${dueDay.label} · ${task.dueTime}` } : dueDay;
  const overdue = !!due?.overdue && !task.completed;
  const highPriority = task.priority === 'high' && !task.completed;
  const details = [category?.name, task.kind !== 'task' ? taskKindLabel(task.kind) : null, due ? (overdue ? `atrasada, ${due.label}` : due.label) : null]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={[styles.row, { backgroundColor: theme.surf, borderColor: theme.line }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`${task.completed ? 'Desmarcar' : 'Completar'}: ${task.title}`}
        accessibilityState={{ checked: task.completed }}
        onPress={onToggle}
        style={styles.checkArea}>
        <View style={[styles.check, task.completed ? { backgroundColor: theme.accent, borderColor: theme.accent } : { borderColor: theme.muted }]}>
          {task.completed ? <SymbolIcon ios="checkmark" other="check" color={theme.accentInk} size={14} /> : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${task.title}${details ? `, ${details}` : ''}${highPriority ? ', prioridad alta' : ''}`}
        accessibilityHint="Abre la tarea para editarla"
        onPress={onEdit}
        style={({ pressed }) => [styles.body, { opacity: pressed ? 0.7 : 1 }]}>
        <Typography
          numberOfLines={2}
          style={[styles.title, task.completed && { color: theme.muted, textDecorationLine: 'line-through' }]}>
          {task.title}
        </Typography>
        {category || task.kind !== 'task' || due ? (
          <View style={styles.meta}>
            {category ? (
              <View style={styles.category}>
                <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                <Typography kind="caption" numberOfLines={1} style={styles.categoryName}>{category.name}</Typography>
              </View>
            ) : null}
            {task.kind !== 'task' ? (
              <View style={[styles.kind, { backgroundColor: theme.track }]}>
                <Typography kind="caption" style={{ color: theme.text }}>{taskKindLabel(task.kind)}</Typography>
              </View>
            ) : null}
            {due ? <Typography kind="caption" style={[styles.due, overdue && { color: theme.danger }]}>{due.label}</Typography> : null}
          </View>
        ) : null}
      </Pressable>
      {highPriority ? <View style={[styles.priority, { backgroundColor: theme.warn }]} /> : null}
    </View>
  );
}

/** Orange exam strip: «Parcial 1 · en 5 días · 40% repasado». In «Por fecha» it also names the subject and the hour. */
export function ExamListRow({ exam, showDetails = false, onPress }: { exam: Exam; showDetails?: boolean; onPress: () => void }) {
  const theme = useTheme();
  const subject = useFocoStore((state) => state.subjects.find((item) => item.id === exam.subjectId));
  const label = (showDetails
    ? [subject?.name, exam.title, format(new Date(exam.date), 'HH:mm'), `${exam.reviewProgress}% repasado`]
    : [exam.title, formatCountdown(exam.date), `${exam.reviewProgress}% repasado`]
  ).filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Examen${subject ? ` de ${subject.name}` : ''}: ${label}`}
      accessibilityHint="Abre el examen para editarlo"
      onPress={onPress}
      style={({ pressed }) => [styles.exam, { backgroundColor: `${theme.warn}1F`, opacity: pressed ? 0.75 : 1 }]}>
      <SymbolIcon ios="graduationcap" other="school" color={theme.warn} size={16} />
      <Typography numberOfLines={1} style={[styles.examText, { color: theme.warn }]}>{label}</Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.md,
    borderRadius: radii.chip,
    borderWidth: StyleSheet.hairlineWidth,
  },
  checkArea: { width: minTouchSize + 8, minHeight: minTouchSize, alignItems: 'center', justifyContent: 'center' },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minHeight: minTouchSize, justifyContent: 'center', gap: 2, paddingVertical: spacing.sm },
  title: { fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  category: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, flexShrink: 1 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryName: { flexShrink: 1, fontSize: 13 },
  kind: { borderRadius: radii.pill, paddingHorizontal: spacing.xs, paddingVertical: 1 },
  due: { fontSize: 13 },
  priority: { width: 8, height: 8, borderRadius: 4, marginLeft: spacing.sm },
  exam: {
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  examText: { flex: 1, fontSize: 14, fontWeight: '700' },
});
