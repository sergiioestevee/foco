import { useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { SymbolIcon } from '@/components/symbol-icon';
import { TimePickerButton } from '@/components/time-picker-button';
import { Typography } from '@/components/typography';
import { useFocoStore } from '@/store/use-foco-store';
import { fonts } from '@/theme/fonts';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';
import type { Routine } from '@/types/models';

import { weekdayOptions } from './routine-utils';

const WEEKDAYS = [1, 2, 3, 4, 5];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function RoutineFormSheet({ routine, onClose }: { routine: Routine | null; onClose: () => void }) {
  const theme = useTheme();
  const subjects = useFocoStore((state) => state.subjects);
  const addRoutine = useFocoStore((state) => state.addRoutine);
  const updateRoutine = useFocoStore((state) => state.updateRoutine);
  const deleteRoutine = useFocoStore((state) => state.deleteRoutine);
  const orderedSubjects = [...subjects].sort((left, right) => left.order - right.order);

  const [title, setTitle] = useState(routine?.title ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(routine?.weekdays ?? WEEKDAYS);
  const [time, setTime] = useState<string | null>(routine ? routine.time : '22:00');
  const [subjectId, setSubjectId] = useState<string | null>(routine?.subjectId ?? null);
  const canSave = title.trim().length > 0 && weekdays.length > 0;
  const sameDays = (days: number[]) => days.length === weekdays.length && days.every((day) => weekdays.includes(day));

  const toggleDay = (day: number) =>
    setWeekdays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));

  const save = () => {
    if (!canSave) return;
    const draft = { title, weekdays, time, subjectId };
    if (routine) updateRoutine(routine.id, draft);
    else addRoutine(draft);
    onClose();
  };

  const confirmDelete = () => {
    if (!routine) return;
    Alert.alert('Eliminar rutina', `¿Quieres eliminar «${routine.title}» y su historial?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { deleteRoutine(routine.id); onClose(); } },
    ]);
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <View style={[styles.overlay, { backgroundColor: theme.scrim }]}>
        <Pressable accessibilityLabel="Cerrar formulario" onPress={onClose} style={StyleSheet.absoluteFill} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: theme.bg }]}>
            <View style={[styles.handle, { backgroundColor: theme.muted }]} />
            <View style={styles.header}>
              <Typography kind="heading" style={styles.headerTitle}>{routine ? 'Editar rutina' : 'Nueva rutina'}</Typography>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={[styles.close, { backgroundColor: theme.track }]}>
                <SymbolIcon ios="xmark" other="close" color={theme.muted} size={20} />
              </Pressable>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Field label="Qué haces">
                <TextInput
                  accessibilityLabel="Nombre de la rutina"
                  autoFocus={!routine}
                  maxLength={80}
                  onChangeText={setTitle}
                  placeholder="Ej.: Plan de mañana"
                  placeholderTextColor={theme.muted}
                  returnKeyType="done"
                  style={[styles.input, { backgroundColor: theme.surf, borderColor: theme.line, color: theme.text }]}
                  value={title}
                />
              </Field>

              <Field label="Qué días">
                <View style={styles.days}>
                  {weekdayOptions.map((option) => {
                    const selected = weekdays.includes(option.value);
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="checkbox"
                        accessibilityLabel={option.name}
                        accessibilityState={{ checked: selected }}
                        onPress={() => toggleDay(option.value)}
                        style={[styles.day, { backgroundColor: selected ? theme.accent : theme.surf, borderColor: selected ? theme.accent : theme.line }]}>
                        <Typography style={{ color: selected ? theme.accentInk : theme.text, fontWeight: '700' }}>{option.short}</Typography>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.shortcuts}>
                  <ActionButton label="Lun–Vie" variant={sameDays(WEEKDAYS) ? 'secondary' : 'plain'} onPress={() => setWeekdays(WEEKDAYS)} style={styles.shortcut} />
                  <ActionButton label="Todos" variant={sameDays(ALL_DAYS) ? 'secondary' : 'plain'} onPress={() => setWeekdays(ALL_DAYS)} style={styles.shortcut} />
                </View>
                {!weekdays.length ? <Typography kind="secondary" style={{ color: theme.danger }}>Elige al menos un día.</Typography> : null}
              </Field>

              <Field label="Hora">
                <View style={styles.switchRow}>
                  <Typography style={styles.switchLabel}>A una hora concreta</Typography>
                  <Switch
                    accessibilityLabel="A una hora concreta"
                    value={time !== null}
                    onValueChange={(enabled) => setTime(enabled ? '22:00' : null)}
                    trackColor={{ true: theme.accent, false: theme.track }}
                  />
                </View>
                {time !== null ? <TimePickerButton value={time} onChange={setTime} title="Hora de la rutina" /> : null}
              </Field>

              {orderedSubjects.length ? (
                <Field label="Asignatura (opcional)">
                  <View style={styles.chips}>
                    {orderedSubjects.map((subject) => {
                      const selected = subject.id === subjectId;
                      return (
                        <Pressable
                          key={subject.id}
                          accessibilityRole="radio"
                          accessibilityLabel={subject.name}
                          accessibilityState={{ selected }}
                          onPress={() => setSubjectId(selected ? null : subject.id)}
                          style={[styles.chip, selected ? { backgroundColor: `${subject.color}2E`, borderColor: subject.color } : { borderColor: theme.line }]}>
                          <View style={[styles.dot, { backgroundColor: subject.color }]} />
                          <Typography numberOfLines={1} style={{ flexShrink: 1, fontWeight: selected ? '700' : '600', color: selected ? theme.text : theme.muted }}>{subject.name}</Typography>
                        </Pressable>
                      );
                    })}
                  </View>
                </Field>
              ) : null}

              <ActionButton label={routine ? 'Guardar cambios' : 'Añadir rutina'} disabled={!canSave} onPress={save} style={!canSave && styles.disabled} />
              {routine ? (
                <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.delete}>
                  <Typography style={{ color: theme.danger, fontWeight: '700' }}>Eliminar rutina</Typography>
                </Pressable>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Typography kind="secondary" style={styles.fieldLabel}>{label}</Typography>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  keyboard: { maxHeight: '94%' },
  // flexShrink lets the sheet and its list fit inside the 94% cap, so a long form scrolls to its last button.
  sheet: { flexShrink: 1, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  scroll: { flexShrink: 1 },
  handle: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', opacity: 0.45, marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  headerTitle: { flex: 1 },
  close: { width: minTouchSize, height: minTouchSize, borderRadius: minTouchSize / 2, alignItems: 'center', justifyContent: 'center' },
  form: { gap: spacing.lg, paddingBottom: spacing.xl },
  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 14, fontWeight: '600' },
  input: { minHeight: 52, borderWidth: 1, borderRadius: radii.button, paddingHorizontal: spacing.md, fontSize: 17, fontFamily: fonts.medium },
  days: { flexDirection: 'row', gap: spacing.xxs },
  day: { flex: 1, height: minTouchSize + 4, borderRadius: radii.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  shortcuts: { flexDirection: 'row', gap: spacing.xs },
  shortcut: { flex: 1, minHeight: minTouchSize },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: minTouchSize },
  switchLabel: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  // maxWidth keeps a long subject inside the screen; its name ends in «…».
  chip: { maxWidth: '100%', minHeight: minTouchSize, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.chip + 4, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  disabled: { opacity: 0.5 },
  delete: { minHeight: minTouchSize, alignItems: 'center', justifyContent: 'center' },
});
