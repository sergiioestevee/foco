import DateTimePicker from '@react-native-community/datetimepicker';
import { addDays, format, setHours, setMinutes, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import type { NewExam } from '@/store/use-foco-store';
import { useFocoStore } from '@/store/use-foco-store';
import { fonts } from '@/theme/fonts';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';
import type { Exam } from '@/types/models';

import { clampReviewProgress } from './exam-utils';

type ExamFormSheetProps = {
  exam: Exam | null;
  onClose: () => void;
};

const REVIEW_STEP = 10;

export function ExamFormSheet({ exam, onClose }: ExamFormSheetProps) {
  const theme = useTheme();
  const subjects = useFocoStore((state) => state.subjects);
  const addExam = useFocoStore((state) => state.addExam);
  const updateExam = useFocoStore((state) => state.updateExam);
  const deleteExam = useFocoStore((state) => state.deleteExam);
  const orderedSubjects = [...subjects].sort((left, right) => left.order - right.order);

  const [subjectId, setSubjectId] = useState<string | null>(exam?.subjectId ?? orderedSubjects[0]?.id ?? null);
  const [title, setTitle] = useState(exam?.title ?? '');
  const [date, setDate] = useState(() => exam ? new Date(exam.date) : setHours(addDays(startOfDay(new Date()), 7), 10));
  const [room, setRoom] = useState(exam?.room ?? '');
  const [reviewProgress, setReviewProgress] = useState(exam?.reviewProgress ?? 0);
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const canSave = title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    const draft: NewExam = { subjectId, title, date: date.toISOString(), room, reviewProgress };
    if (exam) updateExam(exam.id, draft);
    else addExam(draft);
    onClose();
  };

  const confirmDelete = () => {
    if (!exam) return;
    Alert.alert('Eliminar examen', `¿Quieres eliminar «${exam.title}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { deleteExam(exam.id); onClose(); } },
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
              <Typography kind="heading" style={styles.headerTitle}>{exam ? 'Editar examen' : 'Nuevo examen'}</Typography>
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
                          onPress={() => setSubjectId(subject.id)}
                          style={[styles.chip, selected ? { backgroundColor: `${subject.color}2E`, borderColor: subject.color } : { borderColor: theme.line }]}>
                          <View style={[styles.dot, { backgroundColor: subject.color }]} />
                          <Typography style={{ fontWeight: selected ? '700' : '600', color: selected ? theme.text : theme.muted }}>{subject.name}</Typography>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Typography kind="secondary">Añade asignaturas desde Perfil para vincular tus exámenes.</Typography>
                )}
              </Field>

              <Field label="Examen">
                <TextInput
                  accessibilityLabel="Nombre del examen"
                  autoFocus={!exam}
                  maxLength={80}
                  onChangeText={setTitle}
                  placeholder="Ej.: Parcial 1"
                  placeholderTextColor={theme.muted}
                  returnKeyType="done"
                  style={[styles.input, { backgroundColor: theme.surf, borderColor: theme.line, color: theme.text }]}
                  value={title}
                />
              </Field>

              <Field label="Fecha y hora">
                <View style={styles.row}>
                  <ActionButton
                    label={format(date, "EEEE d 'de' MMMM", { locale: es })}
                    variant="secondary"
                    icon={<SymbolIcon ios="calendar" other="calendar_today" color={theme.accent} size={18} />}
                    onPress={() => setPicker(picker === 'date' ? null : 'date')}
                    style={styles.grow}
                  />
                  <ActionButton
                    label={format(date, 'HH:mm')}
                    variant="secondary"
                    icon={<SymbolIcon ios="clock" other="schedule" color={theme.accent} size={18} />}
                    onPress={() => setPicker(picker === 'time' ? null : 'time')}
                  />
                </View>
                {picker ? (
                  <DateTimePicker
                    value={date}
                    mode={picker}
                    display={Platform.OS === 'ios' ? (picker === 'date' ? 'inline' : 'spinner') : 'default'}
                    minuteInterval={5}
                    onValueChange={(_event, value) => {
                      setDate(picker === 'date'
                        ? setMinutes(setHours(value, date.getHours()), date.getMinutes())
                        : value);
                      if (Platform.OS === 'android') setPicker(null);
                    }}
                    onDismiss={() => setPicker(null)}
                    themeVariant={theme.colorScheme}
                    accentColor={theme.accent}
                  />
                ) : null}
              </Field>

              <Field label="Aula (opcional)">
                <TextInput
                  accessibilityLabel="Aula"
                  maxLength={40}
                  onChangeText={setRoom}
                  placeholder="Ej.: Aula 2.04"
                  placeholderTextColor={theme.muted}
                  returnKeyType="done"
                  style={[styles.input, { backgroundColor: theme.surf, borderColor: theme.line, color: theme.text }]}
                  value={room}
                />
              </Field>

              <Field label="Cuánto llevas repasado">
                <View style={styles.row}>
                  <Stepper
                    label={`Restar ${REVIEW_STEP} %`}
                    icon="minus"
                    disabled={reviewProgress <= 0}
                    onPress={() => setReviewProgress((value) => clampReviewProgress(value - REVIEW_STEP))}
                  />
                  <View style={styles.reviewCenter} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: reviewProgress }}>
                    <Typography style={styles.reviewValue}>{reviewProgress}%</Typography>
                    <View style={[styles.track, { backgroundColor: theme.track }]}>
                      <View style={[styles.fill, { backgroundColor: theme.warn, width: `${reviewProgress}%` }]} />
                    </View>
                  </View>
                  <Stepper
                    label={`Sumar ${REVIEW_STEP} %`}
                    icon="plus"
                    disabled={reviewProgress >= 100}
                    onPress={() => setReviewProgress((value) => clampReviewProgress(value + REVIEW_STEP))}
                  />
                </View>
              </Field>

              <ActionButton
                label={exam ? 'Guardar cambios' : 'Añadir examen'}
                disabled={!canSave}
                onPress={save}
                style={!canSave && styles.disabled}
              />
              {exam ? (
                <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.delete}>
                  <Typography style={{ color: theme.danger, fontWeight: '700' }}>Eliminar examen</Typography>
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

function Stepper({ label, icon, disabled, onPress }: { label: string; icon: 'plus' | 'minus'; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.stepper, { backgroundColor: theme.surf, borderColor: theme.line, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
      <SymbolIcon ios={icon} other={icon === 'plus' ? 'add' : 'remove'} color={theme.text} size={18} />
    </Pressable>
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { minHeight: minTouchSize, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.chip + 4, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: radii.button, paddingHorizontal: spacing.md, fontSize: 17, fontFamily: fonts.medium },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  grow: { flex: 1 },
  stepper: { width: 52, height: 52, borderRadius: radii.button, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  reviewCenter: { flex: 1, gap: spacing.xs, alignItems: 'center' },
  reviewValue: { fontSize: 22, fontWeight: '800' },
  track: { alignSelf: 'stretch', height: 8, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
  disabled: { opacity: 0.5 },
  delete: { minHeight: minTouchSize, alignItems: 'center', justifyContent: 'center' },
});
