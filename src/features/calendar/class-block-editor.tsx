import { useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { SymbolIcon } from '@/components/symbol-icon';
import { TimePickerButton } from '@/components/time-picker-button';
import { Typography } from '@/components/typography';
import { useFocoStore } from '@/store/use-foco-store';
import { fonts } from '@/theme/fonts';
import { useTheme } from '@/theme/use-theme';
import { categoryColors, minTouchSize, radii, spacing } from '@/theme/tokens';
import { NO_CATEGORY, type ScheduleBlock } from '@/types/models';

import { formatDuration, minutesToTime, timeToMinutes } from './calendar-utils';

const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
// Monday first, values follow Date.getDay().
const weekdayOptions = [1, 2, 3, 4, 5, 6, 0].map((value) => ({ value, label: 'DLMXJVS'[value] }));

type ClassBlockEditorProps = {
  block: ScheduleBlock | null;
  initialWeekday: number;
  onClose: () => void;
};

/**
 * Weekly class. A new one can go on several days at once (one block per day, so each can be moved
 * later on its own); an existing one edits just its day.
 */
export function ClassBlockEditor({ block, initialWeekday, onClose }: ClassBlockEditorProps) {
  const theme = useTheme();
  const subjects = useFocoStore((state) => state.subjects);
  const addScheduleBlock = useFocoStore((state) => state.addScheduleBlock);
  const updateScheduleBlock = useFocoStore((state) => state.updateScheduleBlock);
  const deleteScheduleBlock = useFocoStore((state) => state.deleteScheduleBlock);
  const orderedSubjects = [...subjects].sort((left, right) => left.order - right.order);

  const [subjectId, setSubjectId] = useState<string | null>(
    block ? (block.categoryType === 'subject' ? block.categoryId : null) : orderedSubjects[0]?.id ?? null,
  );
  const [weekdays, setWeekdays] = useState<number[]>([block?.weekday ?? initialWeekday]);
  const [startTime, setStartTime] = useState(block?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(block?.endTime ?? '11:00');
  const [place, setPlace] = useState(block?.place ?? '');
  const validTimes = timeToMinutes(endTime) > timeToMinutes(startTime);
  const canSave = validTimes && weekdays.length > 0;

  const toggleDay = (day: number) => {
    if (block) setWeekdays([day]);
    else setWeekdays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  };

  // Moving the start keeps the length of the class.
  const changeStart = (time: string) => {
    const duration = Math.max(15, timeToMinutes(endTime) - timeToMinutes(startTime));
    setStartTime(time);
    setEndTime(minutesToTime(Math.min(timeToMinutes(time) + duration, 23 * 60 + 55)));
  };

  const save = () => {
    if (!canSave) return;
    const subject = orderedSubjects.find((item) => item.id === subjectId);
    const fields = {
      startTime,
      endTime,
      place: place.trim(),
      // Classes take their subject's colour, so the calendar matches the rest of the app.
      color: subject?.color ?? block?.color ?? categoryColors[0],
      // Older classes may point at a project (the previous editor allowed it); keep that link.
      ...(subject
        ? { categoryId: subject.id, categoryType: 'subject' as const }
        : block?.categoryType === 'project' && block.categoryId
          ? { categoryId: block.categoryId, categoryType: 'project' as const }
          : NO_CATEGORY),
    };
    if (block) updateScheduleBlock(block.id, { ...fields, weekday: weekdays[0] });
    else weekdays.forEach((weekday) => addScheduleBlock({ ...fields, weekday }));
    onClose();
  };

  const confirmDelete = () => {
    if (!block) return;
    Alert.alert(
      'Eliminar clase',
      `¿Quieres quitar la clase del ${dayNames[block.weekday]} de ${block.startTime} a ${block.endTime}? Desaparecerá de todas las semanas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => { deleteScheduleBlock(block.id); onClose(); } },
      ],
    );
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <View style={[styles.overlay, { backgroundColor: theme.scrim }]}>
        <Pressable accessibilityLabel="Cerrar formulario" onPress={onClose} style={StyleSheet.absoluteFill} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: theme.bg }]}>
            <View style={[styles.handle, { backgroundColor: theme.muted }]} />
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Typography kind="heading">{block ? 'Editar clase' : 'Nueva clase'}</Typography>
                <Typography kind="caption">Se repite cada semana.</Typography>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={[styles.close, { backgroundColor: theme.track }]}>
                <SymbolIcon ios="xmark" other="close" color={theme.muted} size={20} />
              </Pressable>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Field label="Asignatura">
                {orderedSubjects.length ? (
                  <View style={styles.chips} accessibilityRole="radiogroup">
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
                ) : (
                  <Typography kind="secondary">Añade asignaturas desde Perfil para ponerles nombre y color a tus clases.</Typography>
                )}
              </Field>

              <Field label={block ? 'Qué día' : 'Qué días'}>
                <View style={styles.days}>
                  {weekdayOptions.map(({ value, label }) => {
                    const selected = weekdays.includes(value);
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole={block ? 'radio' : 'checkbox'}
                        accessibilityLabel={dayNames[value]}
                        accessibilityState={block ? { selected } : { checked: selected }}
                        onPress={() => toggleDay(value)}
                        style={[styles.day, { backgroundColor: selected ? theme.accent : theme.surf, borderColor: selected ? theme.accent : theme.line }]}>
                        <Typography style={{ color: selected ? theme.accentInk : theme.text, fontWeight: '700' }}>{label}</Typography>
                      </Pressable>
                    );
                  })}
                </View>
                {!weekdays.length ? <Typography kind="secondary" style={{ color: theme.danger }}>Elige al menos un día.</Typography> : null}
              </Field>

              <Field label="Horario">
                <View style={styles.row}>
                  <TimePickerButton value={startTime} onChange={changeStart} title="Empieza" style={styles.grow} />
                  <Typography kind="secondary">a</Typography>
                  <TimePickerButton value={endTime} onChange={setEndTime} title="Termina" style={styles.grow} />
                </View>
                <Typography kind="secondary" style={{ color: validTimes ? theme.muted : theme.danger }}>
                  {validTimes ? `Duración: ${formatDuration(startTime, endTime)}` : 'La hora de fin debe ser posterior a la de inicio.'}
                </Typography>
              </Field>

              <Field label="Aula (opcional)">
                <TextInput
                  accessibilityLabel="Aula de la clase"
                  maxLength={80}
                  onChangeText={setPlace}
                  placeholder="Ej.: Aula 2.14"
                  placeholderTextColor={theme.muted}
                  returnKeyType="done"
                  style={[styles.input, { backgroundColor: theme.surf, borderColor: theme.line, color: theme.text }]}
                  value={place}
                />
              </Field>

              {block ? (
                <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.delete}>
                  <Typography style={{ color: theme.danger, fontWeight: '700' }}>Eliminar clase</Typography>
                </Pressable>
              ) : null}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: theme.line }]}>
              <ActionButton
                label={block ? 'Guardar cambios' : weekdays.length > 1 ? `Añadir ${weekdays.length} clases` : 'Añadir clase'}
                disabled={!canSave}
                onPress={save}
                style={!canSave && styles.disabled}
              />
            </View>
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
  // flexShrink lets the sheet and its list fit inside the 94% cap, so a long form scrolls while the save button stays put.
  sheet: { flexShrink: 1, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  scroll: { flexShrink: 1 },
  handle: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', opacity: 0.45, marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  headerCopy: { flex: 1, gap: 2 },
  close: { width: minTouchSize, height: minTouchSize, borderRadius: minTouchSize / 2, alignItems: 'center', justifyContent: 'center' },
  form: { gap: spacing.lg, paddingBottom: spacing.lg },
  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 14, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  // maxWidth keeps a long subject inside the screen; its name ends in «…».
  chip: { maxWidth: '100%', minHeight: minTouchSize, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.chip + 4, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  days: { flexDirection: 'row', gap: spacing.xs },
  day: { flex: 1, minHeight: minTouchSize, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  grow: { flex: 1 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: radii.button, paddingHorizontal: spacing.md, fontSize: 17, fontFamily: fonts.medium },
  delete: { minHeight: minTouchSize, alignItems: 'center', justifyContent: 'center' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  disabled: { opacity: 0.5 },
});
