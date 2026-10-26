import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { CategoryPicker } from '@/components/category-picker';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { fonts } from '@/theme/fonts';
import { minTouchSize, radii, spacing } from '@/theme/tokens';
import { useFocoStore } from '@/store/use-foco-store';
import { SegmentedControl } from '@/components/segmented-control';
import { taskKindOptions } from '@/features/tasks/task-kinds';
import type { CategorySelection, Task, TaskKind, TaskPriority } from '@/types/models';

export type TaskDraft = Pick<Task, 'kind' | 'title' | 'notes' | 'dueDate' | 'priority' | 'goalId'> & CategorySelection;

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

const priorities: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
];

export function TaskFormSheet({ visible, task, defaultGoalId, defaultCategory, onClose, onSave, onDelete }: TaskFormSheetProps) {
  const theme = useTheme();
  const goals = useFocoStore((state) => state.goals);
  const [kind, setKind] = useState<TaskKind>(task?.kind ?? 'task');
  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [dueDate, setDueDate] = useState<Date | null>(task?.dueDate ? new Date(task.dueDate) : null);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium');
  const [category, setCategory] = useState<CategorySelection>(task?.categoryId && task.categoryType
    ? { categoryId: task.categoryId, categoryType: task.categoryType }
    : defaultCategory ?? { categoryId: null, categoryType: null });
  const [goalId, setGoalId] = useState<string | null>(task?.goalId ?? defaultGoalId ?? null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const save = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onSave({
      kind,
      title: trimmedTitle,
      notes: notes.trim(),
      dueDate: dueDate?.toISOString() ?? null,
      priority,
      goalId,
      ...category,
    });
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={[styles.overlay, { backgroundColor: theme.scrim }]}>
        <Pressable accessibilityLabel="Cerrar formulario" onPress={onClose} style={StyleSheet.absoluteFill} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: theme.bg }]}>
            <View style={[styles.handle, { backgroundColor: theme.muted }]} />
            <View style={styles.sheetHeader}>
              <View style={styles.headerCopy}>
                <Typography kind="heading">{task ? 'Editar tarea' : 'Nueva tarea'}</Typography>
                <Typography kind="caption">Empieza por lo esencial; puedes completar los detalles después.</Typography>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.track }]}>
                <SymbolIcon ios="xmark" other="close" color={theme.muted} size={20} />
              </Pressable>
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextInput
                accessibilityLabel="Título de la tarea"
                autoFocus={!task}
                maxLength={120}
                onChangeText={setTitle}
                onSubmitEditing={save}
                placeholder="¿Qué quieres hacer?"
                placeholderTextColor={theme.muted}
                returnKeyType="done"
                style={[styles.titleInput, { backgroundColor: theme.surf, color: theme.text }]}
                value={title}
              />
              <SegmentedControl options={taskKindOptions} value={kind} onChange={setKind} />
              <CategoryPicker value={category} onChange={(value) => { if (value !== 'all') setCategory(value); }} />
              <View style={styles.field}>
                <Typography kind="caption">Objetivo (opcional)</Typography>
                <View style={[styles.goalPicker, { backgroundColor: theme.track }]}>
                  <Picker
                    accessibilityLabel="Vincular tarea a un objetivo"
                    onValueChange={(value) => setGoalId(value === 'none' ? null : String(value))}
                    selectedValue={goalId ?? 'none'}
                    style={{ color: theme.text }}>
                    <Picker.Item label="Sin objetivo" value="none" />
                    {goals.map((goal) => <Picker.Item key={goal.id} label={goal.title} value={goal.id} />)}
                  </Picker>
                </View>
              </View>
              <View style={styles.field}>
                <Typography kind="caption">Fecha límite</Typography>
                <View style={styles.dateActions}>
                  <ActionButton
                    label={dueDate ? format(dueDate, 'EEEE d MMMM', { locale: es }) : 'Sin fecha'}
                    variant="secondary"
                    icon={<SymbolIcon ios="calendar" other="calendar_today" color={theme.accent} size={18} />}
                    onPress={() => setDatePickerVisible((shown) => !shown)}
                  />
                  {dueDate ? <ActionButton label="Quitar" variant="plain" onPress={() => setDueDate(null)} /> : null}
                </View>
                {datePickerVisible ? (
                  <DateTimePicker
                    value={dueDate ?? new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onValueChange={(_event, date) => {
                      setDueDate(date);
                      if (Platform.OS === 'android') setDatePickerVisible(false);
                    }}
                    onDismiss={() => setDatePickerVisible(false)}
                    themeVariant={theme.colorScheme}
                    accentColor={theme.accent}
                  />
                ) : null}
              </View>
              <View style={styles.field}>
                <Typography kind="caption">Prioridad</Typography>
                <View style={styles.priorities} accessibilityRole="radiogroup">
                  {priorities.map((option) => {
                    const selected = priority === option.value;
                    return (
                      <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setPriority(option.value)} style={[styles.priority, { backgroundColor: selected ? theme.accent : theme.track }]}>
                        <Typography style={{ color: selected ? theme.accentInk : theme.text, fontWeight: '600' }}>{option.label}</Typography>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={styles.field}>
                <Typography kind="caption">Notas</Typography>
                <TextInput
                  accessibilityLabel="Notas de la tarea"
                  maxLength={1000}
                  multiline
                  onChangeText={setNotes}
                  placeholder="Añade algún detalle si lo necesitas"
                  placeholderTextColor={theme.muted}
                  style={[styles.notesInput, { backgroundColor: theme.surf, color: theme.text }]}
                  textAlignVertical="top"
                  value={notes}
                />
              </View>
              <ActionButton label={task ? 'Guardar cambios' : 'Añadir tarea'} disabled={!title.trim()} onPress={save} />
              {task && onDelete ? (
                <Pressable accessibilityRole="button" onPress={onDelete} style={styles.delete}>
                  <Typography style={{ color: theme.danger, fontWeight: '700' }}>Eliminar tarea</Typography>
                </Pressable>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  keyboard: { maxHeight: '94%' },
  // flexShrink lets the sheet and its list fit inside the 94% cap, so a long form scrolls to its last button.
  sheet: { flexShrink: 1, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  scroll: { flexShrink: 1 },
  handle: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', opacity: 0.45, marginBottom: spacing.md },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  headerCopy: { flex: 1, gap: spacing.xxs },
  closeButton: { width: minTouchSize, height: minTouchSize, borderRadius: minTouchSize / 2, alignItems: 'center', justifyContent: 'center' },
  form: { gap: spacing.md, paddingBottom: spacing.xl },
  delete: { minHeight: minTouchSize, alignItems: 'center', justifyContent: 'center' },
  titleInput: { minHeight: 56, borderRadius: 16, paddingHorizontal: spacing.md, fontSize: 19, fontFamily: fonts.semibold },
  field: { gap: spacing.xs },
  goalPicker: { minHeight: 48, justifyContent: 'center', borderRadius: 14, paddingHorizontal: spacing.xs },
  dateActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  priorities: { flexDirection: 'row', gap: spacing.xs },
  priority: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notesInput: { minHeight: 84, borderRadius: radii.button, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, fontFamily: fonts.medium },
});
