import { set } from 'date-fns';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { CategoryPicker } from '@/components/category-picker';
import { DatePickerButton } from '@/components/date-picker-button';
import { SegmentedControl } from '@/components/segmented-control';
import { SymbolIcon } from '@/components/symbol-icon';
import { TimePickerButton } from '@/components/time-picker-button';
import { Typography } from '@/components/typography';
import { withDueTime } from '@/features/tasks/task-date-utils';
import { taskKindOptions } from '@/features/tasks/task-kinds';
import { useFocoStore } from '@/store/use-foco-store';
import { fonts } from '@/theme/fonts';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';
import type { CategorySelection, Task, TaskKind, TaskPriority } from '@/types/models';

export type TaskDraft = Pick<Task, 'kind' | 'title' | 'notes' | 'dueDate' | 'dueTime' | 'priority' | 'goalId'> & CategorySelection;

type TaskFormSheetProps = {
  visible: boolean;
  task?: Task | null;
  defaultGoalId?: string | null;
  /** Category for a new task, e.g. the project the Tareas list is filtered by. */
  defaultCategory?: CategorySelection;
  onClose: () => void;
  onSave: (draft: TaskDraft) => void;
  /** Shown as «Eliminar tarea» when editing; rows have no delete button. */
  onDelete?: () => void;
};

const priorities = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
] as const satisfies readonly { value: TaskPriority; label: string }[];

/** A due date with no time yet defaults to the end of the afternoon. */
const DEFAULT_DUE_TIME = '18:00';

