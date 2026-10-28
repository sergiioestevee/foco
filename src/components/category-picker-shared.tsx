import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { fonts } from '@/theme/fonts';
import { categoryColors, minTouchSize, radii, spacing } from '@/theme/tokens';
import type { CategorySelection, CategoryType } from '@/types/models';

export type PickerValue = CategorySelection | 'all';

export type CategoryPickerProps = {
  value: PickerValue;
  onChange: (value: PickerValue) => void;
  allowAll?: boolean;
  allowCreate?: boolean;
  allLabel?: string;
};

export function useCategoryOptions() {
  const subjects = useFocoStore((state) => state.subjects);
  const projects = useFocoStore((state) => state.projects);
  return { subjects: [...subjects].sort((a, b) => a.order - b.order), projects };
}

export function selectionKey(value: PickerValue): string {
  if (value === 'all') return 'all';
  return value.categoryType ? `${value.categoryType}:${value.categoryId}` : 'none';
}

export function selectionFromKey(key: string): PickerValue {
  if (key === 'all') return 'all';
  if (key === 'none') return { categoryId: null, categoryType: null };
  const [categoryType, categoryId] = key.split(':');
  if ((categoryType === 'subject' || categoryType === 'project') && categoryId) {
    return { categoryType, categoryId };
  }
  return { categoryId: null, categoryType: null };
}

export function getSelectionLabel(value: PickerValue, allLabel: string, subjects: ReturnType<typeof useCategoryOptions>['subjects'], projects: ReturnType<typeof useCategoryOptions>['projects']) {
  if (value === 'all') return allLabel;
  if (!value.categoryId || !value.categoryType) return 'Sin categoría';
  const collection = value.categoryType === 'subject' ? subjects : projects;
  return collection.find((item) => item.id === value.categoryId)?.name ?? 'Sin categoría';
}

/**
 * «Nueva asignatura» / «Nuevo proyecto» as its own bottom sheet (like «Nueva rutina»), opened from a
 * category picker on top of the form being edited. The new category comes back selected.
 */
export function CategoryCreatorSheet({
  type,
  onCreated,
  onClose,
}: {
  /** null keeps the sheet closed. */
  type: CategoryType | null;
  onCreated: (selection: CategorySelection) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const subjects = useFocoStore((state) => state.subjects);
  const addSubject = useFocoStore((state) => state.addSubject);
  const addProject = useFocoStore((state) => state.addProject);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(categoryColors[0]);
  // The last type asked for, kept while the sheet slides away so its title doesn't flip.
  const [shownType, setShownType] = useState<CategoryType>(type ?? 'subject');
  if (type && type !== shownType) setShownType(type);
  const isSubject = shownType === 'subject';
  const noun = isSubject ? 'asignatura' : 'proyecto';

  const close = () => {
    setName('');
    setColor(categoryColors[0]);
    onClose();
  };

  const create = () => {
    const trimmedName = name.trim();
    if (!trimmedName || !type) return;
    const id = isSubject
      ? addSubject({ name: trimmedName, color, icon: 'book.closed', order: subjects.length })
      : addProject({ name: trimmedName, description: '', color, icon: 'folder', targetDate: null, status: 'active' });
    onCreated({ categoryId: id, categoryType: type });
    setName('');
    setColor(categoryColors[0]);
  };

  return (
    <Modal animationType="slide" onRequestClose={close} transparent visible={type !== null}>
      <View style={[styles.overlay, { backgroundColor: theme.scrim }]}>
        <Pressable accessibilityLabel="Cerrar" onPress={close} style={StyleSheet.absoluteFill} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: theme.bg }]}>
            <View style={[styles.handle, { backgroundColor: theme.muted }]} />
            <View style={styles.header}>
              <Typography kind="heading" style={styles.headerTitle}>{isSubject ? 'Nueva asignatura' : 'Nuevo proyecto'}</Typography>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={close} style={[styles.close, { backgroundColor: theme.track }]}>
                <SymbolIcon ios="xmark" other="close" color={theme.muted} size={20} />
              </Pressable>
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <Typography kind="secondary" style={styles.fieldLabel}>Nombre</Typography>
                <TextInput
                  accessibilityLabel={`Nombre ${isSubject ? 'de la asignatura' : 'del proyecto'}`}
                  autoFocus
                  maxLength={50}
                  onChangeText={setName}
                  onSubmitEditing={create}
                  placeholder={isSubject ? 'Ej.: Historia' : 'Ej.: Mi portfolio'}
                  placeholderTextColor={theme.muted}
                  returnKeyType="done"
                  style={[styles.input, { backgroundColor: theme.surf, borderColor: theme.line, color: theme.text }]}
                  value={name}
                />
              </View>

              <View style={styles.field}>
                <Typography kind="secondary" style={styles.fieldLabel}>Color</Typography>
                <View style={styles.colors} accessibilityRole="radiogroup">
                  {categoryColors.map((option, index) => (
                    <Pressable
                      key={option}
                      accessibilityRole="radio"
                      accessibilityLabel={`Color ${index + 1}`}
                      accessibilityState={{ selected: color === option }}
                      onPress={() => setColor(option)}
                      style={[styles.colorRing, { borderColor: color === option ? option : 'transparent' }]}>
                      <View style={[styles.colorDot, { backgroundColor: option }]} />
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* How it will look in the lists. */}
              <View style={[styles.preview, { backgroundColor: `${color}2E`, borderColor: color }]}>
                <View style={[styles.previewDot, { backgroundColor: color }]} />
                <Typography numberOfLines={1} style={styles.previewText}>{name.trim() || (isSubject ? 'Tu asignatura' : 'Tu proyecto')}</Typography>
              </View>
            </View>

            <View style={[styles.footer, { borderTopColor: theme.line }]}>
              <ActionButton label={`Crear ${noun}`} onPress={create} disabled={!name.trim()} style={!name.trim() && styles.disabled} />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function useCategoryPickerValueLabel(value: PickerValue, allLabel = 'Todas las categorías') {
  const { subjects, projects } = useCategoryOptions();
  return getSelectionLabel(value, allLabel, subjects, projects);
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  handle: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', opacity: 0.45, marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  headerTitle: { flex: 1 },
  close: { width: minTouchSize, height: minTouchSize, borderRadius: minTouchSize / 2, alignItems: 'center', justifyContent: 'center' },
  form: { gap: spacing.lg, paddingBottom: spacing.lg },
  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 14, fontWeight: '600' },
  input: { minHeight: 52, borderWidth: 1, borderRadius: radii.button, paddingHorizontal: spacing.md, fontSize: 17, fontFamily: fonts.medium },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  colorRing: { width: minTouchSize, height: minTouchSize, borderRadius: minTouchSize / 2, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  preview: { alignSelf: 'flex-start', maxWidth: '100%', minHeight: minTouchSize, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.chip + 4, borderWidth: 1 },
  previewDot: { width: 8, height: 8, borderRadius: 4 },
  previewText: { flexShrink: 1, fontWeight: '700' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  disabled: { opacity: 0.5 },
});
