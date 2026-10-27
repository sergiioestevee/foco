import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { normalizeProfile } from '@/features/profile/normalize-profile';
import { defaultSubjects } from '@/features/subjects/default-subjects';
import { createDemoData } from '@/services/demo-data';
import { createId } from '@/utils/ids';
import type {
  AiMemory,
  AppSettings,
  Chat,
  ChatMessage,
  CategoryFields,
  Exam,
  Goal,
  PersonalProject,
  Routine,
  ScheduleBlock,
  StudyBlock,
  Subject,
  Task,
  UserProfile,
} from '@/types/models';

const initialSettings: AppSettings = {
  themeMode: 'system',
  includeOverdueInDailyProgress: false,
  notificationsEnabled: false,
  reminderMinutesBefore: 30,
  taskReminders: true,
  examReminders: true,
  routineReminders: true,
};

export type NewTask = Pick<Task, 'title' | 'notes' | 'dueDate' | 'priority' | 'goalId'> & Partial<Pick<Task, 'kind' | 'dueTime'>> & CategoryFields;
export type NewExam = Omit<Exam, 'id' | 'createdAt'>;
export type NewStudyBlock = Omit<StudyBlock, 'id' | 'createdAt' | 'completed' | 'completedAt'>;
export type NewRoutine = Omit<Routine, 'id' | 'createdAt' | 'completedDates'>;

/** Completion history kept per routine; enough for streaks and the week view. */
const ROUTINE_HISTORY_DAYS = 120;
const MAX_AI_MEMORIES = 30;

export type NewChatMessage = Omit<ChatMessage, 'id' | 'createdAt' | 'planAdded' | 'actionsApplied'>;

