import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useImperativeHandle, useMemo, useState, type Ref } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { AppScreen } from '@/components/app-screen';
import { CategoryPicker } from '@/components/category-picker';
import { ScreenHeader } from '@/components/screen-header';
import { Surface } from '@/components/surface';
import { Typography } from '@/components/typography';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { fonts } from '@/theme/fonts';
import { categoryColors, minTouchSize, radii, spacing } from '@/theme/tokens';
import type { CreateHandle } from '@/types/create-handle';
import type { CategorySelection, Goal, GoalStatus, PersonalProject, ProjectStatus } from '@/types/models';

import { ProgressCard } from './progress-card';

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'finished', label: 'Terminado' },
];
const goalStatusOptions: { value: GoalStatus; label: string }[] = [
  { value: 'inProgress', label: 'En curso' },
  { value: 'paused', label: 'Pausado' },
  { value: 'achieved', label: 'Logrado' },
];

/** Metas segment of the Tareas tab: goals and personal projects, each with its progress ring. */
export function GoalsView({ ref }: { ref?: Ref<CreateHandle<'goal' | 'project'>> }) {
  const theme = useTheme();
  const subjectItems = useFocoStore((state) => state.subjects);
  const subjects = useMemo(() => [...subjectItems].sort((a, b) => a.order - b.order), [subjectItems]);
  const projects = useFocoStore((state) => state.projects);
  const goals = useFocoStore((state) => state.goals);
  const tasks = useFocoStore((state) => state.tasks);
  const addProject = useFocoStore((state) => state.addProject);
  const updateProject = useFocoStore((state) => state.updateProject);
  const deleteProject = useFocoStore((state) => state.deleteProject);
  const addGoal = useFocoStore((state) => state.addGoal);
  const updateGoal = useFocoStore((state) => state.updateGoal);
  const deleteGoal = useFocoStore((state) => state.deleteGoal);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(categoryColors[0]);
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [goalEditorVisible, setGoalEditorVisible] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalCategory, setGoalCategory] = useState<CategorySelection>({ categoryId: null, categoryType: null });
  const [goalStatus, setGoalStatus] = useState<GoalStatus>('inProgress');
  const [goalTargetDate, setGoalTargetDate] = useState<Date | null>(null);
  const [goalDatePickerVisible, setGoalDatePickerVisible] = useState(false);
  const editingProject = projects.find((project) => project.id === editingId);
  const editingGoal = goals.find((goal) => goal.id === editingGoalId);

  const openEditor = (project?: PersonalProject) => {
    setEditingId(project?.id ?? null);
    setName(project?.name ?? '');
    setDescription(project?.description ?? '');
    setColor(project?.color ?? categoryColors[0]);
    setStatus(project?.status ?? 'active');
    setTargetDate(project?.targetDate ? new Date(project.targetDate) : null);
    setDatePickerVisible(false);
    setEditorVisible(true);
  };

  const saveProject = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const changes = {
      name: trimmedName,
      description: description.trim(),
      color,
      status,
      targetDate: targetDate?.toISOString() ?? null,
    };
    if (editingProject) updateProject(editingProject.id, changes);
    else addProject({ ...changes, icon: 'folder' });
    setEditorVisible(false);
  };

  const openGoalEditor = (goal?: Goal) => {
    setEditingGoalId(goal?.id ?? null);
    setGoalTitle(goal?.title ?? '');
    setGoalDescription(goal?.description ?? '');
    setGoalCategory(goal?.categoryId && goal.categoryType
      ? { categoryId: goal.categoryId, categoryType: goal.categoryType }
      : { categoryId: null, categoryType: null });
    setGoalStatus(goal?.status ?? 'inProgress');
    setGoalTargetDate(goal?.targetDate ? new Date(goal.targetDate) : null);
    setGoalDatePickerVisible(false);
    setGoalEditorVisible(true);
  };

  const saveGoal = () => {
    const title = goalTitle.trim();
    if (!title) return;
    const changes = {
      title,
      description: goalDescription.trim(),
      targetDate: goalTargetDate?.toISOString() ?? null,
      status: goalStatus,
      ...goalCategory,
    };
    if (editingGoal) updateGoal(editingGoal.id, changes);
    else addGoal({ ...changes, taskIds: [] });
    setGoalEditorVisible(false);
  };

  const removeGoal = (goal: Goal) => {
    const linkedTaskCount = tasks.filter((task) => task.goalId === goal.id).length;
    Alert.alert(
      `Eliminar ${goal.title}`,
      linkedTaskCount ? `Se conservarán sus ${linkedTaskCount} tareas, pero quedarán sin objetivo.` : 'El objetivo se quitará de tu lista.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteGoal(goal.id) },
      ],
    );
  };

  const removeProject = (project: PersonalProject) => {
    const taskCount = tasks.filter((task) => task.categoryType === 'project' && task.categoryId === project.id).length;
    const deleteOptions = taskCount > 0
      ? [
          { text: 'Conservar tareas', onPress: () => deleteProject(project.id, false) },
          { text: 'Borrar tareas', style: 'destructive' as const, onPress: () => deleteProject(project.id, true) },
        ]
      : [{ text: 'Eliminar', style: 'destructive' as const, onPress: () => deleteProject(project.id, false) }];
    Alert.alert(
      `Eliminar ${project.name}`,
      taskCount > 0 ? `¿Qué quieres hacer con sus ${taskCount} tareas?` : 'El proyecto se quitará de tus categorías.',
      [{ text: 'Cancelar', style: 'cancel' }, ...deleteOptions],
    );
  };

  useImperativeHandle(ref, () => ({
    create: (kind) => (kind === 'project' ? openEditor() : openGoalEditor()),
  }));

  return (
    <>
      <View style={styles.sections}>
        <View style={styles.list}>
          <Typography kind="heading">Objetivos</Typography>
          {goals.length ? goals.map((goal) => {
            const goalTasks = tasks.filter((task) => task.goalId === goal.id);
            const target = goal.targetDate ? new Date(goal.targetDate) : null;
            const category = goal.categoryType === 'subject'
              ? subjects.find((subject) => subject.id === goal.categoryId)
              : goal.categoryType === 'project'
                ? projects.find((project) => project.id === goal.categoryId)
                : undefined;
            return (
              <ProgressCard
                key={goal.id}
                title={goal.title}
                meta={[
                  goalStatusOptions.find((option) => option.value === goal.status)?.label,
                  category?.name,
                  target && isValid(target) ? `Meta ${format(target, 'd MMM', { locale: es })}` : null,
                ]}
                description={goal.description}
                completed={goalTasks.filter((task) => task.completed).length}
                total={goalTasks.length}
                onPress={() => openGoalEditor(goal)}
                tasksLink={{ pathname: '/tasks', params: { goalId: goal.id } }}
              />
            );
          }) : (
            <Surface style={styles.empty}>
              <Typography kind="secondary">Define lo que quieres conseguir, como preparar un examen o mejorar en una asignatura, y vincula tareas para seguir tu avance.</Typography>
              <ActionButton label="Crear objetivo" variant="secondary" onPress={() => openGoalEditor()} />
            </Surface>
          )}
        </View>

        <View style={styles.list}>
          <Typography kind="heading">Proyectos</Typography>
          {projects.length ? projects.map((project) => {
            const projectTasks = tasks.filter((task) => task.categoryType === 'project' && task.categoryId === project.id);
            const target = project.targetDate ? new Date(project.targetDate) : null;
            return (
              <ProgressCard
                key={project.id}
                title={project.name}
                color={project.color}
                meta={[
                  statusOptions.find((option) => option.value === project.status)?.label,
                  target && isValid(target) ? `Meta ${format(target, 'd MMM', { locale: es })}` : null,
                ]}
                description={project.description}
                completed={projectTasks.filter((task) => task.completed).length}
                total={projectTasks.length}
                onPress={() => openEditor(project)}
                tasksLink={{ pathname: '/tasks', params: { categoryId: project.id, categoryType: 'project' } }}
              />
            );
          }) : (
            <Surface style={styles.empty}>
              <Typography kind="secondary">Organiza aquí una idea, una meta personal o algo que quieras aprender.</Typography>
              <ActionButton label="Crear proyecto" variant="secondary" onPress={() => openEditor()} />
            </Surface>
          )}
        </View>
      </View>

      <Modal animationType="slide" onRequestClose={() => setEditorVisible(false)} presentationStyle="pageSheet" visible={editorVisible}>
        <AppScreen>
          <ScreenHeader title={editingProject ? 'Editar proyecto' : 'Nuevo proyecto'}>
            <ActionButton label="Cerrar" variant="plain" onPress={() => setEditorVisible(false)} />
          </ScreenHeader>
          <Surface style={styles.form}>
            <Typography kind="caption">Nombre</Typography>
            <TextInput accessibilityLabel="Nombre del proyecto" maxLength={80} onChangeText={setName} placeholder="Por ejemplo, aprender a programar" placeholderTextColor={theme.muted} style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.line, color: theme.text }]} value={name} />
            <Typography kind="caption">Descripción</Typography>
            <TextInput accessibilityLabel="Descripción del proyecto" multiline maxLength={240} onChangeText={setDescription} placeholder="¿Qué quieres conseguir?" placeholderTextColor={theme.muted} style={[styles.input, styles.multiline, { backgroundColor: theme.bg, borderColor: theme.line, color: theme.text }]} value={description} />
            <Typography kind="caption">Color</Typography>
            <View style={styles.colorChoices}>
              {categoryColors.map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityLabel={`Color ${option}`} accessibilityState={{ selected: color === option }} onPress={() => setColor(option)} style={[styles.colorChoice, { backgroundColor: option, borderColor: color === option ? theme.text : 'transparent' }]} />)}
            </View>
            <Typography kind="caption">Estado</Typography>
            <View style={styles.statusChoices} accessibilityRole="radiogroup">
              {statusOptions.map((option) => {
                const selected = status === option.value;
                return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setStatus(option.value)} style={[styles.statusChoice, { backgroundColor: selected ? theme.accent : theme.track }]}><Typography style={{ color: selected ? theme.accentInk : theme.text, fontWeight: '600' }}>{option.label}</Typography></Pressable>;
              })}
            </View>
            <View style={styles.dateRow}>
              <Typography kind="caption">Fecha meta</Typography>
              <ActionButton label={targetDate ? format(targetDate, 'd MMMM yyyy', { locale: es }) : 'Sin fecha'} variant="secondary" onPress={() => setDatePickerVisible((visible) => !visible)} />
              {targetDate ? <ActionButton label="Quitar" variant="plain" onPress={() => setTargetDate(null)} /> : null}
            </View>
            {datePickerVisible ? <DateTimePicker value={targetDate ?? new Date()} mode="date" display={Platform.OS === 'ios' ? 'compact' : 'default'} onValueChange={(_event, date) => { setTargetDate(date); if (Platform.OS === 'android') setDatePickerVisible(false); }} onDismiss={() => setDatePickerVisible(false)} themeVariant={theme.colorScheme} accentColor={theme.accent} /> : null}
            <ActionButton label={editingProject ? 'Guardar cambios' : 'Crear proyecto'} disabled={!name.trim()} onPress={saveProject} />
            {editingProject ? (
              <Pressable accessibilityRole="button" onPress={() => { setEditorVisible(false); removeProject(editingProject); }} style={styles.delete}>
                <Typography style={{ color: theme.danger, fontWeight: '700' }}>Eliminar proyecto</Typography>
              </Pressable>
            ) : null}
          </Surface>
        </AppScreen>
      </Modal>

      <Modal animationType="slide" onRequestClose={() => setGoalEditorVisible(false)} presentationStyle="pageSheet" visible={goalEditorVisible}>
        <AppScreen>
          <ScreenHeader title={editingGoal ? 'Editar objetivo' : 'Nuevo objetivo'}>
            <ActionButton label="Cerrar" variant="plain" onPress={() => setGoalEditorVisible(false)} />
          </ScreenHeader>
          <Surface style={styles.form}>
            <Typography kind="caption">Título</Typography>
            <TextInput
              accessibilityLabel="Título del objetivo"
              autoFocus
              maxLength={100}
              onChangeText={setGoalTitle}
              placeholder="Por ejemplo, preparar el examen de matemáticas"
              placeholderTextColor={theme.muted}
              style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.line, color: theme.text }]}
              value={goalTitle}
            />
            <Typography kind="caption">Descripción</Typography>
            <TextInput
              accessibilityLabel="Descripción del objetivo"
              multiline
              maxLength={300}
              onChangeText={setGoalDescription}
              placeholder="¿Qué quieres conseguir?"
              placeholderTextColor={theme.muted}
              style={[styles.input, styles.multiline, { backgroundColor: theme.bg, borderColor: theme.line, color: theme.text }]}
              value={goalDescription}
            />
            <CategoryPicker value={goalCategory} onChange={(value) => { if (value !== 'all') setGoalCategory(value); }} />
            <Typography kind="caption">Estado</Typography>
            <View style={styles.statusChoices} accessibilityRole="radiogroup">
              {goalStatusOptions.map((option) => {
                const selected = goalStatus === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setGoalStatus(option.value)}
                    style={[styles.statusChoice, { backgroundColor: selected ? theme.accent : theme.track }]}>
                    <Typography style={{ color: selected ? theme.accentInk : theme.text, fontWeight: '600' }}>{option.label}</Typography>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.dateRow}>
              <Typography kind="caption">Fecha meta</Typography>
              <ActionButton
                label={goalTargetDate ? format(goalTargetDate, 'd MMMM yyyy', { locale: es }) : 'Sin fecha'}
                variant="secondary"
                onPress={() => setGoalDatePickerVisible((visible) => !visible)}
              />
              {goalTargetDate ? <ActionButton label="Quitar" variant="plain" onPress={() => setGoalTargetDate(null)} /> : null}
            </View>
            {goalDatePickerVisible ? (
              <DateTimePicker
                value={goalTargetDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onValueChange={(_event, date) => {
                  setGoalTargetDate(date);
                  if (Platform.OS === 'android') setGoalDatePickerVisible(false);
                }}
                onDismiss={() => setGoalDatePickerVisible(false)}
                themeVariant={theme.colorScheme}
                accentColor={theme.accent}
              />
            ) : null}
            <ActionButton label={editingGoal ? 'Guardar cambios' : 'Crear objetivo'} disabled={!goalTitle.trim()} onPress={saveGoal} />
            {editingGoal ? (
              <Pressable accessibilityRole="button" onPress={() => { setGoalEditorVisible(false); removeGoal(editingGoal); }} style={styles.delete}>
                <Typography style={{ color: theme.danger, fontWeight: '700' }}>Eliminar objetivo</Typography>
              </Pressable>
            ) : null}
          </Surface>
        </AppScreen>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sections: { gap: spacing.xl },
  list: { gap: spacing.sm },
  delete: { minHeight: minTouchSize, alignItems: 'center', justifyContent: 'center' },
  empty: { gap: spacing.sm },
  form: { gap: spacing.md },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radii.button, paddingHorizontal: spacing.md, fontSize: 16, fontFamily: fonts.medium },
  multiline: { minHeight: 88, paddingTop: spacing.sm, textAlignVertical: 'top' },
  colorChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  colorChoice: { width: 32, height: 32, borderRadius: 16, borderWidth: 3 },
  statusChoices: { flexDirection: 'row', gap: spacing.xs },
  statusChoice: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
});
