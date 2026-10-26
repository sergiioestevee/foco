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
