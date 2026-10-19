import { addWeeks, format, isSameDay, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { AppScreen } from '@/components/app-screen';
import { ScreenHeader } from '@/components/screen-header';
import { Surface } from '@/components/surface';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { AgendaRow } from '@/features/calendar/agenda-row';
import { dayHasEvents, fromDayKey, getAgenda, getTasksForDay, toDayKey, type AgendaItem } from '@/features/calendar/calendar-utils';
import { ClassBlockEditor } from '@/features/calendar/class-block-editor';
import { StudyBlockFormSheet } from '@/features/calendar/study-block-form-sheet';
import { WeekStrip } from '@/features/calendar/week-strip';
import { ExamFormSheet } from '@/features/exams/exam-form-sheet';
import { TodayTaskRow } from '@/features/home/today-tasks';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';
import type { Exam, ScheduleBlock, StudyBlock } from '@/types/models';

// undefined: closed, null: creating, value: editing.
type Editor =
  | { type: 'study'; block: StudyBlock | null }
  | { type: 'class'; block: ScheduleBlock | null }
  | { type: 'exam'; exam: Exam };

export default function CalendarScreen() {
  const theme = useTheme();
  const scheduleBlocks = useFocoStore((state) => state.scheduleBlocks);
  const studyBlocks = useFocoStore((state) => state.studyBlocks);
  const exams = useFocoStore((state) => state.exams);
  const tasks = useFocoStore((state) => state.tasks);
  const today = new Date();
  const [selectedKey, setSelectedKey] = useState(() => toDayKey(today));
  const [editor, setEditor] = useState<Editor | undefined>(undefined);

  const selectedDay = fromDayKey(selectedKey);
  const weekStart = startOfWeek(selectedDay, { weekStartsOn: 1 });
  const source = { scheduleBlocks, studyBlocks, exams, tasks };
  const agenda = getAgenda(selectedDay, source);
  const dayTasks = getTasksForDay(tasks, selectedDay);
  const dayLabel = format(selectedDay, "EEEE d 'de' MMMM", { locale: es });

  const openItem = (item: AgendaItem) => {
    if (item.type === 'study') setEditor({ type: 'study', block: item.block });
    else if (item.type === 'class') setEditor({ type: 'class', block: item.block });
    else setEditor({ type: 'exam', exam: item.exam });
  };

  return (
    <>
      <AppScreen>
        <ScreenHeader title="Calendario" subtitle={isSameDay(selectedDay, today) ? 'Hoy' : dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}>
          <ActionButton
            label="Estudiar"
            icon={<SymbolIcon ios="plus" other="add" color={theme.accentInk} size={16} />}
            accessibilityLabel="Añadir bloque de estudio"
            onPress={() => setEditor({ type: 'study', block: null })}
          />
        </ScreenHeader>

        <WeekStrip
          weekStart={weekStart}
          selectedKey={selectedKey}
          today={today}
          hasEvents={(day) => dayHasEvents(day, source)}
          onSelect={(day) => setSelectedKey(toDayKey(day))}
          onChangeWeek={(delta) => setSelectedKey(toDayKey(addWeeks(selectedDay, delta)))}
        />
        {!isSameDay(weekStart, startOfWeek(today, { weekStartsOn: 1 })) ? (
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

          {dayTasks.length ? (
            <View style={styles.list}>
              <Typography kind="heading">Para este día</Typography>
              {dayTasks.map((task) => <TodayTaskRow key={task.id} task={task} />)}
            </View>
          ) : null}

          <ActionButton
            label="Añadir clase semanal"
            variant="plain"
            icon={<SymbolIcon ios="repeat" other="repeat" color={theme.accent} size={16} />}
            onPress={() => setEditor({ type: 'class', block: null })}
          />
        </View>
      </AppScreen>

      {editor?.type === 'study' ? (
        <StudyBlockFormSheet block={editor.block} initialDate={selectedKey} onClose={() => setEditor(undefined)} />
      ) : null}
      {editor?.type === 'class' ? (
        <ClassBlockEditor block={editor.block} initialWeekday={selectedDay.getDay()} onClose={() => setEditor(undefined)} />
      ) : null}
      {editor?.type === 'exam' ? <ExamFormSheet exam={editor.exam} onClose={() => setEditor(undefined)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  backToToday: { alignSelf: 'center', marginTop: -spacing.sm, marginBottom: spacing.sm },
  sections: { gap: spacing.xl },
  list: { gap: spacing.sm },
  empty: { gap: spacing.sm },
});
