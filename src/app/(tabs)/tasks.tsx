import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppScreen } from '@/components/app-screen';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl } from '@/components/segmented-control';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { ExamFormSheet } from '@/features/exams/exam-form-sheet';
import { AddMenu, showAddMenu, type AddChoice } from '@/features/tasks/add-menu';
import { ByDateList } from '@/features/tasks/by-date-list';
import { PinnedCards } from '@/features/tasks/pinned-cards';
import { SubjectCard } from '@/features/tasks/subject-card';
import { buildSubjectBoard } from '@/features/tasks/task-board';
import { TaskFormSheet, type TaskDraft } from '@/features/tasks/task-form-sheet';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, radii, spacing } from '@/theme/tokens';
import type { Exam, Task } from '@/types/models';

type BoardView = 'subjects' | 'dates';

const viewOptions = [
  { value: 'subjects', label: 'Por asignatura' },
  { value: 'dates', label: 'Por fecha' },
] as const;

export default function TasksScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarClearance = Platform.OS === 'ios' ? 56 : Platform.OS === 'android' ? 8 : 0;
  const fabBottom = insets.bottom + spacing.lg + tabBarClearance;
  // goalId / categoryId+categoryType come from «Ver tareas» in Metas; examId from Inicio › Próximo examen.
  const params = useLocalSearchParams<{ goalId?: string; categoryId?: string; categoryType?: string; examId?: string }>();
  const tasks = useFocoStore((state) => state.tasks);
  const exams = useFocoStore((state) => state.exams);
  const subjects = useFocoStore((state) => state.subjects);
  const projects = useFocoStore((state) => state.projects);
  const goals = useFocoStore((state) => state.goals);
  const addTask = useFocoStore((state) => state.addTask);
  const updateTask = useFocoStore((state) => state.updateTask);
  const toggleTaskCompleted = useFocoStore((state) => state.toggleTaskCompleted);
  const deleteTask = useFocoStore((state) => state.deleteTask);

  const [view, setView] = useState<BoardView>('subjects');
  // undefined: closed, null: creating, value: editing.
  const [editingTask, setEditingTask] = useState<Task | null | undefined>(undefined);
  const [editingExam, setEditingExam] = useState<Exam | null | undefined>(undefined);
  const [addMenuVisible, setAddMenuVisible] = useState(false);

  const goalFilter = params.goalId ? goals.find((goal) => goal.id === params.goalId) : undefined;
  const projectFilter = params.categoryType === 'project' ? projects.find((project) => project.id === params.categoryId) : undefined;
  const filteredTasks = goalFilter
    ? tasks.filter((task) => task.goalId === goalFilter.id)
    : projectFilter
      ? tasks.filter((task) => task.categoryType === 'project' && task.categoryId === projectFilter.id)
      : tasks;
  const routeExam = params.examId ? exams.find((exam) => exam.id === params.examId) : undefined;
  const examInForm = editingExam !== undefined ? editingExam : routeExam;

  const toggleTask = (task: Task) => {
    toggleTaskCompleted(task.id);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const saveTask = (draft: TaskDraft) => {
    if (editingTask) updateTask(editingTask.id, draft);
    else addTask(draft);
    setEditingTask(undefined);
    void Haptics.selectionAsync();
  };

  const confirmDelete = (task: Task) => {
    Alert.alert('Eliminar tarea', `¿Quieres eliminar «${task.title}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { deleteTask(task.id); setEditingTask(undefined); } },
    ]);
  };

  const closeExam = () => {
    setEditingExam(undefined);
    // Opened from Inicio: drop ?examId so it doesn't reopen.
    if (routeExam) router.replace('/tasks');
  };

  const add = (choice: AddChoice) => {
    if (choice === 'task') setEditingTask(null);
    else if (choice === 'exam') setEditingExam(null);
    else if (choice === 'routine') router.push({ pathname: '/routines', params: { create: '1' } });
    else router.push({ pathname: '/goals', params: { create: choice } });
  };

  const handlers = { onToggleTask: toggleTask, onEditTask: (task: Task) => setEditingTask(task), onEditExam: (exam: Exam) => setEditingExam(exam) };
  const filterLabel = goalFilter ? `Objetivo: ${goalFilter.title}` : projectFilter ? `Proyecto: ${projectFilter.name}` : null;
  const board = buildSubjectBoard({ tasks, exams, subjects, projects });

  return (
    <>
      <AppScreen bottomContent={(
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Añadir"
          onPress={() => (Platform.OS === 'ios' ? showAddMenu(add) : setAddMenuVisible(true))}
          style={[styles.fab, { backgroundColor: theme.accent, shadowColor: theme.shadow, bottom: fabBottom }]}>
          <SymbolIcon ios="plus" other="add" color={theme.accentInk} size={24} />
        </Pressable>
      )}>
        <ScreenHeader title="Tareas" />
        <PinnedCards />

        {filterLabel ? (
          <View style={styles.filtered}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${filterLabel}. Quitar filtro`}
              onPress={() => router.replace('/tasks')}
              style={[styles.chip, { backgroundColor: theme.aiBg }]}>
              <Typography numberOfLines={1} style={[styles.chipText, { color: theme.accent }]}>{filterLabel}</Typography>
              <SymbolIcon ios="xmark" other="close" color={theme.accent} size={14} />
            </Pressable>
            {filteredTasks.length
              ? <ByDateList tasks={filteredTasks} exams={[]} {...handlers} />
              : (
                <Typography kind="secondary">
                  {goalFilter ? 'Este objetivo todavía no tiene tareas.' : 'Este proyecto todavía no tiene tareas.'}
                </Typography>
              )}
          </View>
        ) : (
          <>
            <SegmentedControl options={viewOptions} value={view} onChange={setView} style={styles.viewSwitcher} />
            {!board.length ? (
              <View style={[styles.empty, { backgroundColor: theme.surf }]}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.track }]}>
                  <SymbolIcon ios="checklist" other="checklist" color={theme.accent} size={25} />
                </View>
                <Typography kind="heading">Un paso cada vez</Typography>
                <Typography kind="secondary">Añade una tarea o un examen con el botón +.</Typography>
              </View>
            ) : view === 'subjects' ? (
              <View style={styles.board}>
                {board.map((card) => <SubjectCard key={card.category.key} card={card} {...handlers} />)}
              </View>
            ) : (
              <ByDateList tasks={tasks} exams={exams} {...handlers} />
            )}
          </>
        )}
        <View style={styles.fabSpacer} />
      </AppScreen>

      {editingTask !== undefined ? (
        <TaskFormSheet
          defaultGoalId={goalFilter?.id ?? null}
          defaultCategory={projectFilter ? { categoryType: 'project', categoryId: projectFilter.id } : undefined}
          visible
          task={editingTask}
          onClose={() => setEditingTask(undefined)}
          onSave={saveTask}
          onDelete={editingTask ? () => confirmDelete(editingTask) : undefined}
        />
      ) : null}
      {examInForm !== undefined ? <ExamFormSheet exam={examInForm} onClose={closeExam} /> : null}
      {Platform.OS !== 'ios' ? <AddMenu visible={addMenuVisible} onPick={add} onClose={() => setAddMenuVisible(false)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  viewSwitcher: { marginBottom: spacing.lg },
  board: { gap: spacing.sm },
  filtered: { gap: spacing.md },
  chip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  chipText: { flexShrink: 1, fontWeight: '700' },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderRadius: radii.card, marginTop: spacing.lg },
  emptyIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  fabSpacer: { height: 88 },
  fab: { position: 'absolute', right: spacing.lg, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 7 },
});
