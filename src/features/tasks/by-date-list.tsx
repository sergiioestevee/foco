import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/typography';
import { groupByDate, type DateSection } from '@/features/tasks/task-board';
import { ExamListRow, TaskListRow } from '@/features/tasks/task-list-row';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, spacing } from '@/theme/tokens';
import type { Exam, Task } from '@/types/models';

type ByDateListProps = {
  tasks: Task[];
  exams: Exam[];
  onToggleTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onEditExam: (exam: Exam) => void;
};

/** «Por fecha»: Atrasadas · Hoy · Esta semana · Más adelante, with «Completadas» folded at the end. */
export function ByDateList({ tasks, exams, onToggleTask, onEditTask, onEditExam }: ByDateListProps) {
  const theme = useTheme();
  const [showCompleted, setShowCompleted] = useState(false);
  const sections = groupByDate(tasks, exams);

  const renderItems = (section: DateSection) => section.items.map((item) => (item.type === 'task'
    ? <TaskListRow key={item.task.id} task={item.task} showCategory onToggle={() => onToggleTask(item.task)} onEdit={() => onEditTask(item.task)} />
    : <ExamListRow key={item.exam.id} exam={item.exam} showDetails onPress={() => onEditExam(item.exam)} />));

  return (
    <View style={styles.sections}>
      {sections.map((section) => (section.key === 'completed' ? (
        <View key={section.key} style={styles.section}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showCompleted }}
            onPress={() => setShowCompleted((value) => !value)}
            style={styles.toggle}>
            <Typography style={[styles.toggleText, { color: theme.muted }]}>
              {showCompleted ? 'Ocultar completadas' : `Completadas (${section.items.length})`}
            </Typography>
          </Pressable>
          {showCompleted ? renderItems(section) : null}
        </View>
      ) : (
        <View key={section.key} style={styles.section}>
          <View style={styles.header} accessibilityRole="header">
            <Typography kind="heading" style={section.key === 'overdue' ? { color: theme.danger } : undefined}>{section.title}</Typography>
            <Typography kind="secondary">{section.items.length}</Typography>
          </View>
          {renderItems(section)}
        </View>
      )))}
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { gap: spacing.lg },
  section: { gap: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing.xxs },
  toggle: { minHeight: minTouchSize, justifyContent: 'center', alignItems: 'center' },
  toggleText: { fontSize: 14, fontWeight: '700' },
});
