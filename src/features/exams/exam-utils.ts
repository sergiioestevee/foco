import { differenceInCalendarDays, format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

import type { Exam } from '@/types/models';

/** Exams from today on, soonest first. */
export function getUpcomingExams(exams: Exam[], now = new Date()): Exam[] {
  const today = startOfDay(now).getTime();
  return exams
    .filter((exam) => new Date(exam.date).getTime() >= today)
    .sort((left, right) => left.date.localeCompare(right.date));
}

/** Exams before today, most recent first. */
export function getPastExams(exams: Exam[], now = new Date()): Exam[] {
  const today = startOfDay(now).getTime();
  return exams
    .filter((exam) => new Date(exam.date).getTime() < today)
    .sort((left, right) => right.date.localeCompare(left.date));
}

/** True from the day after the exam on. */
export function isExamPast(exam: Pick<Exam, 'date'>, now = new Date()): boolean {
  return differenceInCalendarDays(new Date(exam.date), now) < 0;
}

/** "hoy", "mañana", "en 5 días", "hace 2 días". */
export function formatCountdown(date: string, now = new Date()): string {
  const days = differenceInCalendarDays(new Date(date), now);
  if (days === 0) return 'hoy';
  if (days === 1) return 'mañana';
  if (days > 1) return `en ${days} días`;
  return days === -1 ? 'ayer' : `hace ${-days} días`;
}

/** "Viernes 24 oct · 10:00 · Aula 2.04" */
export function formatExamWhen(exam: Pick<Exam, 'date' | 'room'>): string {
  const label = format(new Date(exam.date), "EEEE d MMM '·' HH:mm", { locale: es }).replace('.', '');
  return [label.charAt(0).toUpperCase() + label.slice(1), exam.room.trim() || null].filter(Boolean).join(' · ');
}

export function clampReviewProgress(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}
