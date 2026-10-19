import type { FocusTime, UserProfile } from '@/types/models';

const focusTimes: FocusTime[] = ['morning', 'afternoon', 'night'];

/**
 * Accepts any stored profile shape (including the old `{ name, age, focusGoals }`)
 * and returns the current one, so old local data and cloud snapshots keep working.
 */
export function normalizeProfile(value: unknown): UserProfile | null {
  if (!value || typeof value !== 'object') return null;
  const profile = value as Record<string, unknown>;
  if (typeof profile.name !== 'string') return null;

  return {
    name: profile.name,
    studies: typeof profile.studies === 'string' ? profile.studies : '',
    focusTime: focusTimes.includes(profile.focusTime as FocusTime) ? profile.focusTime as FocusTime : null,
  };
}
