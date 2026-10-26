import { addDays, isSameDay, startOfWeek } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useImperativeHandle, useState, type Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { Surface } from '@/components/surface';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { toDayKey } from '@/features/calendar/calendar-utils';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';
import type { CreateHandle } from '@/types/create-handle';
import type { Routine } from '@/types/models';

import { RoutineFormSheet } from './routine-form-sheet';
import { formatWeekdays, isRoutineDoneOn, isRoutineDue, weekdayOptions } from './routine-utils';

/** Rutinas segment of the Tareas tab. */
export function RoutinesView({ ref }: { ref?: Ref<CreateHandle> }) {
  const routines = useFocoStore((state) => state.routines);
  // undefined: closed, null: new routine, Routine: editing.
  const [editing, setEditing] = useState<Routine | null | undefined>(undefined);

  useImperativeHandle(ref, () => ({ create: () => setEditing(null) }), []);

  const sorted = [...routines].sort((left, right) => (left.time ?? '99:99').localeCompare(right.time ?? '99:99'));

  return (
    <>
      {sorted.length ? (
        <View style={styles.list}>
          <Typography kind="secondary">Lo que repites cada semana. Márcalo cuando lo hagas y cuenta para tu día.</Typography>
          {sorted.map((routine) => <RoutineCard key={routine.id} routine={routine} onPress={() => setEditing(routine)} />)}
        </View>
      ) : (
        <Surface style={styles.empty}>
          <Typography kind="heading">Crea tu primera rutina</Typography>
          <Typography kind="secondary">Por ejemplo, planificar el día siguiente cada noche o pasar apuntes a limpio tres veces por semana.</Typography>
          <ActionButton label="Añadir rutina" onPress={() => setEditing(null)} />
        </Surface>
      )}
      {editing !== undefined ? <RoutineFormSheet routine={editing} onClose={() => setEditing(undefined)} /> : null}
    </>
  );
}

function RoutineCard({ routine, onPress }: { routine: Routine; onPress: () => void }) {
  const theme = useTheme();
  const toggleRoutineDone = useFocoStore((state) => state.toggleRoutineDone);
  const subject = useFocoStore((state) => state.subjects.find((item) => item.id === routine.subjectId));
  const today = new Date();
  const dueToday = isRoutineDue(routine, today);
  const doneToday = isRoutineDoneOn(routine, today);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const details = [formatWeekdays(routine.weekdays), routine.time, subject?.name].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${routine.title}, ${details}`}
      accessibilityHint="Abre la rutina para editarla"
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: theme.surf, borderColor: theme.line, opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.top}>
        <View style={styles.copy}>
          <Typography style={styles.title}>{routine.title}</Typography>
          <Typography kind="secondary" style={styles.details}>{details}</Typography>
        </View>
        {dueToday ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`Hecha hoy: ${routine.title}`}
            accessibilityState={{ checked: doneToday }}
            onPress={() => {
              toggleRoutineDone(routine.id, toDayKey(today));
              void Haptics.selectionAsync();
            }}
            style={styles.checkArea}>
            <View style={[styles.check, doneToday ? { backgroundColor: theme.accent, borderColor: theme.accent } : { borderColor: theme.muted }]}>
              {doneToday ? <SymbolIcon ios="checkmark" other="check" color={theme.accentInk} size={14} /> : null}
            </View>
          </Pressable>
        ) : (
          <Typography kind="caption" style={styles.notToday}>Hoy no toca</Typography>
        )}
      </View>
      <View style={styles.week} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {weekdayOptions.map((option, index) => {
          const day = addDays(weekStart, index);
          const due = isRoutineDue(routine, day);
          const done = isRoutineDoneOn(routine, day);
          const isToday = isSameDay(day, today);
          return (
            <View key={option.value} style={styles.weekDay}>
              <Typography kind="caption" style={{ color: isToday ? theme.text : theme.muted, fontWeight: isToday ? '800' : '600' }}>{option.short}</Typography>
              <View
                style={[
                  styles.weekDot,
                  done
                    ? { backgroundColor: theme.ok, borderColor: theme.ok }
                    : due
                      ? { borderColor: theme.muted }
                      : { backgroundColor: theme.track, borderColor: theme.track },
                ]}
              />
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  empty: { gap: spacing.sm },
  card: { borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  details: { fontSize: 14 },
  checkArea: { width: minTouchSize, height: minTouchSize, alignItems: 'center', justifyContent: 'center' },
  check: { width: 26, height: 26, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  notToday: { maxWidth: 90, textAlign: 'right' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: spacing.xxs, flex: 1 },
  weekDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
});
