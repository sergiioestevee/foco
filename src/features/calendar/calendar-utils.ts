import { format, isSameDay, parse } from 'date-fns';

import type { Exam, Routine, ScheduleBlock, StudyBlock, Task } from '@/types/models';

/** Local day as yyyy-MM-dd, the format StudyBlock.date uses. */
export function toDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function fromDayKey(key: string): Date {
  return parse(key, 'yyyy-MM-dd', new Date());
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function minutesToTime(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** "45 min", "1 h", "1 h 30 min". */
export function formatDuration(startTime: string, endTime: string): string {
  const minutes = Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export type AgendaItem =
  | { type: 'class'; key: string; startTime: string; endTime: string; block: ScheduleBlock }
  | { type: 'study'; key: string; startTime: string; endTime: string; block: StudyBlock }
  | { type: 'exam'; key: string; startTime: string; endTime: null; exam: Exam }
  | { type: 'routine'; key: string; startTime: string; endTime: null; routine: Routine; day: Date };

type AgendaSource = {
  scheduleBlocks: ScheduleBlock[];
  studyBlocks: StudyBlock[];
  exams: Exam[];
  routines?: Routine[];
};

/** Timed items of one day, in order: weekly classes, study blocks, exams and routines with a time. */
export function getAgenda(day: Date, { scheduleBlocks, studyBlocks, exams, routines = [] }: AgendaSource): AgendaItem[] {
  const dayKey = toDayKey(day);
  const items: AgendaItem[] = [
    ...scheduleBlocks
      .filter((block) => block.weekday === day.getDay())
      .map((block) => ({ type: 'class' as const, key: `class-${block.id}`, startTime: block.startTime, endTime: block.endTime, block })),
    ...studyBlocks
      .filter((block) => block.date === dayKey)
      .map((block) => ({ type: 'study' as const, key: `study-${block.id}`, startTime: block.startTime, endTime: block.endTime, block })),
    ...exams
      .filter((exam) => isSameDay(new Date(exam.date), day))
      .map((exam) => ({ type: 'exam' as const, key: `exam-${exam.id}`, startTime: format(new Date(exam.date), 'HH:mm'), endTime: null, exam })),
    ...routines
      .filter((routine) => routine.time && routine.weekdays.includes(day.getDay()))
      .map((routine) => ({ type: 'routine' as const, key: `routine-${routine.id}`, startTime: routine.time as string, endTime: null, routine, day })),
  ];
  return items.sort((left, right) => left.startTime.localeCompare(right.startTime));
}

/** Tasks due on a given day. */
export function getTasksForDay(tasks: Task[], day: Date): Task[] {
  return tasks.filter((task) => task.dueDate && isSameDay(new Date(task.dueDate), day));
}

/** Whether a day has anything worth a dot in the week strip (classes and routines excluded, they repeat every week). */
export function dayHasEvents(day: Date, source: AgendaSource & { tasks: Task[] }): boolean {
  const dayKey = toDayKey(day);
  return source.studyBlocks.some((block) => block.date === dayKey)
    || source.exams.some((exam) => isSameDay(new Date(exam.date), day))
    || getTasksForDay(source.tasks, day).length > 0;
}

const DAY_START = 9 * 60;
const DAY_END = 22 * 60;
/** Assumed length of items that only have a start time. */
const EXAM_MINUTES = 120;
const ROUTINE_MINUTES = 30;

export type FreeWindow = { startTime: string; endTime: string };

/**
 * Free time of a day between 09:00 and 22:00, after removing classes, study blocks, exams and
 * timed routines (and, for today, the time already gone). Windows shorter than `minMinutes` are dropped.
 */
export function getFreeWindows(day: Date, source: AgendaSource, now: Date, minMinutes = 30): FreeWindow[] {
  const busy = getAgenda(day, source)
    .map((item) => {
      const start = timeToMinutes(item.startTime);
      const end = item.endTime ? timeToMinutes(item.endTime) : start + (item.type === 'exam' ? EXAM_MINUTES : ROUTINE_MINUTES);
      return { start, end };
    })
    .sort((left, right) => left.start - right.start);

  let cursor = DAY_START;
  if (isSameDay(day, now)) cursor = Math.max(cursor, Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15);
  const windows: FreeWindow[] = [];
  for (const interval of [...busy, { start: DAY_END, end: DAY_END }]) {
    const end = Math.min(interval.start, DAY_END);
    if (end - cursor >= minMinutes) windows.push({ startTime: minutesToTime(cursor), endTime: minutesToTime(end) });
    cursor = Math.max(cursor, interval.end);
    if (cursor >= DAY_END) break;
  }
  return windows;
}
