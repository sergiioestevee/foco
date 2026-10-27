import { addDays, differenceInCalendarDays, endOfWeek, format, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

import { formatCountdown, getUpcomingExams } from '@/features/exams/exam-utils';
import { getRoutinesForDay, isRoutineDoneOn } from '@/features/routines/routine-utils';
import { isTaskDueToday, isTaskOverdue, sortTasksByDueDateAndPriority } from '@/features/tasks/task-date-utils';
import type { Exam, Goal, PersonalProject, Routine, Subject, Task } from '@/types/models';

/** A card with no pending tasks and no exam within this many days shows folded. */
const FOLD_AFTER_DAYS = 7;
const NONE_NAME = 'Sin asignatura';

export type BoardCategory = { key: string; kind: 'subject' | 'project' | 'none'; id: string | null; name: string; color: string | null };

export type BoardCard = {
  category: BoardCategory;
  /** Pending tasks, most urgent first. */
  pending: Task[];
  completed: Task[];
  /** Upcoming exams, soonest first. */
  exams: Exam[];
  /** Time of the most urgent date (pending task or exam); null when there is nothing dated. */
  urgency: number | null;
  collapsed: boolean;
};

type BoardInput = { tasks: Task[]; exams: Exam[]; subjects: Subject[]; projects: PersonalProject[] };

/** One card per subject, then projects with pending work, then «Sin asignatura». Subjects are ordered by urgency. */
export function buildSubjectBoard({ tasks, exams, subjects, projects }: BoardInput, now = new Date()): BoardCard[] {
  const upcoming = getUpcomingExams(exams, now);
  const subjectIds = new Set(subjects.map((item) => item.id));
  const projectIds = new Set(projects.map((item) => item.id));
  const foldLimit = addDays(startOfDay(now), FOLD_AFTER_DAYS).getTime();

  const card = (category: BoardCategory, cardTasks: Task[], cardExams: Exam[]): BoardCard => {
    const pending = sortTasksByDueDateAndPriority(cardTasks.filter((item) => !item.completed));
    const dates = [
      ...pending.flatMap((item) => (item.dueDate ? [startOfDay(new Date(item.dueDate)).getTime()] : [])),
      ...cardExams.map((item) => new Date(item.date).getTime()),
    ];
    const urgency = dates.length ? Math.min(...dates) : null;
    const examSoon = cardExams.some((item) => new Date(item.date).getTime() <= foldLimit);
    return {
      category,
      pending,
      completed: cardTasks.filter((item) => item.completed),
      exams: cardExams,
      urgency,
      // Any pending task keeps the card open, dated or not: a folded card would hide it.
      collapsed: pending.length === 0 && !examSoon,
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

/** One-line status of a folded card: «Examen en 12 días», «3 pendientes» or «Al día». */
export function collapsedLabel(card: BoardCard, now = new Date()): string {
  if (card.exams.length) return `Examen ${formatCountdown(card.exams[0].date, now)}`;
  if (card.pending.length) return `${card.pending.length} ${card.pending.length === 1 ? 'pendiente' : 'pendientes'}`;
  return 'Al día';
}

export type DateItem = { type: 'task'; task: Task } | { type: 'exam'; exam: Exam };
export type DateSection = { key: 'overdue' | 'today' | 'week' | 'later' | 'completed'; title: string; items: DateItem[] };

/** «Por fecha»: Atrasadas · Hoy · Esta semana · Más adelante · Completadas, skipping empty sections. */
export function groupByDate(tasks: Task[], exams: Exam[], now = new Date()): DateSection[] {
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).getTime();
  const pending = tasks.filter((item) => !item.completed);
  const upcoming = getUpcomingExams(exams, now);
  const timeOf = (item: DateItem) => (item.type === 'exam'
    ? new Date(item.exam.date).getTime()
    : item.task.dueDate ? new Date(item.task.dueDate).getTime() : Infinity);
  const byTime = (items: DateItem[]) => [...items].sort((left, right) => timeOf(left) - timeOf(right));
  const asTasks = (items: Task[]): DateItem[] => sortTasksByDueDateAndPriority(items).map((item) => ({ type: 'task', task: item }));
  const asExams = (items: Exam[]): DateItem[] => items.map((item) => ({ type: 'exam', exam: item }));

  const notToday = pending.filter((item) => item.dueDate && !isTaskOverdue(item, now) && !isTaskDueToday(item, now));
  const examsLater = upcoming.filter((item) => !isSameDay(new Date(item.date), now));
  const inWeek = (time: number) => time <= weekEnd;

  const sections: DateSection[] = [
    { key: 'overdue', title: 'Atrasadas', items: asTasks(pending.filter((item) => isTaskOverdue(item, now))) },
    {
      key: 'today',
      title: 'Hoy',
      items: byTime([
        ...asTasks(pending.filter((item) => isTaskDueToday(item, now))),
        ...asExams(upcoming.filter((item) => isSameDay(new Date(item.date), now))),
      ]),
    },
    {
      key: 'week',
      title: 'Esta semana',
      items: byTime([
        ...asTasks(notToday.filter((item) => inWeek(new Date(item.dueDate as string).getTime()))),
        ...asExams(examsLater.filter((item) => inWeek(new Date(item.date).getTime()))),
      ]),
    },
    {
      key: 'later',
      title: 'Más adelante',
      // byTime puts undated tasks (Infinity) last.
      items: byTime([
        ...asTasks(notToday.filter((item) => !inWeek(new Date(item.dueDate as string).getTime()))),
        ...asTasks(pending.filter((item) => !item.dueDate)),
        ...asExams(examsLater.filter((item) => !inWeek(new Date(item.date).getTime()))),
      ]),
    },
    { key: 'completed', title: 'Completadas', items: asTasks(tasks.filter((item) => item.completed)) },
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
