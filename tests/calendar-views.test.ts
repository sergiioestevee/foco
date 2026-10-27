import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { getMonthGrid, getUpcomingDays, toDayKey } from '@/features/calendar/calendar-utils';
import type { Exam, Task } from '@/types/models';

describe('getMonthGrid', () => {
  // October 2026 starts on a Thursday and ends on a Saturday.
  const weeks = getMonthGrid(new Date(2026, 9, 15));

  test('whole weeks, Monday first, covering the month', () => {
    assert.equal(toDayKey(weeks[0][0]), '2026-09-28');
    assert.equal(toDayKey(weeks.at(-1)!.at(-1)!), '2026-11-01');
    assert.ok(weeks.every((week) => week.length === 7));
    assert.equal(weeks.length, 5);
  });
});

describe('getUpcomingDays', () => {
  const from = new Date(2026, 9, 27, 9, 0);
  const empty = { scheduleBlocks: [], studyBlocks: [], exams: [] as Exam[], tasks: [] as Task[], routines: [] };

  test('only days with something, in order', () => {
    const exam = { id: 'e', subjectId: null, title: 'Parcial', date: new Date(2026, 9, 29, 10).toISOString(), room: '', reviewProgress: 0, createdAt: '' };
    const task = { id: 't', dueDate: new Date(2026, 9, 27).toISOString(), completed: false } as Task;
    const days = getUpcomingDays(from, 14, { ...empty, exams: [exam], tasks: [task] });
    assert.deepEqual(days.map((day) => toDayKey(day.day)), ['2026-10-27', '2026-10-29']);
    assert.equal(days[1].agenda[0].type, 'exam');
    assert.equal(days[0].tasks.length, 1);
  });

  test('nothing planned, nothing listed', () => {
    assert.equal(getUpcomingDays(from, 14, empty).length, 0);
  });
});
