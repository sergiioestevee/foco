import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppScreen } from '@/components/app-screen';
import { CategoryPicker } from '@/components/category-picker';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl } from '@/components/segmented-control';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { ExamsView } from '@/features/exams/exams-view';
import { GoalsView } from '@/features/goals/goals-view';
import { TaskFormSheet, type TaskDraft } from '@/features/tasks/task-form-sheet';
import { TaskRow } from '@/features/tasks/task-row';
import { isTaskOverdue, isTaskDueToday, sortTasksByDueDateAndPriority } from '@/features/tasks/task-date-utils';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';
import type { CategorySelection, Task } from '@/types/models';

type TaskFilter = CategorySelection | 'all';
type TasksTabView = 'tasks' | 'exams' | 'goals' | 'projects';

const viewOptions = [
  { value: 'tasks', label: 'Tareas' },
  { value: 'exams', label: 'Exámenes' },
  { value: 'goals', label: 'Objetivos' },
  { value: 'projects', label: 'Proyectos' },
] as const;

function matchesCategory(task: Task, filter: TaskFilter): boolean {
  if (filter === 'all') return true;
  return task.categoryId === filter.categoryId && task.categoryType === filter.categoryType;
}

export default function TasksScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarClearance = Platform.OS === 'ios' ? 56 : Platform.OS === 'android' ? 8 : 0;
  const fabBottom = insets.bottom + spacing.lg + tabBarClearance;
  const params = useLocalSearchParams<{ categoryId?: string; categoryType?: string; goalId?: string; view?: string }>();
  const tasks = useFocoStore((state) => state.tasks);
  const subjects = useFocoStore((state) => state.subjects);
  const projects = useFocoStore((state) => state.projects);
  const addTask = useFocoStore((state) => state.addTask);
  const updateTask = useFocoStore((state) => state.updateTask);
  const toggleTaskCompleted = useFocoStore((state) => state.toggleTaskCompleted);
  const deleteTask = useFocoStore((state) => state.deleteTask);
  const routeFilter: TaskFilter = typeof params.categoryId === 'string'
    && (params.categoryType === 'subject' || params.categoryType === 'project')
    ? { categoryId: params.categoryId, categoryType: params.categoryType }
    : 'all';
  const routeKey = `${params.categoryType ?? ''}:${params.categoryId ?? ''}`;
  const routeView: TasksTabView = params.view === 'exams' || params.view === 'goals' || params.view === 'projects' ? params.view : 'tasks';
  const viewRouteKey = `${routeKey}:${params.goalId ?? ''}:${params.view ?? ''}`;
  const [viewState, setViewState] = useState<{ routeKey: string; value: TasksTabView }>({ routeKey: viewRouteKey, value: routeView });
  const view = viewState.routeKey === viewRouteKey ? viewState.value : routeView;
  const routeGoalId = typeof params.goalId === 'string' ? params.goalId : null;
  const [filterState, setFilterState] = useState<{ routeKey: string; value: TaskFilter }>({ routeKey, value: routeFilter });
  const filter = filterState.routeKey === routeKey ? filterState.value : routeFilter;
  const [formVisible, setFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const now = new Date();
  const filteredTasks = tasks.filter((task) => matchesCategory(task, filter) && (!routeGoalId || task.goalId === routeGoalId));
  const overdue = sortTasksByDueDateAndPriority(filteredTasks.filter((task) => isTaskOverdue(task, now)));
  const today = sortTasksByDueDateAndPriority(filteredTasks.filter((task) => !task.completed && isTaskDueToday(task, now)));
  const upcoming = sortTasksByDueDateAndPriority(filteredTasks.filter((task) => !task.completed && !isTaskOverdue(task, now) && !isTaskDueToday(task, now)));
  const completed = sortTasksByDueDateAndPriority(filteredTasks.filter((task) => task.completed));
  const hasTasks = filteredTasks.length > 0;

  const getCategory = (task: Task) => {
    if (!task.categoryId || !task.categoryType) return {};
    const category = task.categoryType === 'subject'
      ? subjects.find((item) => item.id === task.categoryId)
      : projects.find((item) => item.id === task.categoryId);
    return category ? { categoryName: category.name, categoryColor: category.color } : {};
  };

  const openNewTask = () => {
    setEditingTask(null);
    setFormVisible(true);
  };

  const saveTask = (draft: TaskDraft) => {
    if (editingTask) updateTask(editingTask.id, draft);
    else addTask(draft);
    setFormVisible(false);
    setEditingTask(null);
    void Haptics.selectionAsync();
  };

  const confirmDelete = (task: Task) => {
    Alert.alert('Eliminar tarea', `¿Quieres eliminar «${task.title}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteTask(task.id) },
    ]);
  };

  const renderRows = (items: Task[], isOverdue = false) => items.map((task) => (
    <TaskRow
      key={task.id}
      task={task}
      {...getCategory(task)}
      overdue={isOverdue}
      onToggle={() => {
        toggleTaskCompleted(task.id);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onEdit={() => { setEditingTask(task); setFormVisible(true); }}
      onDelete={() => confirmDelete(task)}
    />
  ));

  return (
    <>
      <AppScreen bottomContent={view === 'tasks' ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Añadir tarea" onPress={openNewTask} style={[styles.fab, { backgroundColor: theme.accent, shadowColor: theme.shadow, bottom: fabBottom }]}>
          <SymbolIcon ios="plus" other="add" color={theme.accentInk} size={24} />
        </Pressable>
      ) : null}>
        <ScreenHeader title="Tareas" subtitle="Todo lo que quieres sacar adelante." />
        <SegmentedControl
          options={viewOptions}
          value={view}
          onChange={(value) => setViewState({ routeKey: viewRouteKey, value })}
          style={styles.viewSwitcher}
        />

        {view === 'exams' ? <ExamsView /> : view !== 'tasks' ? <GoalsView mode={view} /> : (
          <>
            <View style={styles.filter}>
              <Typography kind="caption">Filtrar tareas</Typography>
              <CategoryPicker value={filter} onChange={(value) => setFilterState({ routeKey, value })} allowAll allowCreate={false} allLabel="Todas las categorías" />
            </View>

            {!hasTasks ? (
              <View style={[styles.empty, { backgroundColor: theme.surf }]}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.track }]}>
                  <SymbolIcon ios="checklist" other="checklist" color={theme.accent} size={25} />
                </View>
                <Typography kind="heading">Un paso cada vez</Typography>
                <Typography kind="secondary">Añade una tarea para empezar a organizar el día.</Typography>
              </View>
            ) : (
              <View style={styles.sections}>
                {overdue.length ? <TaskSection title="Atrasadas" count={overdue.length} color={theme.danger}>{renderRows(overdue, true)}</TaskSection> : null}
                {today.length ? <TaskSection title="Hoy" count={today.length}>{renderRows(today)}</TaskSection> : null}
                {upcoming.length ? <TaskSection title="Próximas" count={upcoming.length}>{renderRows(upcoming)}</TaskSection> : null}
                {completed.length ? <TaskSection title="Completadas" count={completed.length}>{renderRows(completed)}</TaskSection> : null}
                {!overdue.length && !today.length && !upcoming.length && completed.length ? (
                  <View style={[styles.empty, { backgroundColor: theme.surf }]}>
                    <Typography kind="heading">Todo al día</Typography>
                    <Typography kind="secondary">Has completado todas tus tareas. Puedes añadir otra cuando quieras.</Typography>
                  </View>
                ) : null}
              </View>
            )}
          </>
        )}
      </AppScreen>
      {formVisible ? <TaskFormSheet
        defaultGoalId={routeGoalId}
        visible={formVisible}
        task={editingTask}
        onClose={() => { setFormVisible(false); setEditingTask(null); }}
        onSave={saveTask}
      /> : null}
    </>
  );
}

function TaskSection({ title, count, color, children }: { title: string; count: number; color?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Typography kind="heading" style={color ? { color } : undefined}>{title}</Typography>
        <Typography kind="caption">{count}</Typography>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  viewSwitcher: { marginBottom: spacing.lg },
  filter: { gap: spacing.xs, marginBottom: spacing.lg },
  sections: { gap: spacing.lg },
  section: { gap: spacing.xs },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderRadius: 24, marginTop: spacing.lg },
  emptyIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  fab: { position: 'absolute', right: spacing.lg, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 7 },
});
