import { set, subDays } from 'date-fns';

import { timeToMinutes } from '@/features/calendar/calendar-utils';
import { getReminderAnchor } from '@/features/tasks/task-date-utils';
import type { Exam, Routine, Task } from '@/types/models';

/** Exams are announced the evening before, at this hour. */
export const EXAM_REMINDER_HOUR = 20;

export function planTaskReminders(tasks: Task[], minutesBefore: number, now = new Date()) {
  return tasks
    .filter((task) => !task.completed)
    .map((task) => {
      const dueAt = getReminderAnchor(task);
      return dueAt ? { task, at: new Date(dueAt.getTime() - minutesBefore * 60_000) } : null;
    })
    .filter((plan): plan is { task: Task; at: Date } => plan !== null && plan.at > now)
    .sort((left, right) => left.at.getTime() - right.at.getTime());
}

export function planExamReminders(exams: Exam[], now = new Date()) {
  return exams
    .map((exam) => ({ exam, at: set(subDays(new Date(exam.date), 1), { hours: EXAM_REMINDER_HOUR, minutes: 0, seconds: 0, milliseconds: 0 }) }))
    .filter((plan) => !Number.isNaN(plan.at.getTime()) && plan.at > now)
    .sort((left, right) => left.at.getTime() - right.at.getTime());
}

/** One weekly reminder per routine day; weekday is Date.getDay() (0 is Sunday). */
export function planRoutineReminders(routines: Routine[]) {
  return routines.flatMap((routine) => {
    if (!routine.time) return [];
    const minutes = timeToMinutes(routine.time);
    return [...routine.weekdays].sort((left, right) => left - right).map((weekday) => ({ routine, weekday, hour: Math.floor(minutes / 60), minute: minutes % 60 }));
  });
}
