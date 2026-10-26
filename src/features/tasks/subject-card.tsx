import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { collapsedLabel, type BoardCard } from '@/features/tasks/task-board';
import { ExamListRow, TaskListRow } from '@/features/tasks/task-list-row';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';
import type { Exam, Task } from '@/types/models';

/** Tasks shown before «+N más». */
const VISIBLE_TASKS = 2;

type SubjectCardProps = {
  card: BoardCard;
  onToggleTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onEditExam: (exam: Exam) => void;
};

/** One subject (or project, or «Sin asignatura») on the Tareas board. Folded cards show a single line. */
export function SubjectCard({ card, onToggleTask, onEditTask, onEditExam }: SubjectCardProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(!card.collapsed);
  const [wasCollapsed, setWasCollapsed] = useState(card.collapsed);
  // A folded card that gets something pending (e.g. a task just added) opens by itself.
  if (wasCollapsed !== card.collapsed) {
    setWasCollapsed(card.collapsed);
    if (!card.collapsed) setExpanded(true);
  }
  const [showAll, setShowAll] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const { category, pending, completed, exams } = card;

  const visibleTasks = showAll ? pending : pending.slice(0, VISIBLE_TASKS);
  const visibleExams = showAll ? exams : exams.slice(0, 1);
  const hiddenCount = pending.length - visibleTasks.length + exams.length - visibleExams.length;
  const status = expanded && pending.length
    ? `${pending.length} ${pending.length === 1 ? 'pendiente' : 'pendientes'}`
    : collapsedLabel(card);

  return (
    <View style={[styles.card, { backgroundColor: theme.surf, borderColor: theme.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${category.name}, ${status}`}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={styles.header}>
        <View style={[styles.dot, { backgroundColor: category.color ?? theme.muted }]} />
        <Typography numberOfLines={1} style={styles.name}>{category.name}</Typography>
        <Typography kind="secondary" numberOfLines={1} style={styles.status}>{status}</Typography>
        <SymbolIcon ios={expanded ? 'chevron.up' : 'chevron.down'} other={expanded ? 'expand_less' : 'expand_more'} color={theme.muted} size={14} />
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          {visibleExams.map((exam) => <ExamListRow key={exam.id} exam={exam} onPress={() => onEditExam(exam)} />)}
          {visibleTasks.map((task) => (
            <TaskListRow key={task.id} task={task} onToggle={() => onToggleTask(task)} onEdit={() => onEditTask(task)} />
          ))}
          {!pending.length && !exams.length ? <Typography kind="secondary" style={styles.empty}>Todo al día.</Typography> : null}
          {hiddenCount > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => setShowAll(true)} style={styles.link}>
              <Typography style={[styles.linkText, { color: theme.accent }]}>+{hiddenCount} más</Typography>
            </Pressable>
          ) : null}
          {completed.length ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showCompleted }}
                onPress={() => setShowCompleted((value) => !value)}
                style={styles.link}>
                <Typography style={[styles.linkText, { color: theme.muted }]}>
                  {showCompleted ? 'Ocultar completadas' : `Ver completadas (${completed.length})`}
                </Typography>
              </Pressable>
              {showCompleted
                ? completed.map((task) => (
                  <TaskListRow key={task.id} task={task} onToggle={() => onToggleTask(task)} onEdit={() => onEditTask(task)} />
                ))
                : null}
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md },
  header: { minHeight: minTouchSize + 8, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { flexShrink: 1, fontSize: 16, fontWeight: '800' },
  status: { flex: 1, textAlign: 'right', fontSize: 13 },
  body: { gap: spacing.xs, paddingBottom: spacing.md },
  empty: { fontSize: 14, paddingVertical: spacing.xs },
  link: { minHeight: minTouchSize, justifyContent: 'center' },
  linkText: { fontSize: 14, fontWeight: '700' },
});
