import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { getReminderAnchor, withDueTime } from '@/features/tasks/task-date-utils';

const day = new Date(2026, 9, 29, 9, 41).toISOString();

describe('getReminderAnchor', () => {
  test('uses the due time when there is one', () => {
    const anchor = getReminderAnchor({ dueDate: day, dueTime: '16:30' });
    assert.deepEqual([anchor?.getDate(), anchor?.getHours(), anchor?.getMinutes()], [29, 16, 30]);
  });

  test('falls back to 18:00 that day', () => {
    const anchor = getReminderAnchor({ dueDate: day, dueTime: null });
    assert.deepEqual([anchor?.getDate(), anchor?.getHours(), anchor?.getMinutes()], [29, 18, 0]);
  });

  test('no date, no anchor', () => {
    assert.equal(getReminderAnchor({ dueDate: null, dueTime: '10:00' }), null);
  });
});

describe('withDueTime', () => {
  test('stores the date at the due time', () => {
    const stored = new Date(withDueTime(new Date(2026, 9, 29, 9, 41), '08:15'));
    assert.deepEqual([stored.getDate(), stored.getHours(), stored.getMinutes()], [29, 8, 15]);
  });

  test('without a time, stores the start of the day', () => {
    const stored = new Date(withDueTime(new Date(2026, 9, 29, 9, 41), null));
    assert.deepEqual([stored.getDate(), stored.getHours(), stored.getMinutes()], [29, 0, 0]);
  });
});
