import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { getRoutineStreak, getRoutineWeekStats, summarizeRoutinesWeek } from '@/features/routines/routine-utils';
import type { Routine } from '@/types/models';

// Tuesday 27 October 2026, 18:00.
const now = new Date(2026, 9, 27, 18, 0);
const routine = (weekdays: number[], completedDates: string[]): Routine => ({
  id: 'r', title: 'r', weekdays, time: null, subjectId: null, completedDates, createdAt: '',
});
const weekdaysOnly = [1, 2, 3, 4, 5];

describe('getRoutineStreak', () => {
  test('counts due days done in a row, skipping days it is not due', () => {
    // Today (Tue) not done yet doesn't break it: Mon 26, Fri 23, Thu 22, Wed 21 → 4; Tue 20 missed.
    assert.equal(getRoutineStreak(routine(weekdaysOnly, ['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-26']), now), 4);
  });

  test('today counts once done', () => {
    assert.equal(getRoutineStreak(routine(weekdaysOnly, ['2026-10-26', '2026-10-27']), now), 2);
  });

  test('a weekly routine', () => {
    assert.equal(getRoutineStreak(routine([1], ['2026-10-19', '2026-10-26']), now), 2);
  });

  test('a missed due day breaks it', () => {
    assert.equal(getRoutineStreak(routine(weekdaysOnly, ['2026-10-23']), now), 0);
  });

  test('no history', () => {
    assert.equal(getRoutineStreak(routine(weekdaysOnly, []), now), 0);
  });
});

describe('getRoutineWeekStats', () => {
  test('due days from Monday to today, and how many were done', () => {
    assert.deepEqual(getRoutineWeekStats(routine(weekdaysOnly, ['2026-10-26']), now), { done: 1, due: 2 });
  });

  test('days before the routine was created are not counted', () => {
    const createdToday = { ...routine(weekdaysOnly, ['2026-10-27']), createdAt: new Date(2026, 9, 27, 9, 0).toISOString() };
    assert.deepEqual(getRoutineWeekStats(createdToday, now), { done: 1, due: 1 });
  });

  test('later days of the week are not counted yet', () => {
    assert.deepEqual(getRoutineWeekStats(routine([5], []), now), { done: 0, due: 0 });
  });
});

describe('summarizeRoutinesWeek', () => {
  test('adds up all routines', () => {
    const routines = [routine(weekdaysOnly, ['2026-10-26', '2026-10-27']), routine([1], [])];
    assert.deepEqual(summarizeRoutinesWeek(routines, now), { done: 2, due: 3 });
  });
});
