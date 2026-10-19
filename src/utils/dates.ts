import { addDays, isBefore, isSameDay, startOfDay } from 'date-fns';

export function isDueToday(isoDate: string | null, now = new Date()): boolean {
  return isoDate !== null && isSameDay(new Date(isoDate), now);
}

export function isOverdue(isoDate: string | null, now = new Date()): boolean {
  return isoDate !== null && isBefore(new Date(isoDate), startOfDay(now));
}

export function isUpcoming(isoDate: string | null, now = new Date()): boolean {
  return isoDate !== null && !isSameDay(new Date(isoDate), now) && !isOverdue(isoDate, now);
}

export function tomorrowStart(now = new Date()): Date {
  return startOfDay(addDays(now, 1));
}

export function formatDueDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}
