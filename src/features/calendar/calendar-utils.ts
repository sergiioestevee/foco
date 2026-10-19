import { format, isSameDay, parse } from 'date-fns';

import type { Exam, ScheduleBlock, StudyBlock, Task } from '@/types/models';

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
  | { type: 'exam'; key: string; startTime: string; endTime: null; exam: Exam };

type AgendaSource = {
  scheduleBlocks: ScheduleBlock[];
  studyBlocks: StudyBlock[];
  exams: Exam[];
};

/** Timed items of one day, in order: weekly classes, study blocks and exams. */
export function getAgenda(day: Date, { scheduleBlocks, studyBlocks, exams }: AgendaSource): AgendaItem[] {
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
  ];
  return items.sort((left, right) => left.startTime.localeCompare(right.startTime));
}

/** Tasks due on a given day. */
export function getTasksForDay(tasks: Task[], day: Date): Task[] {
  return tasks.filter((task) => task.dueDate && isSameDay(new Date(task.dueDate), day));
}

/** Whether a day has anything worth a dot in the week strip (weekly classes excluded, they repeat every week). */
export function dayHasEvents(day: Date, source: AgendaSource & { tasks: Task[] }): boolean {
  const dayKey = toDayKey(day);
  return source.studyBlocks.some((block) => block.date === dayKey)
    || source.exams.some((exam) => isSameDay(new Date(exam.date), day))
    || getTasksForDay(source.tasks, day).length > 0;
}
