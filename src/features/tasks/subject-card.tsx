import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { collapsedLabel, openLabel, type BoardCard } from '@/features/tasks/task-board';
import { ExamListRow, TaskListRow } from '@/features/tasks/task-list-row';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';
import type { Exam, Task } from '@/types/models';

type SubjectCardProps = {
  card: BoardCard;
  onToggleTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onEditExam: (exam: Exam) => void;
};

/**
 * One subject (or project, or «Sin asignatura») on the Tareas board. Open, it shows its upcoming exams
 * and important tasks, with the rest behind «+N tareas más»; folded, a single line with «+N» or «Al día».
 */
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
  const { category, pending, important, others, completed, exams } = card;

  // Opened by hand with nothing important, it shows everything rather than an empty card.
  const showEverything = showAll || !important.length;
  const visibleTasks = showEverything ? pending : important;
  const hiddenCount = showEverything ? 0 : others.length;
  const status = expanded ? openLabel(card) : collapsedLabel(card);

  return (
    <View style={[styles.card, { backgroundColor: theme.surf, borderColor: theme.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${category.name}, ${status}`}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={styles.header}>
        <View style={[styles.dot, { backgroundColor: category.color ?? theme.muted }]} />
        <View style={styles.nameBox}>
          <Typography numberOfLines={1} style={styles.name}>{category.name}</Typography>
        </View>
        <Typography kind="secondary" numberOfLines={1} style={styles.status}>{status}</Typography>
        <SymbolIcon ios={expanded ? 'chevron.up' : 'chevron.down'} other={expanded ? 'expand_less' : 'expand_more'} color={theme.muted} size={14} />
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          {exams.map((exam) => <ExamListRow key={exam.id} exam={exam} onPress={() => onEditExam(exam)} />)}
          {visibleTasks.map((task) => (
            <TaskListRow key={task.id} task={task} onToggle={() => onToggleTask(task)} onEdit={() => onEditTask(task)} />
          ))}
          {!pending.length && !exams.length ? <Typography kind="secondary" style={styles.empty}>Todo al día.</Typography> : null}
          {hiddenCount > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => setShowAll(true)} style={styles.link}>
              <Typography style={[styles.linkText, { color: theme.accent }]}>
                +{hiddenCount} {hiddenCount === 1 ? 'tarea más' : 'tareas más'}
              </Typography>
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
  // The name's box takes what's left and may shrink to nothing (minWidth 0), so the name ends in «…»
  // and the status («+N», «Al día»…) and chevron always stay inside the card. A Text alone can
  // report its full width on iOS and push them out. The status is capped so an open card's
  // summary leaves room for the name.
  nameBox: { flex: 1, flexShrink: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '800' },
  status: { flexShrink: 0, maxWidth: '60%', textAlign: 'right', fontSize: 13 },
  body: { gap: spacing.xs, paddingBottom: spacing.md },
  empty: { fontSize: 14, paddingVertical: spacing.xs },
  link: { minHeight: minTouchSize, justifyContent: 'center' },
  linkText: { fontSize: 14, fontWeight: '700' },
});
