import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';

import { formatWeekdays, isRoutineDoneOn } from '@/features/routines/routine-utils';

import { formatDuration, toDayKey, type AgendaItem } from './calendar-utils';

type AgendaRowProps = {
  item: AgendaItem;
  onPress: () => void;
};

export function AgendaRow({ item, onPress }: AgendaRowProps) {
  const theme = useTheme();
  const subjects = useFocoStore((state) => state.subjects);
  const projects = useFocoStore((state) => state.projects);
  const toggleStudyBlockCompleted = useFocoStore((state) => state.toggleStudyBlockCompleted);
  const toggleRoutineDone = useFocoStore((state) => state.toggleRoutineDone);

  let title: string;
  let details: string;
  let color: string;
  let label: string;
  if (item.type === 'class') {
    const category = item.block.categoryType === 'subject'
      ? subjects.find((subject) => subject.id === item.block.categoryId)
      : projects.find((project) => project.id === item.block.categoryId);
    title = category?.name ?? 'Clase';
    details = [item.block.place, formatDuration(item.startTime, item.endTime)].filter(Boolean).join(' · ');
    color = item.block.color;
    label = 'Clase';
  } else if (item.type === 'study') {
    const subject = subjects.find((entry) => entry.id === item.block.subjectId);
    title = item.block.title;
    details = [subject?.name, formatDuration(item.startTime, item.endTime)].filter(Boolean).join(' · ');
    color = subject?.color ?? theme.accent;
    label = 'Estudio';
  } else if (item.type === 'routine') {
    const subject = subjects.find((entry) => entry.id === item.routine.subjectId);
    title = item.routine.title;
    details = [subject?.name, formatWeekdays(item.routine.weekdays)].filter(Boolean).join(' · ');
    color = subject?.color ?? theme.ok;
    label = 'Rutina';
  } else {
    const subject = subjects.find((entry) => entry.id === item.exam.subjectId);
    title = [subject?.name, item.exam.title].filter(Boolean).join(' · ');
    details = [item.exam.room, `${item.exam.reviewProgress}% repasado`].filter(Boolean).join(' · ');
    color = theme.warn;
    label = 'Examen';
  }
  const completed = item.type === 'study'
    ? item.block.completed
    : item.type === 'routine' && isRoutineDoneOn(item.routine, item.day);
  const toggle = item.type === 'study'
    ? () => toggleStudyBlockCompleted(item.block.id)
    : item.type === 'routine'
      ? () => toggleRoutineDone(item.routine.id, toDayKey(item.day))
      : null;

  return (
    <View style={styles.row}>
      <View style={styles.time}>
        <Typography numberOfLines={1} allowFontScaling={false} style={styles.start}>{item.startTime}</Typography>
        {item.endTime ? <Typography kind="caption" numberOfLines={1} allowFontScaling={false} style={styles.end}>{item.endTime}</Typography> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${title}, ${item.startTime}${item.endTime ? ` a ${item.endTime}` : ''}. ${details}`}
        accessibilityHint="Abre para editar"
        onPress={onPress}
        style={({ pressed }) => [styles.card, { backgroundColor: theme.surf, borderColor: theme.line, opacity: pressed ? 0.85 : 1 }]}>
        <View style={[styles.bar, { backgroundColor: color }]} />
        <View style={styles.copy}>
          <Typography kind="caption" style={[styles.label, { color: item.type === 'exam' ? theme.warn : theme.muted }]}>{label.toUpperCase()}</Typography>
          <Typography numberOfLines={2} style={[styles.title, completed && { color: theme.muted, textDecorationLine: 'line-through' }]}>{title}</Typography>
          {details ? <Typography kind="caption" numberOfLines={1}>{details}</Typography> : null}
        </View>
        {toggle ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`Marcar ${title} como hecho`}
            accessibilityState={{ checked: completed }}
            hitSlop={6}
            onPress={() => {
              toggle();
              void Haptics.selectionAsync();
            }}
            style={styles.checkArea}>
            <View style={[styles.check, completed ? { backgroundColor: theme.accent, borderColor: theme.accent } : { borderColor: theme.muted }]}>
              {completed ? <SymbolIcon ios="checkmark" other="check" color={theme.accentInk} size={14} /> : null}
            </View>
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  // Fixed-width digits, so 00:00 is as wide as 11:11 and every time stays on one line.
  time: { width: 54, paddingTop: spacing.md, alignItems: 'flex-end' },
  start: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  end: { fontVariant: ['tabular-nums'] },
  card: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.chip, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  copy: { flex: 1, gap: 2 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  checkArea: { width: minTouchSize, height: minTouchSize, alignItems: 'center', justifyContent: 'center' },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