export type FocoState = {
  subjects: Subject[];
  projects: PersonalProject[];
  tasks: Task[];
  exams: Exam[];
  goals: Goal[];
  scheduleBlocks: ScheduleBlock[];
  studyBlocks: StudyBlock[];
  routines: Routine[];
  chats: Chat[];
  chatMessages: ChatMessage[];
  aiMemories: AiMemory[];
  settings: AppSettings;
  profile: UserProfile | null;
  hasCompletedFirstRun: boolean;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  finishFirstRun: (profile: UserProfile, subjects: typeof defaultSubjects) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  addSubject: (subject: Omit<Subject, 'id'>) => string;
  updateSubject: (id: string, changes: Partial<Omit<Subject, 'id'>>) => void;
  reorderSubjects: (orderedIds: string[]) => void;
  deleteSubject: (id: string, deleteTasks: boolean) => void;
  addProject: (project: Omit<PersonalProject, 'id'>) => string;
  updateProject: (id: string, changes: Partial<Omit<PersonalProject, 'id'>>) => void;
  deleteProject: (id: string, deleteTasks: boolean) => void;
  addTask: (task: NewTask) => string;
  updateTask: (id: string, changes: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
  toggleTaskCompleted: (id: string) => void;
  deleteTask: (id: string) => void;
  addExam: (exam: NewExam) => string;
  updateExam: (id: string, changes: Partial<NewExam>) => void;
  deleteExam: (id: string) => void;
  addStudyBlock: (block: NewStudyBlock) => string;
  updateStudyBlock: (id: string, changes: Partial<NewStudyBlock>) => void;
  toggleStudyBlockCompleted: (id: string) => void;
  deleteStudyBlock: (id: string) => void;
  addRoutine: (routine: NewRoutine) => string;
  updateRoutine: (id: string, changes: Partial<NewRoutine>) => void;
  /** Marks or unmarks a routine as done on a day (yyyy-MM-dd). */
  toggleRoutineDone: (id: string, day: string) => void;
  deleteRoutine: (id: string) => void;
  createChat: () => string;
  renameChat: (id: string, title: string) => void;
  updateChatSummary: (id: string, summary: string) => void;
  deleteChat: (id: string) => void;
  addChatMessage: (message: NewChatMessage) => string;
  markPlanAdded: (messageId: string) => void;
  markActionsApplied: (messageId: string) => void;
  /** Adds new memories, skipping duplicates; keeps the most recent ones. */
  addAiMemories: (texts: string[]) => void;
  deleteAiMemory: (id: string) => void;
  clearAiMemories: () => void;
  addGoal: (goal: Omit<Goal, 'id'>) => string;
  updateGoal: (id: string, changes: Partial<Omit<Goal, 'id'>>) => void;
  linkTaskToGoal: (taskId: string, goalId: string | null) => void;
  /** Deletes a goal; its tasks are kept (without goal) unless `deleteTasks` is true. */
  deleteGoal: (id: string, deleteTasks?: boolean) => void;
  addScheduleBlock: (block: Omit<ScheduleBlock, 'id'>) => string;
  updateScheduleBlock: (id: string, changes: Partial<Omit<ScheduleBlock, 'id'>>) => void;
  deleteScheduleBlock: (id: string) => void;
  loadDemoData: () => void;
  clearData: () => void;
};

function normalizeCategory(categoryId: string | null, categoryType: CategoryFields['categoryType']): CategoryFields {
  if (!categoryId || !categoryType) return { categoryId: null, categoryType: null };
  return { categoryId, categoryType };
}

export const useFocoStore = create<FocoState>()(
  persist(
      (set) => ({
      subjects: [],
      projects: [],
      tasks: [],
      exams: [],
      goals: [],
      scheduleBlocks: [],
      studyBlocks: [],
      routines: [],
      chats: [],
      chatMessages: [],
      aiMemories: [],
      settings: initialSettings,
      profile: null,
      hasCompletedFirstRun: false,
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      finishFirstRun: (profile, selectedSubjects) =>
        set((state) => {
          const existingByName = new Map(state.subjects.map((subject) => [subject.name.trim().toLocaleLowerCase(), subject]));
          const keptIds = new Set<string>();
          const subjects = selectedSubjects
            .map((subject) => ({ ...subject, name: subject.name.trim() }))
            .filter((subject, index, list) => subject.name.length > 0
              && list.findIndex((candidate) => candidate.name.toLocaleLowerCase() === subject.name.toLocaleLowerCase()) === index)
            .map((subject, order) => {
              const existing = existingByName.get(subject.name.toLocaleLowerCase());
              if (existing) {
                keptIds.add(existing.id);
                return { ...existing, ...subject, id: existing.id, order };
              }
              return { ...subject, id: createId(), order };
            });
          const removedIds = new Set(state.subjects.filter((subject) => !keptIds.has(subject.id)).map((subject) => subject.id));

          return {
            profile: { ...profile, name: profile.name.trim(), studies: profile.studies.trim() },
            hasCompletedFirstRun: true,
            subjects,
            tasks: state.tasks.map((task) => task.categoryType === 'subject' && task.categoryId && removedIds.has(task.categoryId)
              ? { ...task, categoryId: null, categoryType: null }
              : task),
            goals: state.goals.map((goal) => ({
              ...goal,
              ...(goal.categoryType === 'subject' && goal.categoryId && removedIds.has(goal.categoryId)
                ? { categoryId: null, categoryType: null }
                : {}),
            })),
            scheduleBlocks: state.scheduleBlocks.map((block) => block.categoryType === 'subject' && block.categoryId && removedIds.has(block.categoryId)
              ? { ...block, categoryId: null, categoryType: null }
              : block),
          };
        }),

      updateSettings: (changes) =>
        set((state) => ({ settings: { ...state.settings, ...changes } })),

      addSubject: (input) => {
        const subject: Subject = { ...input, id: createId(), name: input.name.trim() };
        set((state) => ({ subjects: [...state.subjects, { ...subject, order: state.subjects.length }] }));
        return subject.id;
      },

      updateSubject: (id, changes) =>
        set((state) => ({
          subjects: state.subjects.map((subject) =>
            subject.id === id
              ? { ...subject, ...changes, name: changes.name?.trim() ?? subject.name }
              : subject,
          ),
        })),

      reorderSubjects: (orderedIds) =>
        set((state) => {
          const orderById = new Map(orderedIds.map((id, order) => [id, order]));
          return {
            subjects: state.subjects
              .map((subject) => ({ ...subject, order: orderById.get(subject.id) ?? subject.order }))
              .sort((left, right) => left.order - right.order),
          };
        }),

      deleteSubject: (id, deleteTasks) =>
        set((state) => {
          const removedTaskIds = new Set(deleteTasks
            ? state.tasks.filter((task) => task.categoryType === 'subject' && task.categoryId === id).map((task) => task.id)
            : []);
          return {
            subjects: state.subjects.filter((subject) => subject.id !== id),
            tasks: state.tasks
              .filter((task) => !removedTaskIds.has(task.id))
              .map((task) => task.categoryType === 'subject' && task.categoryId === id
                ? { ...task, categoryId: null, categoryType: null }
                : task),
            goals: state.goals.map((goal) => ({
              ...goal,
              ...(goal.categoryType === 'subject' && goal.categoryId === id ? { categoryId: null, categoryType: null } : {}),
              taskIds: goal.taskIds.filter((taskId) => !removedTaskIds.has(taskId)),
            })),
            scheduleBlocks: state.scheduleBlocks.map((block) => block.categoryType === 'subject' && block.categoryId === id
              ? { ...block, categoryId: null, categoryType: null }
              : block),
            exams: state.exams.map((exam) => exam.subjectId === id ? { ...exam, subjectId: null } : exam),
            studyBlocks: state.studyBlocks.map((block) => block.subjectId === id ? { ...block, subjectId: null } : block),
            routines: state.routines.map((routine) => routine.subjectId === id ? { ...routine, subjectId: null } : routine),
          };
        }),

      addProject: (input) => {
        const project: PersonalProject = { ...input, id: createId(), name: input.name.trim() };
        set((state) => ({ projects: [...state.projects, project] }));
        return project.id;
      },

      updateProject: (id, changes) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id
              ? { ...project, ...changes, name: changes.name?.trim() ?? project.name }
              : project,
          ),
        })),

      deleteProject: (id, deleteTasks) =>
        set((state) => {
          const removedTaskIds = new Set(deleteTasks
            ? state.tasks.filter((task) => task.categoryType === 'project' && task.categoryId === id).map((task) => task.id)
            : []);
          return {
            projects: state.projects.filter((project) => project.id !== id),
            tasks: state.tasks
              .filter((task) => !removedTaskIds.has(task.id))
              .map((task) => task.categoryType === 'project' && task.categoryId === id
                ? { ...task, categoryId: null, categoryType: null }
                : task),
            goals: state.goals.map((goal) => ({
              ...goal,
              ...(goal.categoryType === 'project' && goal.categoryId === id ? { categoryId: null, categoryType: null } : {}),
              taskIds: goal.taskIds.filter((taskId) => !removedTaskIds.has(taskId)),
            })),
            scheduleBlocks: state.scheduleBlocks.map((block) => block.categoryType === 'project' && block.categoryId === id
              ? { ...block, categoryId: null, categoryType: null }
              : block),
          };
        }),

      addTask: (input) => {
        const task: Task = {
          ...input,
          ...normalizeCategory(input.categoryId, input.categoryType),
          kind: input.kind ?? 'task',
          dueTime: input.dueTime ?? null,
          id: createId(),
          title: input.title.trim(),
          completed: false,
          completedAt: null,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          tasks: [...state.tasks, task],
          goals: state.goals.map((goal) => goal.id === task.goalId
            ? { ...goal, taskIds: [...new Set([...goal.taskIds, task.id])] }
            : goal),
        }));
        return task.id;
      },

      updateTask: (id, changes) =>
        set((state) => {
          const current = state.tasks.find((task) => task.id === id);
          if (!current) return state;
          const updated = {
            ...current,
            ...changes,
            title: changes.title?.trim() ?? current.title,
          };
          const normalized = { ...updated, ...normalizeCategory(updated.categoryId, updated.categoryType) };
          return {
            tasks: state.tasks.map((task) => task.id === id ? normalized : task),
            goals: state.goals.map((goal) => {
              const taskIds = goal.taskIds.filter((taskId) => taskId !== id);
              return goal.id === normalized.goalId
                ? { ...goal, taskIds: [...taskIds, id] }
                : { ...goal, taskIds };
            }),
          };
        }),

      toggleTaskCompleted: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== id) return task;
            const completed = !task.completed;
            return { ...task, completed, completedAt: completed ? new Date().toISOString() : null };
          }),
        })),

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
          goals: state.goals.map((goal) => ({ ...goal, taskIds: goal.taskIds.filter((taskId) => taskId !== id) })),
        })),

      addExam: (input) => {
        const exam: Exam = { ...input, id: createId(), title: input.title.trim(), room: input.room.trim(), createdAt: new Date().toISOString() };
        set((state) => ({ exams: [...state.exams, exam] }));
        return exam.id;
      },

      updateExam: (id, changes) =>
        set((state) => ({
          exams: state.exams.map((exam) => exam.id === id
            ? { ...exam, ...changes, title: changes.title?.trim() ?? exam.title, room: changes.room?.trim() ?? exam.room }
            : exam),
        })),

      deleteExam: (id) =>
        set((state) => ({ exams: state.exams.filter((exam) => exam.id !== id) })),

      addStudyBlock: (input) => {
        const block: StudyBlock = {
          ...input,
          id: createId(),
          title: input.title.trim(),
          completed: false,
          completedAt: null,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ studyBlocks: [...state.studyBlocks, block] }));
        return block.id;
      },

      updateStudyBlock: (id, changes) =>
        set((state) => ({
          studyBlocks: state.studyBlocks.map((block) => block.id === id
            ? { ...block, ...changes, title: changes.title?.trim() ?? block.title }
            : block),
        })),

      toggleStudyBlockCompleted: (id) =>
        set((state) => ({
          studyBlocks: state.studyBlocks.map((block) => {
            if (block.id !== id) return block;
            const completed = !block.completed;
            return { ...block, completed, completedAt: completed ? new Date().toISOString() : null };
          }),
        })),

      deleteStudyBlock: (id) =>
        set((state) => ({ studyBlocks: state.studyBlocks.filter((block) => block.id !== id) })),

      addRoutine: (input) => {
        const routine: Routine = {
          ...input,
          id: createId(),
          title: input.title.trim(),
          weekdays: [...new Set(input.weekdays)].sort((left, right) => left - right),
          completedDates: [],
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ routines: [...state.routines, routine] }));
        return routine.id;
      },

      updateRoutine: (id, changes) =>
        set((state) => ({
          routines: state.routines.map((routine) => routine.id === id
            ? {
                ...routine,
                ...changes,
                title: changes.title?.trim() ?? routine.title,
                weekdays: changes.weekdays ? [...new Set(changes.weekdays)].sort((left, right) => left - right) : routine.weekdays,
              }
            : routine),
        })),

      toggleRoutineDone: (id, day) =>
        set((state) => ({
          routines: state.routines.map((routine) => {
            if (routine.id !== id) return routine;
            const completedDates = routine.completedDates.includes(day)
              ? routine.completedDates.filter((item) => item !== day)
              : [...routine.completedDates, day].sort().slice(-ROUTINE_HISTORY_DAYS);
            return { ...routine, completedDates };
          }),
        })),

      deleteRoutine: (id) =>
        set((state) => ({ routines: state.routines.filter((routine) => routine.id !== id) })),

      createChat: () => {
        const now = new Date().toISOString();
        const chat: Chat = { id: createId(), title: 'Nuevo chat', summary: '', createdAt: now, updatedAt: now };
        set((state) => ({ chats: [...state.chats, chat] }));
        return chat.id;
      },

      renameChat: (id, title) =>
        set((state) => ({
          chats: state.chats.map((chat) => chat.id === id ? { ...chat, title: title.trim() || chat.title } : chat),
        })),

      updateChatSummary: (id, summary) =>
        set((state) => ({
          chats: state.chats.map((chat) => chat.id === id ? { ...chat, summary: summary.trim() } : chat),
        })),

      deleteChat: (id) =>
        set((state) => ({
          chats: state.chats.filter((chat) => chat.id !== id),
          chatMessages: state.chatMessages.filter((message) => message.chatId !== id),
        })),

      addChatMessage: (input) => {
        const message: ChatMessage = { ...input, id: createId(), planAdded: false, createdAt: new Date().toISOString() };
        set((state) => ({
          chatMessages: [...state.chatMessages, message],
          chats: state.chats.map((chat) => chat.id === input.chatId ? { ...chat, updatedAt: message.createdAt } : chat),
        }));
        return message.id;
      },

      markPlanAdded: (messageId) =>
        set((state) => ({
          chatMessages: state.chatMessages.map((message) => message.id === messageId ? { ...message, planAdded: true } : message),
        })),

      markActionsApplied: (messageId) =>
        set((state) => ({
          chatMessages: state.chatMessages.map((message) => message.id === messageId ? { ...message, actionsApplied: true } : message),
        })),

      addAiMemories: (texts) =>
        set((state) => {
          const known = new Set(state.aiMemories.map((memory) => memory.text.toLocaleLowerCase()));
          const additions = texts
            .map((text) => text.trim())
            .filter((text) => text && !known.has(text.toLocaleLowerCase()))
            .map((text): AiMemory => ({ id: createId(), text, createdAt: new Date().toISOString() }));
          if (!additions.length) return state;
          return { aiMemories: [...state.aiMemories, ...additions].slice(-MAX_AI_MEMORIES) };
        }),

      deleteAiMemory: (id) =>
        set((state) => ({ aiMemories: state.aiMemories.filter((memory) => memory.id !== id) })),

      clearAiMemories: () => set({ aiMemories: [] }),

      addGoal: (input) => {
        const goal: Goal = {
          ...input,
          ...normalizeCategory(input.categoryId, input.categoryType),
          id: createId(),
          title: input.title.trim(),
        };
        set((state) => ({ goals: [...state.goals, goal] }));
        return goal.id;
      },

      updateGoal: (id, changes) =>
        set((state) => ({
          goals: state.goals.map((goal) => {
            if (goal.id !== id) return goal;
            const updated = { ...goal, ...changes, title: changes.title?.trim() ?? goal.title };
            return { ...updated, ...normalizeCategory(updated.categoryId, updated.categoryType) };
          }),
        })),

      linkTaskToGoal: (taskId, goalId) =>
        set((state) => ({
          tasks: state.tasks.map((task) => task.id === taskId ? { ...task, goalId } : task),
          goals: state.goals.map((goal) => {
            const withoutTask = goal.taskIds.filter((id) => id !== taskId);
            return {
              ...goal,
              taskIds: goal.id === goalId ? [...withoutTask, taskId] : withoutTask,
            };
          }),
        })),

      deleteGoal: (id, deleteTasks = false) =>
        set((state) => ({
          goals: state.goals.filter((goal) => goal.id !== id),
          tasks: deleteTasks
            ? state.tasks.filter((task) => task.goalId !== id)
            : state.tasks.map((task) => task.goalId === id ? { ...task, goalId: null } : task),
        })),

      addScheduleBlock: (input) => {
        const block: ScheduleBlock = {
          ...input,
          ...normalizeCategory(input.categoryId, input.categoryType),
          id: createId(),
        };
        set((state) => ({ scheduleBlocks: [...state.scheduleBlocks, block] }));
        return block.id;
      },

      updateScheduleBlock: (id, changes) =>
        set((state) => ({
          scheduleBlocks: state.scheduleBlocks.map((block) => {
            if (block.id !== id) return block;
            const updated = { ...block, ...changes };
            return { ...updated, ...normalizeCategory(updated.categoryId, updated.categoryType) };
          }),
        })),

      deleteScheduleBlock: (id) =>
        set((state) => ({ scheduleBlocks: state.scheduleBlocks.filter((block) => block.id !== id) })),

      loadDemoData: () => {
        const demo = createDemoData();
        set({ ...demo, hasCompletedFirstRun: true });
      },

      clearData: () => set({
        subjects: [], projects: [], tasks: [], exams: [], goals: [], scheduleBlocks: [], studyBlocks: [], routines: [],
        chats: [], chatMessages: [], aiMemories: [],
        settings: initialSettings, profile: null, hasCompletedFirstRun: false,
      }),
    }),
    {
      name: 'foco-local-v1',
      version: 9,
      migrate: (persisted, version) => {
        let state = (persisted ?? {}) as Partial<FocoState>;
        // v2: profile moved from { age, focusGoals } to { studies, focusTime }.
        if (version < 2) state = { ...state, profile: normalizeProfile(state.profile) };
        // v3: tasks gained a kind, and exams were added.
        if (version < 3) {
          state = {
            ...state,
            tasks: (state.tasks ?? []).map((task) => ({ ...task, kind: task.kind ?? 'task' })),
            exams: state.exams ?? [],
          };
        }
        // v4: dated study blocks.
        if (version < 4) state = { ...state, studyBlocks: state.studyBlocks ?? [] };
        // v5: routines.
        if (version < 5) state = { ...state, routines: state.routines ?? [] };
        // v6: Foco IA chats and memory.
        if (version < 6) {
          state = {
            ...state,
            chats: state.chats ?? [],
            chatMessages: state.chatMessages ?? [],
            aiMemories: state.aiMemories ?? [],
          };
        }
        // v7: per-chat summary.
        if (version < 7) state = { ...state, chats: (state.chats ?? []).map((chat) => ({ ...chat, summary: chat.summary ?? '' })) };
        // v8: optional due time on tasks.
        if (version < 8) state = { ...state, tasks: (state.tasks ?? []).map((task) => ({ ...task, dueTime: task.dueTime ?? null })) };
        // v9: reminders per kind (tasks, exams, routines).
        if (version < 9) state = { ...state, settings: { ...initialSettings, ...state.settings } };
        return state;
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        subjects: state.subjects,
        projects: state.projects,
        tasks: state.tasks,
        exams: state.exams,
        goals: state.goals,
        scheduleBlocks: state.scheduleBlocks,
        studyBlocks: state.studyBlocks,
        routines: state.routines,
        chats: state.chats,
        chatMessages: state.chatMessages,
        aiMemories: state.aiMemories,
        settings: state.settings,
        profile: state.profile,
        hasCompletedFirstRun: state.hasCompletedFirstRun,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
