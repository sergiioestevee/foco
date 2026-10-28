import { endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DatePickerButton } from '@/components/date-picker-button';
import { Typography } from '@/components/typography';
import { toDayKey } from '@/features/calendar/calendar-utils';
import { defaultDateRange, groupByDate, type DateRange, type DateSection } from '@/features/tasks/task-board';
import { ExamListRow, TaskListRow } from '@/features/tasks/task-list-row';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';
import type { Exam, Task } from '@/types/models';

type ByDateListProps = {
  tasks: Task[];
  exams: Exam[];
  onToggleTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onEditExam: (exam: Exam) => void;
};

type Preset = { key: string; label: string; range: (now: Date) => DateRange };

const presets: Preset[] = [
  { key: '14', label: '14 días', range: defaultDateRange },
  { key: 'week', label: 'Esta semana', range: (now) => ({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }) },
  { key: 'month', label: 'Este mes', range: (now) => ({ from: startOfMonth(now), to: endOfMonth(now) }) },
];

const sameRange = (left: DateRange, right: DateRange) => toDayKey(left.from) === toDayKey(right.from) && toDayKey(left.to) === toDayKey(right.to);

/**
 * «Por fecha» for the days the student picks (today + 14 by default): Atrasadas, one section per day,
 * Sin fecha, and «Completadas» folded at the end.
 */
export function ByDateList({ tasks, exams, onToggleTask, onEditTask, onEditExam }: ByDateListProps) {
  const theme = useTheme();
  const [showCompleted, setShowCompleted] = useState(false);
  const [range, setRange] = useState<DateRange>(() => defaultDateRange());
  const now = new Date();
  const sections = groupByDate(tasks, exams, range, now);

  // Keep «desde» before «hasta»: moving one past the other drags it along.
  const pickFrom = (day: Date) => setRange((current) => ({ from: startOfDay(day), to: day > current.to ? startOfDay(day) : current.to }));
  const pickTo = (day: Date) => setRange((current) => ({ from: day < current.from ? startOfDay(day) : current.from, to: startOfDay(day) }));

  const renderItems = (section: DateSection) => section.items.map((item) => (item.type === 'task'
    ? <TaskListRow key={item.task.id} task={item.task} showCategory onToggle={() => onToggleTask(item.task)} onEdit={() => onEditTask(item.task)} />
    : <ExamListRow key={item.exam.id} exam={item.exam} showDetails onPress={() => onEditExam(item.exam)} />));

  return (
    <View style={styles.sections}>
      <View style={styles.filter}>
        <View style={styles.rangeRow}>
          <DatePickerButton value={range.from} onChange={pickFrom} title="Desde" short style={styles.grow} />
          <Typography kind="secondary">a</Typography>
          <DatePickerButton value={range.to} onChange={pickTo} title="Hasta" short style={styles.grow} />
        </View>
        <View style={styles.presets} accessibilityRole="radiogroup">
          {presets.map((preset) => {
            const selected = sameRange(range, preset.range(now));
            return (
              <Pressable
                key={preset.key}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setRange(preset.range(now))}
                style={[styles.preset, { backgroundColor: selected ? theme.accent : theme.track }]}>
                <Typography style={[styles.presetLabel, { color: selected ? theme.accentInk : theme.text }]}>{preset.label}</Typography>
              </Pressable>
            );
          })}
        </View>
      </View>

      {!sections.length ? <Typography kind="secondary" style={styles.empty}>No hay nada entre estas fechas.</Typography> : null}
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
  filter: { gap: spacing.sm },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  grow: { flex: 1 },
  presets: { flexDirection: 'row', gap: spacing.xs },
  preset: { flex: 1, minHeight: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  presetLabel: { fontSize: 14, fontWeight: '600' },
  empty: { textAlign: 'center', paddingVertical: spacing.lg },
  section: { gap: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing.xxs },
  toggle: { minHeight: minTouchSize, justifyContent: 'center', alignItems: 'center' },
  toggleText: { fontSize: 14, fontWeight: '700' },
});
