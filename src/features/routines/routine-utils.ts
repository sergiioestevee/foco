import { addDays, startOfWeek, subDays } from 'date-fns';

import { toDayKey } from '@/features/calendar/calendar-utils';
import type { Routine } from '@/types/models';

/** Monday first; values follow Date.getDay(). */
export const weekdayOptions = [
  { value: 1, short: 'L', name: 'lunes' },
  { value: 2, short: 'M', name: 'martes' },
  { value: 3, short: 'X', name: 'miércoles' },
  { value: 4, short: 'J', name: 'jueves' },
  { value: 5, short: 'V', name: 'viernes' },
  { value: 6, short: 'S', name: 'sábado' },
  { value: 0, short: 'D', name: 'domingo' },
] as const;

export function isRoutineDue(routine: Routine, day: Date): boolean {
  return routine.weekdays.includes(day.getDay());
}

export function isRoutineDoneOn(routine: Routine, day: Date): boolean {
  return routine.completedDates.includes(toDayKey(day));
}

/** Routines that apply to a day: timed ones by time, then the "any time" ones. */
export function getRoutinesForDay(routines: Routine[], day: Date): Routine[] {
  return routines
    .filter((routine) => isRoutineDue(routine, day))
    .sort((left, right) => (left.time ?? '99:99').localeCompare(right.time ?? '99:99'));
}

/** "Todos los días", "De lunes a viernes", "Fines de semana" or "L · X · V". */
export function formatWeekdays(weekdays: number[]): string {
  const days = new Set(weekdays);
  if (days.size === 7) return 'Todos los días';
  if (days.size === 5 && [1, 2, 3, 4, 5].every((day) => days.has(day))) return 'De lunes a viernes';
  if (days.size === 2 && days.has(0) && days.has(6)) return 'Fines de semana';
  return weekdayOptions.filter((option) => days.has(option.value)).map((option) => option.short).join(' · ');
}

/** How far back a streak is looked for; completion history is kept for about this long. */
const STREAK_LOOKBACK_DAYS = 120;

/**
 * Due days in a row on which the routine was done. Days it isn't due don't break it, and neither
 * does today while it's still pending.
 */
export function getRoutineStreak(routine: Routine, now = new Date()): number {
  let streak = 0;
  for (let offset = 0; offset < STREAK_LOOKBACK_DAYS; offset += 1) {
    const day = subDays(now, offset);
    if (!isRoutineDue(routine, day)) continue;
    if (isRoutineDoneOn(routine, day)) streak += 1;
    else if (offset > 0) break;
  }
  return streak;
}

/** This week (Monday to today): how many times it was due and how many of those it was done. */
export function getRoutineWeekStats(routine: Routine, now = new Date()): { done: number; due: number } {
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  let done = 0;
  let due = 0;
  for (let day = monday; toDayKey(day) <= toDayKey(now); day = addDays(day, 1)) {
    if (!isRoutineDue(routine, day)) continue;
    due += 1;
    if (isRoutineDoneOn(routine, day)) done += 1;
  }
  return { done, due };
}

export function summarizeRoutinesWeek(routines: Routine[], now = new Date()): { done: number; due: number } {
  return routines
    .map((routine) => getRoutineWeekStats(routine, now))
    .reduce((total, stats) => ({ done: total.done + stats.done, due: total.due + stats.due }), { done: 0, due: 0 });
}
