import { isBefore, isSameDay, startOfDay } from 'date-fns';

import { timeToMinutes } from '@/features/calendar/calendar-utils';

import type { Task } from '@/types/models';

export function isTaskDueToday(task: Task, now = new Date()): boolean {
  return task.dueDate ? isSameDay(new Date(task.dueDate), now) : false;
}

export function isTaskOverdue(task: Task, now = new Date()): boolean {
  return !task.completed && task.dueDate
    ? isBefore(startOfDay(new Date(task.dueDate)), startOfDay(now))
    : false;
}

export function belongsToDailyProgress(task: Task, includeOverdue: boolean, now = new Date()): boolean {
  return isTaskDueToday(task, now) || (includeOverdue && isTaskOverdue(task, now));
}

export function sortTasksByDueDateAndPriority(tasks: Task[]): Task[] {
  const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
  return [...tasks].sort((left, right) => {
    if (left.dueDate && right.dueDate) {
      const dateDifference = startOfDay(new Date(left.dueDate)).getTime() - startOfDay(new Date(right.dueDate)).getTime();
      if (dateDifference !== 0) return dateDifference;
    } else if (left.dueDate) return -1;
    else if (right.dueDate) return 1;
    return priorityOrder[right.priority] - priorityOrder[left.priority];
  });
}

/** Reminders for tasks without a due time are anchored at this hour of the due day. */
const DEFAULT_REMINDER_HOUR = 18;

/** When a task's reminder counts back from: its due time, or 18:00 on the due day. */
export function getReminderAnchor(task: Pick<Task, 'dueDate' | 'dueTime'>): Date | null {
  if (!task.dueDate) return null;
  const anchor = new Date(task.dueDate);
  if (Number.isNaN(anchor.getTime())) return null;
  const minutes = task.dueTime ? timeToMinutes(task.dueTime) : DEFAULT_REMINDER_HOUR * 60;
  anchor.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return anchor;
}

/** ISO date to store for a due day: at the due time when there is one, else the start of the day. */
export function withDueTime(day: Date, dueTime: string | null): string {
  const stored = startOfDay(day);
  if (dueTime) {
    const minutes = timeToMinutes(dueTime);
    stored.setHours(Math.floor(minutes / 60), minutes % 60);
  }
  return stored.toISOString();
}
