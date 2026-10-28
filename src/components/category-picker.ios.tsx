import { Button, Divider, Host, HStack, Image, Menu, Section, Spacer } from '@expo/ui/swift-ui';
import { accessibilityLabel, buttonStyle, contentShape, frame, menuStyle, padding, shapes, tint } from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';
import type { CategorySelection, CategoryType } from '@/types/models';

import {
  CategoryCreatorSheet,
  getSelectionLabel,
  useCategoryOptions,
  type CategoryPickerProps,
} from './category-picker-shared';

export type { CategoryPickerProps } from './category-picker-shared';

/** Width of the invisible tap area that opens the native menu, around the pencil. */
const MENU_TAP_WIDTH = 72;


export function CategoryPicker({ value, onChange, allowAll = false, allowCreate = true, allLabel = 'Todas las categorías' }: CategoryPickerProps) {
  const theme = useTheme();
  const { subjects, projects } = useCategoryOptions();
  const [creatingType, setCreatingType] = useState<CategoryType | null>(null);
  // The native menu's tap area spans the pill's height on the right; it needs that height in points.
  const [pillHeight, setPillHeight] = useState(0);
  const measurePill = ({ nativeEvent }: LayoutChangeEvent) => setPillHeight(nativeEvent.layout.height);
  const label = getSelectionLabel(value, allLabel, subjects, projects);
  const color = value === 'all' || !value.categoryId
    ? null
    : (value.categoryType === 'subject' ? subjects : projects).find((item) => item.id === value.categoryId)?.color ?? null;

  const onCreated = (selection: CategorySelection) => {
    onChange(selection);
    setCreatingType(null);
  };

  return (
    <View style={styles.wrap}>
      {/*
        The chosen category is plain React Native text, so it changes at once; the native menu's own
        label never changes. Changing it while iOS was still closing the menu got animated with it,
        and long names took about a second to show.
      */}
      <View
        onLayout={measurePill}
        style={[
          styles.pill,
          color ? { backgroundColor: `${color}26`, borderColor: color } : { backgroundColor: theme.surf, borderColor: theme.line },
        ]}>
        <View style={styles.current}>
          <View style={[styles.dot, { backgroundColor: color ?? theme.muted }]} />
          <Typography numberOfLines={1} style={styles.currentLabel}>{label}</Typography>
        </View>
        {/*
          The native menu sits only on the right end, around the pencil: a wide, full-height tap area
          that is invisible apart from the pencil. Covering the whole pill made iOS's menu-closing
          animation run over the name.
        */}
        <Host colorScheme={theme.colorScheme} seedColor={theme.accent} alignment="center" style={styles.host}>
          <Menu
            label={(
              <HStack modifiers={[frame({ width: MENU_TAP_WIDTH, height: pillHeight }), contentShape(shapes.rectangle())]}>
                <Spacer />
                <Image systemName="pencil" size={17} color={theme.accent} modifiers={[padding({ trailing: spacing.md })]} />
              </HStack>
            )}
            // Nothing on the native menu depends on the choice, so picking never makes iOS redraw it
            // (that redraw animated together with the menu closing).
            modifiers={[menuStyle('button'), buttonStyle('plain'), accessibilityLabel('Cambiar categoría')]}>
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
      </View>
      <CategoryCreatorSheet type={creatingType} onCreated={onCreated} onClose={() => setCreatingType(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  // paddingRight leaves room for the menu's tap area on the right.
  pill: { minHeight: minTouchSize + 4, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingLeft: spacing.md, paddingRight: MENU_TAP_WIDTH, borderRadius: radii.chip + 4, borderWidth: 1 },
  host: { position: 'absolute', top: 0, right: 0, bottom: 0, width: MENU_TAP_WIDTH },
  current: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  currentLabel: { flexShrink: 1, fontSize: 16, fontWeight: '700' },
});
