export type TaskPriority = 'low' | 'medium' | 'high';
export type ProjectStatus = 'active' | 'paused' | 'finished';
export type GoalStatus = 'inProgress' | 'achieved' | 'paused';
export type ThemeMode = 'system' | 'light' | 'dark';
export type CategoryType = 'subject' | 'project';
export type TaskKind = 'task' | 'delivery' | 'practice' | 'assignment';

export type FocusTime = 'morning' | 'afternoon' | 'night';

export type UserProfile = {
  name: string;
  /** Free text, e.g. "2.º de Ingeniería Informática". */
  studies: string;
  focusTime: FocusTime | null;
};

export type CategoryFields = {
  categoryId: string | null;
  categoryType: CategoryType | null;
};

export type Subject = {
  id: string;
  name: string;
  color: string;
  icon?: string;
  order: number;
};

export type PersonalProject = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
  targetDate: string | null;
  status: ProjectStatus;
};

export type Task = CategoryFields & {
  id: string;
  /** Tarea, entrega, práctica o trabajo. */
  kind: TaskKind;
  title: string;
  notes: string;
  dueDate: string | null;
  /** Optional due time (HH:mm). Without it the task is due «some time» that day. */
  dueTime: string | null;
  priority: TaskPriority;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  goalId: string | null;
};

export type Goal = CategoryFields & {
  id: string;
  title: string;
  description: string;
  targetDate: string | null;
  status: GoalStatus;
  taskIds: string[];
};

export type Exam = {
  id: string;
  /** null if the subject was deleted. */
  subjectId: string | null;
  /** e.g. "Parcial 1". */
  title: string;
  /** ISO date and time of the exam. */
  date: string;
  room: string;
  /** 0–100, how much of the material has been reviewed. */
  reviewProgress: number;
  createdAt: string;
};

/** A dated study session that can be ticked off; counts towards the day's progress. */
export type StudyBlock = {
  id: string;
  subjectId: string | null;
  title: string;
  /** Local day, yyyy-MM-dd. */
  date: string;
  /** HH:mm */
  startTime: string;
  endTime: string;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
};

/** Something done on certain weekdays, e.g. "Plan de mañana" every weekday at 22:00. */
export type Routine = {
  id: string;
  title: string;
  /** Date.getDay() values: 0 is Sunday. */
  weekdays: number[];
  /** HH:mm, or null for "any time". */
  time: string | null;
  subjectId: string | null;
  /** Local days (yyyy-MM-dd) on which it was done. */
  completedDates: string[];
  createdAt: string;
};

/** A study block proposed by Foco IA, added to the calendar with one tap. */
export type PlanItem = {
  /** yyyy-MM-dd */
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  subjectId: string | null;
};

export type AiExamFields = Pick<Exam, 'subjectId' | 'title' | 'date' | 'room'>;
export type AiTaskFields = Pick<Task, 'kind' | 'title' | 'dueDate' | 'priority'> & CategoryFields;
export type AiRoutineFields = Pick<Routine, 'title' | 'weekdays' | 'time' | 'subjectId'>;

/**
 * A change Foco IA proposes. Nothing is saved until the student confirms it in the chat.
 * `id` is the item it changes; `label` is that item's title when it was proposed.
 */
export type AiAction =
  | { type: 'addExam'; exam: AiExamFields }
  | { type: 'updateExam'; id: string; label: string; changes: Partial<AiExamFields> }
  | { type: 'deleteExam'; id: string; label: string }
  | { type: 'addTask'; task: AiTaskFields }
  | { type: 'updateTask'; id: string; label: string; changes: Partial<AiTaskFields> }
  | { type: 'deleteTask'; id: string; label: string }
  | { type: 'addRoutine'; routine: AiRoutineFields }
  | { type: 'updateRoutine'; id: string; label: string; changes: Partial<AiRoutineFields> }
  | { type: 'deleteRoutine'; id: string; label: string };

export type Chat = {
  id: string;
  title: string;
  /** Running summary written by Foco IA ("documento del chat"), so the chat can be resumed later. */
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  plan: PlanItem[];
  /** The plan was added to the calendar. */
  planAdded: boolean;
  /** Missing on messages saved before Foco IA could propose changes. */
  actions?: AiAction[];
  /** The student confirmed the actions. */
  actionsApplied?: boolean;
  createdAt: string;
};

/** Something Foco IA remembers across chats, e.g. "Estudia mejor por la tarde". */
export type AiMemory = {
  id: string;
  text: string;
  createdAt: string;
};

/** Weekly recurring class/schedule slot. weekday follows JavaScript Date.getDay(): 0 is Sunday and 6 is Saturday. */
export type ScheduleBlock = CategoryFields & {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  place: string;
  color: string;
};

export type AppSettings = {
  themeMode: ThemeMode;
  includeOverdueInDailyProgress: boolean;
  /** Master switch; the three below pick what gets a reminder. */
  notificationsEnabled: boolean;
  reminderMinutesBefore: number;
  taskReminders: boolean;
  examReminders: boolean;
  routineReminders: boolean;
};

export type CategorySelection =
  | { categoryType: 'subject'; categoryId: string }
  | { categoryType: 'project'; categoryId: string }
  | { categoryType: null; categoryId: null };

export const NO_CATEGORY: CategorySelection = { categoryType: null, categoryId: null };
