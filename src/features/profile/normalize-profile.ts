import { isAvatarId } from '@/features/profile/avatars';
import type { AgeCheck, ClassTime, FocusTime, UserProfile } from '@/types/models';

const focusTimes: FocusTime[] = ['morning', 'afternoon', 'night'];
const classTimes: ClassTime[] = [...focusTimes, 'none'];
const ageChecks: AgeCheck[] = ['over14', 'parentalConsent'];

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
    classTime: classTimes.includes(profile.classTime as ClassTime) ? profile.classTime as ClassTime : null,
    avatar: isAvatarId(profile.avatar) ? profile.avatar : null,
    ageCheck: ageChecks.includes(profile.ageCheck as AgeCheck) ? profile.ageCheck as AgeCheck : null,
  };
}
