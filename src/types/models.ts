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
  notificationsEnabled: boolean;
  reminderMinutesBefore: number;
  aiBackendUrl: string;
};

export type CategorySelection =
  | { categoryType: 'subject'; categoryId: string }
  | { categoryType: 'project'; categoryId: string }
  | { categoryType: null; categoryId: null };

export const NO_CATEGORY: CategorySelection = { categoryType: null, categoryId: null };
