import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { useFocoStore } from '@/store/use-foco-store';
import { fonts } from '@/theme/fonts';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';
import type { StudyBlock } from '@/types/models';

import { formatDuration, fromDayKey, minutesToTime, timeToMinutes, toDayKey } from './calendar-utils';

type StudyBlockFormSheetProps = {
  block: StudyBlock | null;
  /** Day for a new block, yyyy-MM-dd. */
  initialDate: string;
  onClose: () => void;
};

type PickerField = 'date' | 'start' | 'end';

function timeAsDate(time: string) {
  const value = new Date();
  value.setHours(Math.floor(timeToMinutes(time) / 60), timeToMinutes(time) % 60, 0, 0);
  return value;
}

export function StudyBlockFormSheet({ block, initialDate, onClose }: StudyBlockFormSheetProps) {
  const theme = useTheme();
  const subjects = useFocoStore((state) => state.subjects);
  const addStudyBlock = useFocoStore((state) => state.addStudyBlock);
  const updateStudyBlock = useFocoStore((state) => state.updateStudyBlock);
  const deleteStudyBlock = useFocoStore((state) => state.deleteStudyBlock);
  const orderedSubjects = [...subjects].sort((left, right) => left.order - right.order);

  const [subjectId, setSubjectId] = useState<string | null>(block?.subjectId ?? orderedSubjects[0]?.id ?? null);
  const [title, setTitle] = useState(block?.title ?? '');
  const [date, setDate] = useState(block?.date ?? initialDate);
  const [startTime, setStartTime] = useState(block?.startTime ?? '18:00');
  const [endTime, setEndTime] = useState(block?.endTime ?? '18:45');
  const [picker, setPicker] = useState<PickerField | null>(null);
  const subjectName = orderedSubjects.find((subject) => subject.id === subjectId)?.name;
  const validTimes = timeToMinutes(endTime) > timeToMinutes(startTime);

  const save = () => {
    if (!validTimes) {
      Alert.alert('Revisa las horas', 'La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    const draft = {
      subjectId,
      title: title.trim() || (subjectName ? `Repaso de ${subjectName}` : 'Bloque de estudio'),
      date,
      startTime,
      endTime,
    };
    if (block) updateStudyBlock(block.id, draft);
    else addStudyBlock(draft);
    onClose();
  };

  const confirmDelete = () => {
    if (!block) return;
    Alert.alert('Eliminar bloque', `¿Quieres eliminar «${block.title}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { deleteStudyBlock(block.id); onClose(); } },
    ]);
  };

  const onPick = (value: Date) => {
    if (picker === 'date') setDate(toDayKey(value));
    if (picker === 'start') {
      // Keep the duration when moving the start.
      const duration = Math.max(15, timeToMinutes(endTime) - timeToMinutes(startTime));
      const start = value.getHours() * 60 + value.getMinutes();
      setStartTime(minutesToTime(start));
      setEndTime(minutesToTime(Math.min(start + duration, 23 * 60 + 55)));
    }
    if (picker === 'end') setEndTime(format(value, 'HH:mm'));
    if (Platform.OS === 'android') setPicker(null);
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <View style={[styles.overlay, { backgroundColor: theme.scrim }]}>
        <Pressable accessibilityLabel="Cerrar formulario" onPress={onClose} style={StyleSheet.absoluteFill} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: theme.bg }]}>
            <View style={[styles.handle, { backgroundColor: theme.muted }]} />
            <View style={styles.header}>
              <Typography kind="heading" style={styles.headerTitle}>{block ? 'Editar bloque de estudio' : 'Nuevo bloque de estudio'}</Typography>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={[styles.close, { backgroundColor: theme.track }]}>
                <SymbolIcon ios="xmark" other="close" color={theme.muted} size={20} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {orderedSubjects.length ? (
                <Field label="Asignatura">
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
                          <Typography style={{ fontWeight: selected ? '700' : '600', color: selected ? theme.text : theme.muted }}>{subject.name}</Typography>
                        </Pressable>
                      );
                    })}
                  </View>
                </Field>
              ) : null}

              <Field label="Qué vas a hacer">
                <TextInput
                  accessibilityLabel="Título del bloque"
                  maxLength={80}
                  onChangeText={setTitle}
                  placeholder={subjectName ? `Repaso de ${subjectName}` : 'Ej.: Repaso de límites'}
                  placeholderTextColor={theme.muted}
                  returnKeyType="done"
                  style={[styles.input, { backgroundColor: theme.surf, borderColor: theme.line, color: theme.text }]}
                  value={title}
                />
              </Field>

              <Field label="Cuándo">
                <ActionButton
                  label={format(fromDayKey(date), "EEEE d 'de' MMMM", { locale: es })}
                  variant="secondary"
                  icon={<SymbolIcon ios="calendar" other="calendar_today" color={theme.accent} size={18} />}
                  onPress={() => setPicker(picker === 'date' ? null : 'date')}
                />
                <View style={styles.row}>
                  <ActionButton label={`Empieza · ${startTime}`} variant="secondary" onPress={() => setPicker(picker === 'start' ? null : 'start')} style={styles.grow} />
                  <ActionButton label={`Termina · ${endTime}`} variant="secondary" onPress={() => setPicker(picker === 'end' ? null : 'end')} style={styles.grow} />
                </View>
                <Typography kind="secondary" style={{ color: validTimes ? theme.muted : theme.danger }}>
                  {validTimes ? `Duración: ${formatDuration(startTime, endTime)}` : 'La hora de fin debe ser posterior a la de inicio.'}
                </Typography>
                {picker ? (
                  <DateTimePicker
                    value={picker === 'date' ? fromDayKey(date) : timeAsDate(picker === 'start' ? startTime : endTime)}
                    mode={picker === 'date' ? 'date' : 'time'}
                    display={Platform.OS === 'ios' ? (picker === 'date' ? 'inline' : 'spinner') : 'default'}
                    minuteInterval={5}
                    onValueChange={(_event, value) => onPick(value)}
                    onDismiss={() => setPicker(null)}
                    themeVariant={theme.colorScheme}
                    accentColor={theme.accent}
                  />
                ) : null}
              </Field>

              <ActionButton label={block ? 'Guardar cambios' : 'Añadir bloque'} onPress={save} />
              {block ? (
                <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.delete}>
                  <Typography style={{ color: theme.danger, fontWeight: '700' }}>Eliminar bloque</Typography>
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
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  handle: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', opacity: 0.45, marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  headerTitle: { flex: 1 },
  close: { width: minTouchSize, height: minTouchSize, borderRadius: minTouchSize / 2, alignItems: 'center', justifyContent: 'center' },
  form: { gap: spacing.lg, paddingBottom: spacing.md },
  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 14, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { minHeight: minTouchSize, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.chip + 4, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: radii.button, paddingHorizontal: spacing.md, fontSize: 17, fontFamily: fonts.medium },
  row: { flexDirection: 'row', gap: spacing.sm },
  grow: { flex: 1 },
  delete: { minHeight: minTouchSize, alignItems: 'center', justifyContent: 'center' },
});
