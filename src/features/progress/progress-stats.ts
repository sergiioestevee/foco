import { addDays, endOfWeek, format, isWithinInterval, startOfWeek, subDays } from 'date-fns';

import { fromDayKey, toDayKey } from '@/features/calendar/calendar-utils';
import { getRoutinesForDay, isRoutineDoneOn } from '@/features/routines/routine-utils';
import { belongsToDailyProgress, sortTasksByDueDateAndPriority } from '@/features/tasks/task-date-utils';
import type { Goal, Routine, StudyBlock, Task } from '@/types/models';

export type Ratio = { completed: number; total: number };

type Workload = { tasks: Task[]; studyBlocks: StudyBlock[]; routines?: Routine[] };

export function toFraction({ completed, total }: Ratio): number {
  return total > 0 ? completed / total : 0;
}

export function toPercent(ratio: Ratio): number {
  return Math.round(toFraction(ratio) * 100);
}

/** Today's tasks, study blocks and routines (in display order) and how many of them are done. */
export function getDayProgress({ tasks, studyBlocks, routines = [] }: Workload, includeOverdue: boolean, now = new Date()) {
  const dayTasks = sortTasksByDueDateAndPriority(tasks.filter((task) => belongsToDailyProgress(task, includeOverdue, now)));
  const todayKey = toDayKey(now);
  const dayBlocks = studyBlocks
    .filter((block) => block.date === todayKey)
    .sort((left, right) => left.startTime.localeCompare(right.startTime));
  const dayRoutines = getRoutinesForDay(routines, now);
  const done = [...dayTasks, ...dayBlocks].filter((item) => item.completed).length
    + dayRoutines.filter((routine) => isRoutineDoneOn(routine, now)).length;
  return {
    tasks: dayTasks,
    studyBlocks: dayBlocks,
    routines: dayRoutines,
    completed: done,
    total: dayTasks.length + dayBlocks.length + dayRoutines.length,
  };
}

/** Tasks due, study blocks planned and routine occurrences this week (Monday to Sunday). */
export function getWeekProgress({ tasks, studyBlocks, routines = [] }: Workload, now = new Date()): Ratio {
  const interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  const items = [
    ...tasks.filter((task) => task.dueDate && isWithinInterval(new Date(task.dueDate), interval)),
    ...studyBlocks.filter((block) => isWithinInterval(fromDayKey(block.date), interval)),
  ];
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(interval.start, index));
  const routineDue = weekDays.flatMap((day) => getRoutinesForDay(routines, day).map((routine) => isRoutineDoneOn(routine, day)));
  return {
    completed: items.filter((item) => item.completed).length + routineDue.filter(Boolean).length,
    total: items.length + routineDue.length,
  };
}

export function getGoalsProgress(goals: Goal[]): Ratio {
  return { completed: goals.filter((goal) => goal.status === 'achieved').length, total: goals.length };
}

/**
 * Consecutive days with at least one completed task, study block or routine.
 * Today still counts as pending, so the streak survives until midnight.
 */
export function getStreak({ tasks, studyBlocks, routines = [] }: Workload, now = new Date()): number {
  const activeDays = new Set([
    ...[...tasks, ...studyBlocks].flatMap((item) => (item.completed && item.completedAt ? [dayKey(new Date(item.completedAt))] : [])),
    ...routines.flatMap((routine) => routine.completedDates),
  ]);
  let day = activeDays.has(dayKey(now)) ? now : subDays(now, 1);
  let streak = 0;
  while (activeDays.has(dayKey(day))) {
    streak += 1;
    day = subDays(day, 1);
  }
  return streak;
}

export function getGreeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour >= 6 && hour < 14) return 'Buenos días';
  if (hour >= 14 && hour < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
