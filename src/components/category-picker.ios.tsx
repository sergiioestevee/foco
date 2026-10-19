import { Button, Divider, Host, Menu, Section } from '@expo/ui/swift-ui';
import { tint } from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';
import type { CategorySelection, CategoryType } from '@/types/models';

import {
  CategoryQuickCreator,
  getSelectionLabel,
  useCategoryOptions,
  type CategoryPickerProps,
} from './category-picker-shared';

export type { CategoryPickerProps } from './category-picker-shared';

export function CategoryPicker({ value, onChange, allowAll = false, allowCreate = true, allLabel = 'Todas las categorías' }: CategoryPickerProps) {
  const theme = useTheme();
  const { subjects, projects } = useCategoryOptions();
  const [creatingType, setCreatingType] = useState<CategoryType | null>(null);
  const label = getSelectionLabel(value, allLabel, subjects, projects);

  const onCreated = (selection: CategorySelection) => {
    onChange(selection);
    setCreatingType(null);
  };

  return (
    <View style={styles.wrap}>
      <Typography kind="caption">{label}</Typography>
      <Host colorScheme={theme.colorScheme} seedColor={theme.accent} matchContents style={styles.host}>
        <Menu label={label} systemImage="tag">
          {allowAll ? <Button label={allLabel} systemImage="line.3.horizontal.decrease.circle" onPress={() => onChange('all')} /> : null}
          <Button label="Sin categoría" systemImage="tag.slash" onPress={() => onChange({ categoryId: null, categoryType: null })} />
          {subjects.length ? (
            <Section title="Asignaturas">
              {subjects.map((subject) => (
                <Button key={subject.id} label={subject.name} systemImage={(subject.icon || 'book.closed') as SFSymbol} onPress={() => onChange({ categoryId: subject.id, categoryType: 'subject' })} modifiers={[tint(subject.color)]} />
              ))}
            </Section>
          ) : null}
          {projects.length ? (
            <Section title="Proyectos personales">
              {projects.map((project) => (
                <Button key={project.id} label={project.name} systemImage={(project.icon || 'folder') as SFSymbol} onPress={() => onChange({ categoryId: project.id, categoryType: 'project' })} modifiers={[tint(project.color)]} />
              ))}
            </Section>
          ) : null}
          {allowCreate ? <Divider /> : null}
          {allowCreate ? <Button label="Nueva asignatura…" systemImage="plus" onPress={() => setCreatingType('subject')} /> : null}
          {allowCreate ? <Button label="Nuevo proyecto…" systemImage="plus" onPress={() => setCreatingType('project')} /> : null}
        </Menu>
      </Host>
      {creatingType ? (
        <View style={[styles.createCard, { backgroundColor: theme.surf }]}>
          <CategoryQuickCreator type={creatingType} onCreated={onCreated} onCancel={() => setCreatingType(null)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  host: { minHeight: 44, alignSelf: 'flex-start' },
  createCard: { borderRadius: 18, padding: spacing.md },
});
