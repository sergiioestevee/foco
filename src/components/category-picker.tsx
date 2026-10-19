import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Surface } from '@/components/surface';
import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';
import type { CategorySelection, CategoryType } from '@/types/models';

import {
  CategoryQuickCreator,
  selectionFromKey,
  selectionKey,
  useCategoryOptions,
  useCategoryPickerValueLabel,
  type CategoryPickerProps,
} from './category-picker-shared';

export type { CategoryPickerProps } from './category-picker-shared';

export function CategoryPicker({ value, onChange, allowAll = false, allowCreate = true, allLabel = 'Todas las categorías' }: CategoryPickerProps) {
  const theme = useTheme();
  const { subjects, projects } = useCategoryOptions();
  const label = useCategoryPickerValueLabel(value, allLabel);
  const [creatingType, setCreatingType] = useState<CategoryType | null>(null);
  const selectedKey = selectionKey(value);

  const handleValueChange = (nextKey: string) => {
    if (nextKey === 'create-subject') return setCreatingType('subject');
    if (nextKey === 'create-project') return setCreatingType('project');
    onChange(selectionFromKey(nextKey));
  };

  const onCreated = (selection: CategorySelection) => {
    onChange(selection);
    setCreatingType(null);
  };

  return (
    <View style={styles.wrap}>
      <Typography kind="caption">{label}</Typography>
      <View style={[styles.pickerWrap, { backgroundColor: theme.track }]}>
        <Picker
          accessibilityLabel="Seleccionar categoría"
          dropdownIconColor={theme.muted}
          onValueChange={(itemValue) => handleValueChange(String(itemValue))}
          selectedValue={selectedKey}
          style={{ color: theme.text }}>
          {allowAll ? <Picker.Item label={allLabel} value="all" /> : null}
          <Picker.Item label="Sin categoría" value="none" />
          {subjects.length > 0 ? <Picker.Item label="— Asignaturas —" value="subject-heading" enabled={false} /> : null}
          {subjects.map((subject) => <Picker.Item key={subject.id} label={`●  ${subject.name}`} value={`subject:${subject.id}`} color={subject.color} />)}
          {projects.length > 0 ? <Picker.Item label="— Proyectos personales —" value="project-heading" enabled={false} /> : null}
          {projects.map((project) => <Picker.Item key={project.id} label={`●  ${project.name}`} value={`project:${project.id}`} color={project.color} />)}
          {allowCreate ? <Picker.Item label="＋  Nueva asignatura…" value="create-subject" /> : null}
          {allowCreate ? <Picker.Item label="＋  Nuevo proyecto…" value="create-project" /> : null}
        </Picker>
      </View>
      {creatingType ? (
        <Surface inset style={{ padding: spacing.md }}>
          <CategoryQuickCreator type={creatingType} onCreated={onCreated} onCancel={() => setCreatingType(null)} />
        </Surface>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  pickerWrap: { minHeight: 48, justifyContent: 'center', borderRadius: 14, paddingHorizontal: spacing.xs },
});
