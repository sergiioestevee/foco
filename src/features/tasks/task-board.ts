import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

import { formatDayHeading, fromDayKey, toDayKey } from '@/features/calendar/calendar-utils';
import { formatCountdown, getUpcomingExams } from '@/features/exams/exam-utils';
import { getRoutinesForDay, isRoutineDoneOn } from '@/features/routines/routine-utils';
import { sortTasksByDueDateAndPriority } from '@/features/tasks/task-date-utils';
import type { Exam, Goal, PersonalProject, Routine, Subject, Task } from '@/types/models';

/** Exams this close open their subject's card. */
const EXAM_SOON_DAYS = 14;
/** Tasks due this close (today included) count as urgent, like overdue and high-priority ones. */
const TASK_SOON_DAYS = 3;
const NONE_NAME = 'Sin asignatura';

export type BoardCategory = { key: string; kind: 'subject' | 'project' | 'none'; id: string | null; name: string; color: string | null };

export type BoardCard = {
  category: BoardCategory;
  /** Pending tasks, most urgent first. */
  pending: Task[];
  /** Pending tasks that are high priority, overdue or due within TASK_SOON_DAYS; shown with the card open. */
  important: Task[];
  /** The other pending tasks, behind «+N tareas más». */
  others: Task[];
  completed: Task[];
  /** Upcoming exams, soonest first. */
  exams: Exam[];
  /** Time of the most urgent date (pending task or exam); null when there is nothing dated. */
  urgency: number | null;
  /** Folded when there is no exam within EXAM_SOON_DAYS and no important task. */
  collapsed: boolean;
};

export function isImportantTask(task: Task, now = new Date()): boolean {
  if (task.completed) return false;
  if (task.priority === 'high') return true;
  return task.dueDate !== null && differenceInCalendarDays(new Date(task.dueDate), now) <= TASK_SOON_DAYS;
}

type BoardInput = { tasks: Task[]; exams: Exam[]; subjects: Subject[]; projects: PersonalProject[] };

/** One card per subject, then projects with pending work, then «Sin asignatura». Subjects are ordered by urgency. */
export function buildSubjectBoard({ tasks, exams, subjects, projects }: BoardInput, now = new Date()): BoardCard[] {
  const upcoming = getUpcomingExams(exams, now);
  const subjectIds = new Set(subjects.map((item) => item.id));
  const projectIds = new Set(projects.map((item) => item.id));
  const examLimit = addDays(startOfDay(now), EXAM_SOON_DAYS + 1).getTime();

  const card = (category: BoardCategory, cardTasks: Task[], cardExams: Exam[]): BoardCard => {
    const pending = sortTasksByDueDateAndPriority(cardTasks.filter((item) => !item.completed));
    const dates = [
      ...pending.flatMap((item) => (item.dueDate ? [startOfDay(new Date(item.dueDate)).getTime()] : [])),
      ...cardExams.map((item) => new Date(item.date).getTime()),
    ];
    const urgency = dates.length ? Math.min(...dates) : null;
    const examSoon = cardExams.some((item) => new Date(item.date).getTime() < examLimit);
    const important = pending.filter((item) => isImportantTask(item, now));
    return {
      category,
      pending,
      important,
      others: pending.filter((item) => !important.includes(item)),
      completed: cardTasks.filter((item) => item.completed),
      exams: cardExams,
      urgency,
      collapsed: important.length === 0 && !examSoon,
    };
  };
  const byUrgency = (left: BoardCard, right: BoardCard) => (left.urgency ?? Infinity) - (right.urgency ?? Infinity);

  const subjectCards = [...subjects]
    .sort((left, right) => left.order - right.order)
    .map((item) => card(
      { key: `subject:${item.id}`, kind: 'subject', id: item.id, name: item.name, color: item.color },
      tasks.filter((entry) => entry.categoryType === 'subject' && entry.categoryId === item.id),
      upcoming.filter((entry) => entry.subjectId === item.id),
    ))
    // Array.prototype.sort is stable, so ties keep the user's subject order.
    .sort(byUrgency);

  const projectCards = projects
    .map((item) => card(
      { key: `project:${item.id}`, kind: 'project', id: item.id, name: item.name, color: item.color },
      tasks.filter((entry) => entry.categoryType === 'project' && entry.categoryId === item.id),
      [],
    ))
    .filter((item) => item.pending.length > 0)
    .sort((left, right) => byUrgency(left, right) || left.category.name.localeCompare(right.category.name));

  const orphanTasks = tasks.filter((item) => !item.categoryId
    || (item.categoryType === 'subject' && !subjectIds.has(item.categoryId))
    || (item.categoryType === 'project' && !projectIds.has(item.categoryId)));
  const orphanExams = upcoming.filter((item) => !item.subjectId || !subjectIds.has(item.subjectId));
  const none = card({ key: 'none', kind: 'none', id: null, name: NONE_NAME, color: null }, orphanTasks, orphanExams);

  // «Sin asignatura» also shows with only completed tasks, so «Ver completadas» stays reachable.
  return [...subjectCards, ...projectCards, ...(none.pending.length || none.exams.length || none.completed.length ? [none] : [])];
}

/** Status of a folded card: «+N» things inside (exams and pending tasks), or «Al día». Short, so long names fit. */
export function collapsedLabel(card: BoardCard): string {
  const count = card.exams.length + card.pending.length;
  return count ? `+${count}` : 'Al día';
}

