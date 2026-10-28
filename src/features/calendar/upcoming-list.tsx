import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { Surface } from '@/components/surface';
import { Typography } from '@/components/typography';
import { TodayRoutineRow, TodayTaskRow } from '@/features/home/today-tasks';
import { spacing } from '@/theme/tokens';

import { AgendaRow } from './agenda-row';
import { formatDayHeading, toDayKey, type AgendaItem, type UpcomingDay } from './calendar-utils';

const PAGE_DAYS = 14;

type UpcomingListProps = {
  today: Date;
  /** Days to list, from `today`; grows by two weeks with «Ver más días». */
  getDays: (count: number) => UpcomingDay[];
  onOpenItem: (item: AgendaItem) => void;
};

/** Lista view: what's coming, grouped by day, skipping empty days. */
export function UpcomingList({ today, getDays, onOpenItem }: UpcomingListProps) {
  const [count, setCount] = useState(PAGE_DAYS);
  const days = getDays(count);

  return (
    <View style={styles.list}>
      {days.length ? days.map(({ day, agenda, tasks, untimedRoutines }) => (
        <View key={toDayKey(day)} style={styles.day}>
          <Typography kind="heading" style={styles.title}>{formatDayHeading(day, today)}</Typography>
          {agenda.map((item) => <AgendaRow key={item.key} item={item} onPress={() => onOpenItem(item)} />)}
          {tasks.map((task) => <TodayTaskRow key={task.id} task={task} />)}
          {untimedRoutines.map((routine) => <TodayRoutineRow key={routine.id} routine={routine} day={day} />)}
        </View>
      )) : (
        <Surface style={styles.empty}>
          <Typography kind="heading">Nada a la vista</Typography>
          <Typography kind="secondary">No tienes nada en los próximos {count} días.</Typography>
        </Surface>
      )}
      <ActionButton label="Ver más días" variant="plain" onPress={() => setCount((value) => value + PAGE_DAYS)} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xl },
  day: { gap: spacing.sm },
  title: { fontSize: 18 },
  empty: { gap: spacing.sm },
});
