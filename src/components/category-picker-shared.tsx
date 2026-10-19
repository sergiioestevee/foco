import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { Typography } from '@/components/typography';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { fonts } from '@/theme/fonts';
import { categoryColors, radii, spacing } from '@/theme/tokens';
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

export function CategoryQuickCreator({
  type,
  onCreated,
  onCancel,
}: {
  type: CategoryType;
  onCreated: (selection: CategorySelection) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const subjects = useFocoStore((state) => state.subjects);
  const addSubject = useFocoStore((state) => state.addSubject);
  const addProject = useFocoStore((state) => state.addProject);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(categoryColors[0]);

  const create = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const id = type === 'subject'
      ? addSubject({ name: trimmedName, color, icon: 'book.closed', order: subjects.length })
      : addProject({ name: trimmedName, description: '', color, icon: 'folder', targetDate: null, status: 'active' });
    onCreated({ categoryId: id, categoryType: type });
  };

  return (
    <View style={[styles.quickCreate, { borderColor: theme.line }]}>
      <Typography kind="caption">Nueva {type === 'subject' ? 'asignatura' : 'proyecto'}</Typography>
      <TextInput
        accessibilityLabel={`Nombre de ${type === 'subject' ? 'la asignatura' : 'el proyecto'}`}
        autoFocus
        maxLength={50}
        onChangeText={setName}
        onSubmitEditing={create}
        placeholder="Nombre"
        placeholderTextColor={theme.muted}
        returnKeyType="done"
        style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.line, color: theme.text }]}
        value={name}
      />
      <View style={styles.colors} accessibilityLabel="Color">
        {categoryColors.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityLabel={`Color ${option}`}
            accessibilityState={{ selected: color === option }}
            onPress={() => setColor(option)}
            style={[styles.colorChoice, { backgroundColor: option, borderColor: color === option ? theme.text : 'transparent' }]}
          />
        ))}
      </View>
      <View style={styles.actions}>
        <ActionButton label="Cancelar" variant="plain" onPress={onCancel} style={styles.action} />
        <ActionButton label="Crear" onPress={create} disabled={!name.trim()} style={styles.action} />
      </View>
    </View>
  );
}

export function useCategoryPickerValueLabel(value: PickerValue, allLabel = 'Todas las categorías') {
  const { subjects, projects } = useCategoryOptions();
  return getSelectionLabel(value, allLabel, subjects, projects);
}

const styles = StyleSheet.create({
  quickCreate: { gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.xs, paddingTop: spacing.md },
  input: { minHeight: 46, borderWidth: 1, borderRadius: radii.button, paddingHorizontal: spacing.md, fontSize: 16, fontFamily: fonts.medium },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  colorChoice: { width: 26, height: 26, borderRadius: 13, borderWidth: 2 },
  actions: { flexDirection: 'row', gap: spacing.xs },
  action: { flex: 1 },
});
