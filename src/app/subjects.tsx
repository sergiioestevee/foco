import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { AppScreen } from '@/components/app-screen';
import { ScreenHeader } from '@/components/screen-header';
import { Surface } from '@/components/surface';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { fonts } from '@/theme/fonts';
import { categoryColors, radii, spacing } from '@/theme/tokens';


export default function SubjectsScreen() {
  const theme = useTheme();
  const subjectItems = useFocoStore((state) => state.subjects);
  const subjects = useMemo(() => [...subjectItems].sort((a, b) => a.order - b.order), [subjectItems]);
  const tasks = useFocoStore((state) => state.tasks);
  const addSubject = useFocoStore((state) => state.addSubject);
  const updateSubject = useFocoStore((state) => state.updateSubject);
  const reorderSubjects = useFocoStore((state) => state.reorderSubjects);
  const deleteSubject = useFocoStore((state) => state.deleteSubject);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(categoryColors[0]);
  const editingSubject = subjects.find((subject) => subject.id === editingId);

  const openEditor = (id?: string) => {
    const subject = id ? subjects.find((item) => item.id === id) : undefined;
    setEditingId(subject?.id ?? null);
    setName(subject?.name ?? '');
    setColor(subject?.color ?? categoryColors[0]);
    setEditorVisible(true);
  };

  const saveSubject = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (editingSubject) updateSubject(editingSubject.id, { name: trimmedName, color });
    else addSubject({ name: trimmedName, color, icon: 'book.closed', order: subjects.length });
    setEditorVisible(false);
  };

  const removeSubject = (id: string, subjectName: string) => {
    const taskCount = tasks.filter((task) => task.categoryType === 'subject' && task.categoryId === id).length;
    const deleteOptions = taskCount > 0
      ? [
          { text: 'Conservar tareas', onPress: () => deleteSubject(id, false) },
          { text: 'Borrar tareas', style: 'destructive' as const, onPress: () => deleteSubject(id, true) },
        ]
      : [{ text: 'Eliminar', style: 'destructive' as const, onPress: () => deleteSubject(id, false) }];
    Alert.alert(
      `Eliminar ${subjectName}`,
      taskCount > 0 ? `¿Qué quieres hacer con sus ${taskCount} tareas?` : 'La asignatura se quitará de tus categorías.',
      [{ text: 'Cancelar', style: 'cancel' }, ...deleteOptions],
    );
  };

  const moveSubject = (id: string, direction: -1 | 1) => {
    const currentIndex = subjects.findIndex((subject) => subject.id === id);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= subjects.length) return;
    const reordered = [...subjects];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    reorderSubjects(reordered.map((subject) => subject.id));
  };

  return (
    <>
      <AppScreen>
        <ScreenHeader title="Mis asignaturas" subtitle="Tus categorías de estudio.">
          <ActionButton label="Añadir" onPress={() => openEditor()} />
        </ScreenHeader>
        {subjects.length ? subjects.map((subject, index) => (
          <Surface key={subject.id} style={styles.subjectCard}>
            <View style={styles.subjectInfo}>
              <View style={[styles.subjectDot, { backgroundColor: subject.color }]} />
              <View style={styles.subjectCopy}>
                <Typography kind="heading" style={styles.subjectName}>{subject.name}</Typography>
                <Typography kind="caption">{tasks.filter((task) => task.categoryType === 'subject' && task.categoryId === subject.id).length} tareas</Typography>
              </View>
            </View>
            <View style={styles.controls}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Subir ${subject.name}`} disabled={index === 0} onPress={() => moveSubject(subject.id, -1)} style={styles.iconButton}>
                <SymbolIcon ios="chevron.up" other="keyboard_arrow_up" color={index === 0 ? theme.line : theme.muted} size={18} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Bajar ${subject.name}`} disabled={index === subjects.length - 1} onPress={() => moveSubject(subject.id, 1)} style={styles.iconButton}>
                <SymbolIcon ios="chevron.down" other="keyboard_arrow_down" color={index === subjects.length - 1 ? theme.line : theme.muted} size={18} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${subject.name}`} onPress={() => openEditor(subject.id)} style={styles.iconButton}>
                <SymbolIcon ios="pencil" other="edit" color={theme.accent} size={18} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${subject.name}`} onPress={() => removeSubject(subject.id, subject.name)} style={styles.iconButton}>
                <SymbolIcon ios="trash" other="delete" color={theme.danger} size={18} />
              </Pressable>
            </View>
          </Surface>
        )) : (
          <Surface style={styles.empty}>
            <Typography kind="heading">Sin asignaturas</Typography>
            <Typography kind="secondary">Añade una asignatura para clasificar tus tareas de estudio.</Typography>
          </Surface>
        )}
      </AppScreen>

      <Modal animationType="slide" onRequestClose={() => setEditorVisible(false)} presentationStyle="pageSheet" visible={editorVisible}>
        <AppScreen>
          <ScreenHeader title={editingSubject ? 'Editar asignatura' : 'Nueva asignatura'}>
            <ActionButton label="Cerrar" variant="plain" onPress={() => setEditorVisible(false)} />
          </ScreenHeader>
          <Surface style={styles.form}>
            <Typography kind="caption">Nombre</Typography>
            <TextInput
              accessibilityLabel="Nombre de la asignatura"
              autoFocus
              maxLength={50}
              onChangeText={setName}
              placeholder="Por ejemplo, Matemáticas"
              placeholderTextColor={theme.muted}
              returnKeyType="done"
              style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.line, color: theme.text }]}
              value={name}
            />
            <Typography kind="caption">Color</Typography>
            <View style={styles.colorChoices}>
              {categoryColors.map((option) => (
                <Pressable key={option} accessibilityRole="radio" accessibilityLabel={`Color ${option}`} accessibilityState={{ selected: color === option }} onPress={() => setColor(option)} style={[styles.colorChoice, { backgroundColor: option, borderColor: color === option ? theme.text : 'transparent' }]} />
              ))}
            </View>
            <ActionButton label={editingSubject ? 'Guardar cambios' : 'Crear asignatura'} disabled={!name.trim()} onPress={saveSubject} />
          </Surface>
        </AppScreen>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  subjectCard: { gap: spacing.sm, marginBottom: spacing.sm, padding: spacing.md },
  subjectInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  subjectDot: { width: 15, height: 15, borderRadius: 8, marginTop: 6 },
  subjectCopy: { flex: 1, flexShrink: 1, minWidth: 0, gap: spacing.xxs },
  subjectName: { flexShrink: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: spacing.xxs },
  iconButton: { minWidth: 34, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  empty: { gap: spacing.xs },
  form: { gap: spacing.md },
  input: { minHeight: 50, borderWidth: 1, borderRadius: radii.button, paddingHorizontal: spacing.md, fontSize: 17, fontFamily: fonts.medium },
  colorChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  colorChoice: { width: 34, height: 34, borderRadius: 17, borderWidth: 3 },
});