export function TaskFormSheet({ visible, task, defaultGoalId, defaultCategory, onClose, onSave, onDelete }: TaskFormSheetProps) {
  const theme = useTheme();
  const goals = useFocoStore((state) => state.goals);
  const [kind, setKind] = useState<TaskKind>(task?.kind ?? 'task');
  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [dueDate, setDueDate] = useState<Date | null>(task?.dueDate ? new Date(task.dueDate) : null);
  const [dueTime, setDueTime] = useState<string | null>(task?.dueTime ?? null);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium');
  const [category, setCategory] = useState<CategorySelection>(task?.categoryId && task.categoryType
    ? { categoryId: task.categoryId, categoryType: task.categoryType }
    : defaultCategory ?? { categoryId: null, categoryType: null });
  const [goalId, setGoalId] = useState<string | null>(task?.goalId ?? defaultGoalId ?? null);
  // Goal and notes are rarely needed: each one unfolds from its row.
  const [openDetail, setOpenDetail] = useState<'goal' | 'notes' | null>(null);
  const goalTitle = goals.find((goal) => goal.id === goalId)?.title;
  const toggleDetail = (detail: 'goal' | 'notes') => setOpenDetail((current) => (current === detail ? null : detail));

  // Notes are the last field: React Native doesn't scroll a focused input into view, so the form
  // jumps to the end (no animation, no waiting) as the keyboard starts to rise, again once it's up
  // and the sheet has shrunk, and while the text grows.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [writingNotes, setWritingNotes] = useState(false);
  const showNotes = () => scrollRef.current?.scrollToEnd({ animated: false });
  useEffect(() => {
    if (!writingNotes) return;
    const subscriptions = ['keyboardWillShow', 'keyboardDidShow'].map((event) =>
      Keyboard.addListener(event as 'keyboardWillShow' | 'keyboardDidShow', showNotes));
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [writingNotes]);
  const canSave = title.trim().length > 0;

  const save = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onSave({
      kind,
      title: trimmedTitle,
      notes: notes.trim(),
      dueDate: dueDate ? withDueTime(dueDate, dueTime) : null,
      dueTime: dueDate ? dueTime : null,
      priority,
      goalId,
      ...category,
    });
  };

  // Keep the picked day; the time of day comes from dueTime when saving.
  const pickDay = (day: Date) => setDueDate((current) => set(current ?? day, { year: day.getFullYear(), month: day.getMonth(), date: day.getDate() }));

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={[styles.overlay, { backgroundColor: theme.scrim }]}>
        <Pressable accessibilityLabel="Cerrar formulario" onPress={onClose} style={StyleSheet.absoluteFill} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: theme.bg }]}>
            <View style={[styles.handle, { backgroundColor: theme.muted }]} />
            <View style={styles.header}>
              <Typography kind="heading" style={styles.headerTitle}>{task ? 'Editar tarea' : 'Nueva tarea'}</Typography>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={[styles.close, { backgroundColor: theme.track }]}>
                <SymbolIcon ios="xmark" other="close" color={theme.muted} size={20} />
              </Pressable>
            </View>

            <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextInput
                accessibilityLabel="Título de la tarea"
                autoFocus={!task}
                maxLength={120}
                onChangeText={setTitle}
                onSubmitEditing={save}
                placeholder="¿Qué tienes que hacer?"
                placeholderTextColor={theme.muted}
                returnKeyType="done"
                style={[styles.titleInput, { backgroundColor: theme.surf, borderColor: theme.line, color: theme.text }]}
                value={title}
              />

              <Field label="Asignatura o proyecto">
                <CategoryPicker value={category} onChange={(value) => { if (value !== 'all') setCategory(value); }} />
              </Field>

              <Field label="Fecha">
                <View style={styles.row}>
                  <DatePickerButton
                    value={dueDate}
                    onChange={pickDay}
                    title="Día de entrega"
                    placeholder="Añadir fecha"
                    short
                    onClear={() => { setDueDate(null); setDueTime(null); }}
                    style={styles.grow}
                  />
                  {dueDate ? (
                    <TimePickerButton
                      value={dueTime}
                      onChange={setDueTime}
                      title="Hora de entrega"
                      defaultValue={DEFAULT_DUE_TIME}
                      onClear={() => setDueTime(null)}
                      style={styles.grow}
                    />
                  ) : null}
                </View>
              </Field>

              <Field label="Tipo">
                <SegmentedControl options={taskKindOptions} value={kind} onChange={setKind} />
              </Field>

              <Field label="Prioridad">
                <SegmentedControl options={priorities} value={priority} onChange={setPriority} />
              </Field>

              <View style={[styles.group, { backgroundColor: theme.surf, borderColor: theme.line }]}>
                <DetailRow
                  icon={{ ios: 'target', other: 'flag' }}
                  label="Objetivo"
                  value={goalTitle ?? 'Ninguno'}
                  expanded={openDetail === 'goal'}
                  onPress={() => toggleDetail('goal')}
                />
                {openDetail === 'goal' ? (
                  <View style={styles.detailBody}>
                    {goals.length ? (
                      <View style={styles.chips} accessibilityRole="radiogroup">
                        {goals.map((goal) => {
                          const selected = goal.id === goalId;
                          return (
                            <Pressable
                              key={goal.id}
                              accessibilityRole="radio"
                              accessibilityState={{ selected }}
                              onPress={() => setGoalId(selected ? null : goal.id)}
                              style={[styles.chip, selected ? { backgroundColor: theme.aiBg, borderColor: theme.accent } : { borderColor: theme.line }]}>
                              <Typography numberOfLines={1} style={{ flexShrink: 1, fontWeight: selected ? '700' : '600', color: selected ? theme.text : theme.muted }}>{goal.title}</Typography>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : (
                      <Typography kind="secondary">Crea objetivos en Metas para vincular tus tareas.</Typography>
                    )}
                  </View>
                ) : null}
                <View style={[styles.separator, { backgroundColor: theme.line }]} />
                <DetailRow
                  icon={{ ios: 'note.text', other: 'notes' }}
                  label="Notas"
                  value={notes.trim() ? notes.trim().split('\n')[0] : 'Añadir'}
                  expanded={openDetail === 'notes'}
                  onPress={() => toggleDetail('notes')}
                />
                {openDetail === 'notes' ? (
                  <View style={styles.detailBody}>
                    <TextInput
                      accessibilityLabel="Notas de la tarea"
                      autoFocus
                      maxLength={1000}
                      multiline
                      onBlur={() => setWritingNotes(false)}
                      onChangeText={setNotes}
                      onContentSizeChange={() => {
                        if (writingNotes) showNotes();
                      }}
                      onFocus={() => {
                        setWritingNotes(true);
                        showNotes();
                      }}
                      placeholder="Añade algún detalle si lo necesitas"
                      placeholderTextColor={theme.muted}
                      style={[styles.notesInput, { backgroundColor: theme.bg, borderColor: theme.line, color: theme.text }]}
                      textAlignVertical="top"
                      value={notes}
                    />
                  </View>
                ) : null}
              </View>

              {task && onDelete ? (
                <Pressable accessibilityRole="button" onPress={onDelete} style={styles.delete}>
                  <Typography style={{ color: theme.danger, fontWeight: '700' }}>Eliminar tarea</Typography>
                </Pressable>
              ) : null}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: theme.line }]}>
              <ActionButton label={task ? 'Guardar cambios' : 'Añadir tarea'} disabled={!canSave} onPress={save} style={!canSave && styles.disabled} />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

type DetailRowProps = {
  icon: { ios: SFSymbol; other: AndroidSymbol };
  label: string;
  value: string;
  expanded: boolean;
  onPress: () => void;
};

/** Settings-style row: icon, name, current value and a chevron; tapping unfolds what's under it. */
function DetailRow({ icon, label, value, expanded, onPress }: DetailRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={({ pressed }) => [styles.detailRow, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.detailIcon, { backgroundColor: theme.aiBg }]}>
        <SymbolIcon ios={icon.ios} other={icon.other} color={theme.accent} size={15} />
      </View>
      <Typography style={styles.detailLabel}>{label}</Typography>
      <Typography numberOfLines={1} style={[styles.detailValue, { color: theme.muted }]}>{value}</Typography>
      <SymbolIcon ios={expanded ? 'chevron.up' : 'chevron.down'} other={expanded ? 'expand_less' : 'expand_more'} color={theme.muted} size={13} />
    </Pressable>
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
  headerTitle: { flex: 1 },
  close: { width: minTouchSize, height: minTouchSize, borderRadius: minTouchSize / 2, alignItems: 'center', justifyContent: 'center' },
  form: { gap: spacing.lg, paddingBottom: spacing.lg },
  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 14, fontWeight: '600' },
  titleInput: { minHeight: 56, borderWidth: 1, borderRadius: radii.button, paddingHorizontal: spacing.md, fontSize: 19, fontFamily: fonts.semibold },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  grow: { flex: 1 },
  group: { borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  detailRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  detailIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: 16, fontWeight: '600' },
  detailValue: { flex: 1, textAlign: 'right', fontSize: 15 },
  detailBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.md + 30 + spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { maxWidth: '100%', minHeight: minTouchSize, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.chip + 4, borderWidth: 1 },
  notesInput: { minHeight: 88, borderWidth: 1, borderRadius: radii.button, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, fontFamily: fonts.medium },
  delete: { minHeight: minTouchSize, alignItems: 'center', justifyContent: 'center' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  disabled: { opacity: 0.5 },
});
