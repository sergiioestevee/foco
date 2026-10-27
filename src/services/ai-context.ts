import { addDays, format, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

import { getStudySlots, toDayKey } from '@/features/calendar/calendar-utils';
import { getUpcomingExams } from '@/features/exams/exam-utils';
import { formatWeekdays } from '@/features/routines/routine-utils';
import { taskKindLabel } from '@/features/tasks/task-kinds';
import type { FocoState } from '@/store/use-foco-store';

const FREE_SLOT_DAYS = 7;
const TASK_HORIZON_DAYS = 21;
const STUDY_BLOCK_DAYS = 14;
const MAX_TASKS = 30;
const MAX_FREE_SLOTS = 40;

const focusTimeLabels = { morning: 'mañana', afternoon: 'tarde', night: 'noche' } as const;
const classTimeLabels = { ...focusTimeLabels, none: 'variable' } as const;

type ContextSource = Pick<
  FocoState,
  'profile' | 'subjects' | 'projects' | 'tasks' | 'exams' | 'studyBlocks' | 'routines' | 'scheduleBlocks'
>;

/** The exams, tasks and routines Foco IA sees, in the order their refs (E1, T1, R1…) are numbered. */
function referencedItems(state: ContextSource, now: Date) {
  const taskHorizon = addDays(startOfDay(now), TASK_HORIZON_DAYS);
  return {
    exams: getUpcomingExams(state.exams, now).slice(0, 10),
    tasks: state.tasks
      .filter((task) => !task.completed && task.dueDate && isBefore(new Date(task.dueDate), taskHorizon))
      .sort((left, right) => (left.dueDate ?? '').localeCompare(right.dueDate ?? ''))
      .slice(0, MAX_TASKS),
    routines: state.routines,
  };
}

const ref = (prefix: 'E' | 'T' | 'R', index: number) => `${prefix}${index + 1}`;

/** Maps the refs sent in the context back to real ids, so actions Foco IA proposes can find their target. */
export function buildAiRefs(state: ContextSource, now = new Date()): Record<string, string> {
  const items = referencedItems(state, now);
  return Object.fromEntries([
    ...items.exams.map((exam, index) => [ref('E', index), exam.id]),
    ...items.tasks.map((task, index) => [ref('T', index), task.id]),
    ...items.routines.map((routine, index) => [ref('R', index), routine.id]),
  ]);
}

/**
 * What Foco IA gets to know: only what it needs to plan. No name, email or ids (items carry short refs
 * like "E1" instead); dates are local days. Everything here may be processed by the AI provider, so keep it minimal.
 */
export function buildAiContext(state: ContextSource, now = new Date()) {
  const subjectName = (id: string | null) => state.subjects.find((subject) => subject.id === id)?.name;
  const categoryName = (categoryType: string | null, categoryId: string | null) => categoryType === 'subject'
    ? subjectName(categoryId)
    : state.projects.find((project) => project.id === categoryId)?.name;
  const today = startOfDay(now);
  const items = referencedItems(state, now);
  const blockHorizon = toDayKey(addDays(today, STUDY_BLOCK_DAYS));
  const agendaSource = { scheduleBlocks: state.scheduleBlocks, studyBlocks: state.studyBlocks, exams: state.exams, routines: state.routines };
  const preferences = { focusTime: state.profile?.focusTime ?? null, classTime: state.profile?.classTime ?? null };

  return {
    today: toDayKey(now),
    weekday: format(now, 'EEEE', { locale: es }),
    now: format(now, 'HH:mm'),
    studies: state.profile?.studies || undefined,
    focusTime: state.profile?.focusTime ? focusTimeLabels[state.profile.focusTime] : undefined,
    classTime: state.profile?.classTime ? classTimeLabels[state.profile.classTime] : undefined,
    subjects: [...state.subjects].sort((left, right) => left.order - right.order).map((subject) => subject.name),
    exams: items.exams.map((exam, index) => ({
      ref: ref('E', index),
      subject: subjectName(exam.subjectId),
      title: exam.title,
      date: toDayKey(new Date(exam.date)),
      time: format(new Date(exam.date), 'HH:mm'),
      reviewed: `${exam.reviewProgress}%`,
    })),
    pendingTasks: items.tasks.map((task, index) => ({
      ref: ref('T', index),
      title: task.title,
      kind: taskKindLabel(task.kind),
      subject: categoryName(task.categoryType, task.categoryId),
      due: toDayKey(new Date(task.dueDate as string)),
      time: format(new Date(task.dueDate as string), 'HH:mm'),
      priority: task.priority,
    })),
    studyBlocks: state.studyBlocks
      .filter((block) => block.date >= toDayKey(today) && block.date <= blockHorizon)
      .map((block) => ({ date: block.date, start: block.startTime, end: block.endTime, title: block.title, done: block.completed })),
    routines: items.routines.map((routine, index) => ({
      ref: ref('R', index),
      title: routine.title,
      days: formatWeekdays(routine.weekdays),
      time: routine.time ?? undefined,
      subject: subjectName(routine.subjectId),
    })),
    weeklyClasses: state.scheduleBlocks.map((block) => ({
      day: format(addDays(today, (block.weekday - today.getDay() + 7) % 7), 'EEEE', { locale: es }),
      start: block.startTime,
      end: block.endTime,
      subject: categoryName(block.categoryType, block.categoryId),
    })),
    // Only where they'd study: their focus period, minus their usual class time until real classes are added.
    freeSlots: Array.from({ length: FREE_SLOT_DAYS }, (_, index) => addDays(today, index))
      .flatMap((day) => getStudySlots(day, agendaSource, now, preferences).map((window) => ({ date: toDayKey(day), start: window.startTime, end: window.endTime })))
      .slice(0, MAX_FREE_SLOTS),
  };
}

export type AiContext = ReturnType<typeof buildAiContext>;