/** Status of an open card: «Examen en 5 días · 2 urgentes», else its pending count or «Al día». */
export function openLabel(card: BoardCard, now = new Date()): string {
  const examLimit = addDays(startOfDay(now), EXAM_SOON_DAYS + 1).getTime();
  const soonExam = card.exams.find((item) => new Date(item.date).getTime() < examLimit);
  const parts = [
    soonExam ? `Examen ${formatCountdown(soonExam.date, now)}` : null,
    card.important.length ? `${card.important.length} ${card.important.length === 1 ? 'urgente' : 'urgentes'}` : null,
  ].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  if (card.pending.length) return `${card.pending.length} ${card.pending.length === 1 ? 'pendiente' : 'pendientes'}`;
  return 'Al día';
}

export type DateItem = { type: 'task'; task: Task } | { type: 'exam'; exam: Exam };
/** key: 'overdue', 'day:yyyy-MM-dd', 'undated' or 'completed'. */
export type DateSection = { key: string; title: string; items: DateItem[] };
export type DateRange = { from: Date; to: Date };

/** «Por fecha» shows today and the next 14 days unless the student picks other dates. */
export const DEFAULT_RANGE_DAYS = 14;

export function defaultDateRange(now = new Date()): DateRange {
  return { from: startOfDay(now), to: addDays(startOfDay(now), DEFAULT_RANGE_DAYS) };
}

/**
 * «Por fecha» for a range of days: «Atrasadas» first (when the range reaches today, so nothing
 * overdue hides), then one section per day with tasks and exams, «Sin fecha» and «Completadas» last.
 */
export function groupByDate(tasks: Task[], exams: Exam[], range: DateRange, now = new Date()): DateSection[] {
  const fromKey = toDayKey(range.from);
  const toKey = toDayKey(range.to);
  const todayKey = toDayKey(now);
  const inRange = (key: string) => key >= fromKey && key <= toKey;
  const dayOf = (date: string) => toDayKey(new Date(date));
  const pending = tasks.filter((item) => !item.completed);
  const asTasks = (items: Task[]): DateItem[] => sortTasksByDueDateAndPriority(items).map((item) => ({ type: 'task', task: item }));

  const reachesToday = fromKey <= todayKey && todayKey <= toKey;
  const overdue = reachesToday ? pending.filter((item) => item.dueDate && dayOf(item.dueDate) < fromKey) : [];

  const days = new Map<string, DateItem[]>();
  const add = (key: string, item: DateItem) => days.set(key, [...(days.get(key) ?? []), item]);
  for (const item of pending) if (item.dueDate && inRange(dayOf(item.dueDate))) add(dayOf(item.dueDate), { type: 'task', task: item });
  for (const item of exams) if (inRange(dayOf(item.date))) add(dayOf(item.date), { type: 'exam', exam: item });
  const timeOf = (item: DateItem) => new Date(item.type === 'exam' ? item.exam.date : item.task.dueDate as string).getTime();

  const sections: DateSection[] = [
    { key: 'overdue', title: 'Atrasadas', items: asTasks(overdue) },
    ...[...days.keys()].sort().map((key) => ({
      key: `day:${key}`,
      title: formatDayHeading(fromDayKey(key), now),
      items: [...(days.get(key) ?? [])].sort((left, right) => timeOf(left) - timeOf(right)),
    })),
    { key: 'undated', title: 'Sin fecha', items: asTasks(pending.filter((item) => !item.dueDate)) },
    { key: 'completed', title: 'Completadas', items: asTasks(tasks.filter((item) => item.completed && item.dueDate && inRange(dayOf(item.dueDate)))) },
  ];
  return sections.filter((section) => section.items.length > 0);
}

export function summarizeRoutinesToday(routines: Routine[], now = new Date()): { done: number; total: number; next: Routine | null } {
  const today = getRoutinesForDay(routines, now);
  const done = today.filter((item) => isRoutineDoneOn(item, now));
  return { done: done.length, total: today.length, next: today.find((item) => !isRoutineDoneOn(item, now)) ?? null };
}

/** Mean progress (completed / linked tasks) of goals in progress and active projects that have tasks. */
export function summarizeGoals(goals: Goal[], projects: PersonalProject[], tasks: Task[]): { percent: number | null; goals: number; projects: number } {
  const activeGoals = goals.filter((item) => item.status === 'inProgress');
  const activeProjects = projects.filter((item) => item.status === 'active');
  const ratios = [
    ...activeGoals.map((item) => tasks.filter((entry) => entry.goalId === item.id)),
    ...activeProjects.map((item) => tasks.filter((entry) => entry.categoryType === 'project' && entry.categoryId === item.id)),
  ]
    .filter((linked) => linked.length > 0)
    .map((linked) => linked.filter((entry) => entry.completed).length / linked.length);
  return {
    percent: ratios.length ? Math.round(ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length * 100) : null,
    goals: activeGoals.length,
    projects: activeProjects.length,
  };
}

/** «hoy», «mañana», «jueves» within a week, otherwise «10 nov». */
export function formatDueLabel(dueDate: string, now = new Date()): { label: string; overdue: boolean } {
  const date = new Date(dueDate);
  const days = differenceInCalendarDays(date, now);
  const label = days === 0 ? 'hoy'
    : days === 1 ? 'mañana'
      : days > 1 && days <= 6 ? format(date, 'EEEE', { locale: es })
        : format(date, 'd MMM', { locale: es }).replace('.', '');
  return { label, overdue: days < 0 };
}
