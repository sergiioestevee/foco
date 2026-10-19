import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { formatDuration } from '@/features/calendar/calendar-utils';
import { taskKindLabel } from '@/features/tasks/task-kinds';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';
import type { StudyBlock, Task } from '@/types/models';

const MAX_VISIBLE = 6;

/** "Hoy" on Inicio: today's tasks first, then study blocks by time. */
export function TodayTasks({ tasks, studyBlocks }: { tasks: Task[]; studyBlocks: StudyBlock[] }) {
  const theme = useTheme();
  const rows = [
    ...tasks.map((task) => <TodayTaskRow key={`task-${task.id}`} task={task} />),
    ...studyBlocks.map((block) => <TodayBlockRow key={`block-${block.id}`} block={block} />),
  ];

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Typography kind="heading">Hoy</Typography>
        <Link href="/calendar" asChild>
          <Pressable accessibilityRole="link" hitSlop={8} style={styles.seeAll}>
            <Typography style={{ color: theme.accent, fontWeight: '700' }}>Ver todo</Typography>
          </Pressable>
        </Link>
      </View>
      {rows.length ? (
        <View style={styles.list}>{rows.slice(0, MAX_VISIBLE)}</View>
      ) : (
        <Typography kind="secondary">Nada pendiente para hoy.</Typography>
      )}
    </View>
  );
}

export function TodayTaskRow({ task }: { task: Task }) {
  const toggleTaskCompleted = useFocoStore((state) => state.toggleTaskCompleted);
  const category = useFocoStore((state) => task.categoryType === 'subject'
    ? state.subjects.find((item) => item.id === task.categoryId)
    : task.categoryType === 'project'
      ? state.projects.find((item) => item.id === task.categoryId)
      : undefined);
  const details = [task.kind !== 'task' ? taskKindLabel(task.kind) : null, category?.name ?? 'Sin asignatura', task.priority === 'high' ? 'Prioridad alta' : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <TodayRow
      title={task.title}
      details={details}
      color={category?.color}
      completed={task.completed}
      onToggle={() => toggleTaskCompleted(task.id)}
    />
  );
}

function TodayBlockRow({ block }: { block: StudyBlock }) {
  const toggleStudyBlockCompleted = useFocoStore((state) => state.toggleStudyBlockCompleted);
  const subject = useFocoStore((state) => state.subjects.find((item) => item.id === block.subjectId));
  const details = [subject?.name ?? 'Estudio', block.startTime, formatDuration(block.startTime, block.endTime)].join(' · ');

  return (
    <TodayRow
      title={block.title}
      details={details}
      color={subject?.color}
      completed={block.completed}
      onToggle={() => toggleStudyBlockCompleted(block.id)}
    />
  );
}

function TodayRow({ title, details, color, completed, onToggle }: {
  title: string;
  details: string;
  color: string | undefined;
  completed: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={`${title}, ${details}`}
      accessibilityState={{ checked: completed }}
      onPress={() => {
        onToggle();
        void Haptics.selectionAsync();
      }}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.surf, borderColor: theme.line, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View
        style={[
          styles.check,
          completed ? { backgroundColor: theme.accent, borderColor: theme.accent } : { borderColor: theme.muted },
        ]}>
        {completed ? <SymbolIcon ios="checkmark" other="check" color={theme.accentInk} size={14} /> : null}
      </View>
      <View style={styles.copy}>
        <Typography numberOfLines={1} style={[styles.title, completed && { color: theme.muted, textDecorationLine: 'line-through' }]}>
          {title}
        </Typography>
        <Typography kind="caption" numberOfLines={1} style={styles.details}>{details}</Typography>
      </View>
      <View style={[styles.dot, { backgroundColor: color ?? theme.muted }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { minHeight: minTouchSize, justifyContent: 'center' },
  list: { gap: spacing.xs },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.chip,
    borderWidth: StyleSheet.hairlineWidth,
  },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 1 },
  title: { fontWeight: '700' },
  details: { fontSize: 13, fontWeight: '500' },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
