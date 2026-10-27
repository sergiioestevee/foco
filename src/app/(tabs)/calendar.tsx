import { addMonths, addWeeks, format, isSameDay, isSameMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { AppScreen } from '@/components/app-screen';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl } from '@/components/segmented-control';
import { Surface } from '@/components/surface';
import { Typography } from '@/components/typography';
import { AgendaRow } from '@/features/calendar/agenda-row';
import { dayHasEvents, fromDayKey, getAgenda, getTasksForDay, getUpcomingDays, toDayKey, type AgendaItem } from '@/features/calendar/calendar-utils';
import { ClassBlockEditor } from '@/features/calendar/class-block-editor';
import { MonthGrid } from '@/features/calendar/month-grid';
import { StudyBlockFormSheet } from '@/features/calendar/study-block-form-sheet';
import { UpcomingList } from '@/features/calendar/upcoming-list';
import { WeekStrip } from '@/features/calendar/week-strip';
import { ExamFormSheet } from '@/features/exams/exam-form-sheet';
import { TodayRoutineRow, TodayTaskRow } from '@/features/home/today-tasks';
import { getRoutinesForDay } from '@/features/routines/routine-utils';
import { AddButton, AddMenu, type AddMenuOption } from '@/features/tasks/add-menu';
import { useFocoStore } from '@/store/use-foco-store';
import { spacing } from '@/theme/tokens';
import type { Exam, ScheduleBlock, StudyBlock } from '@/types/models';

// undefined: closed, null: creating, value: editing.
type Editor =
  | { type: 'study'; block: StudyBlock | null }
  | { type: 'class'; block: ScheduleBlock | null }
  | { type: 'exam'; exam: Exam };

type CalendarView = 'week' | 'month' | 'list';

const viewOptions = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'list', label: 'Lista' },
] as const satisfies readonly { value: CalendarView; label: string }[];

const addOptions: AddMenuOption<'class' | 'study'>[] = [
  { value: 'class', label: 'Clase semanal', ios: 'graduationcap', md: 'school' },
  { value: 'study', label: 'Bloque de estudio', ios: 'book', md: 'menu_book' },
];

export default function CalendarScreen() {
  const scheduleBlocks = useFocoStore((state) => state.scheduleBlocks);
  const studyBlocks = useFocoStore((state) => state.studyBlocks);
  const exams = useFocoStore((state) => state.exams);
  const tasks = useFocoStore((state) => state.tasks);
  const routines = useFocoStore((state) => state.routines);
  const today = new Date();
  const [selectedKey, setSelectedKey] = useState(() => toDayKey(today));
  const [editor, setEditor] = useState<Editor | undefined>(undefined);
  const [view, setView] = useState<CalendarView>('week');
  const [addMenuAnchor, setAddMenuAnchor] = useState<number | null>(null);

  const selectedDay = fromDayKey(selectedKey);
  const weekStart = startOfWeek(selectedDay, { weekStartsOn: 1 });
  const source = { scheduleBlocks, studyBlocks, exams, tasks, routines };
  const agenda = getAgenda(selectedDay, source);
  const dayTasks = getTasksForDay(tasks, selectedDay);
  const untimedRoutines = getRoutinesForDay(routines, selectedDay).filter((routine) => !routine.time);
  // Short month so it stays on one line beside the add button: «Miércoles 30 sept».
  const dayLabel = format(selectedDay, 'EEEE d MMM', { locale: es }).replace('.', '');
  const awayFromToday = view === 'month'
    ? !isSameMonth(selectedDay, today)
    : !isSameDay(weekStart, startOfWeek(today, { weekStartsOn: 1 }));

  const openItem = (item: AgendaItem) => {
    if (item.type === 'study') setEditor({ type: 'study', block: item.block });
    else if (item.type === 'class') setEditor({ type: 'class', block: item.block });
    else if (item.type === 'routine') router.push('/routines');
    else setEditor({ type: 'exam', exam: item.exam });
  };

  return (
    <>
      <AppScreen>
        <ScreenHeader
          title="Calendario"
          subtitle={view === 'list' ? 'Lo que viene' : isSameDay(selectedDay, today) ? 'Hoy' : dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}>
          <AddButton accessibilityLabel="Añadir clase o bloque de estudio" onPress={setAddMenuAnchor} />
        </ScreenHeader>

        <SegmentedControl options={viewOptions} value={view} onChange={setView} style={styles.views} />

        {view === 'list' ? (
          <UpcomingList today={today} getDays={(count) => getUpcomingDays(today, count, source)} onOpenItem={openItem} />
        ) : (
          <>
            {view === 'month' ? (
              <MonthGrid
                month={selectedDay}
                selectedKey={selectedKey}
                today={today}
                hasEvents={(day) => dayHasEvents(day, source)}
                onSelect={(day) => setSelectedKey(toDayKey(day))}
                onChangeMonth={(delta) => setSelectedKey(toDayKey(addMonths(selectedDay, delta)))}
              />
            ) : (
              <WeekStrip
                weekStart={weekStart}
                selectedKey={selectedKey}
                today={today}
                hasEvents={(day) => dayHasEvents(day, source)}
                onSelect={(day) => setSelectedKey(toDayKey(day))}
                onChangeWeek={(delta) => setSelectedKey(toDayKey(addWeeks(selectedDay, delta)))}
              />
            )}
            {awayFromToday ? (
              <ActionButton label="Volver a hoy" variant="plain" onPress={() => setSelectedKey(toDayKey(today))} style={styles.backToToday} />
            ) : null}

            <View style={styles.sections}>
              {agenda.length ? (
                <View style={styles.list}>
                  {agenda.map((item) => <AgendaRow key={item.key} item={item} onPress={() => openItem(item)} />)}
                </View>
              ) : (
                <Surface style={styles.empty}>
                  <Typography kind="heading">Nada planificado</Typography>
                  <Typography kind="secondary">Reserva un rato para estudiar o añade tus clases para ver tus huecos libres.</Typography>
                  <ActionButton label="Planificar estudio" onPress={() => setEditor({ type: 'study', block: null })} />
                </Surface>
              )}

              {dayTasks.length || untimedRoutines.length ? (
                <View style={styles.list}>
                  <Typography kind="heading">Para este día</Typography>
                  {dayTasks.map((task) => <TodayTaskRow key={task.id} task={task} />)}
                  {untimedRoutines.map((routine) => <TodayRoutineRow key={routine.id} routine={routine} day={selectedDay} />)}
                </View>
              ) : null}
            </View>
          </>
        )}
      </AppScreen>

      {editor?.type === 'study' ? (
        <StudyBlockFormSheet block={editor.block} initialDate={selectedKey} onClose={() => setEditor(undefined)} />
      ) : null}
      {editor?.type === 'class' ? (
        <ClassBlockEditor block={editor.block} initialWeekday={selectedDay.getDay()} onClose={() => setEditor(undefined)} />
      ) : null}
      {editor?.type === 'exam' ? <ExamFormSheet exam={editor.exam} onClose={() => setEditor(undefined)} /> : null}
      <AddMenu
        visible={addMenuAnchor !== null}
        anchorY={addMenuAnchor ?? 0}
        options={addOptions}
        onPick={(choice) => setEditor(choice === 'class' ? { type: 'class', block: null } : { type: 'study', block: null })}
        onClose={() => setAddMenuAnchor(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  views: { marginTop: -spacing.md, marginBottom: spacing.lg },
  backToToday: { alignSelf: 'center', marginTop: -spacing.sm, marginBottom: spacing.sm },
  sections: { gap: spacing.xl },
  list: { gap: spacing.sm },
  empty: { gap: spacing.sm },
});
