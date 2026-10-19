import { isBefore, isSameDay, startOfDay } from 'date-fns';

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
