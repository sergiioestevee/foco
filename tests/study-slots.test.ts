import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { getStudySlots } from '@/features/calendar/calendar-utils';
import type { ScheduleBlock } from '@/types/models';

// Wednesday; `now` is the day before so the whole day counts.
const day = new Date(2026, 9, 28);
const now = new Date(2026, 9, 27, 12, 0);
const empty = { scheduleBlocks: [] as ScheduleBlock[], studyBlocks: [], exams: [], routines: [] };
const slots = (profile: Parameters<typeof getStudySlots>[3], source = empty, on = day) =>
  getStudySlots(on, source, now, profile).map((slot) => `${slot.startTime}-${slot.endTime}`);

describe('getStudySlots', () => {
  test('only inside the focus period', () => {
    assert.deepEqual(slots({ focusTime: 'afternoon', classTime: null }), ['15:00-21:00']);
    assert.deepEqual(slots({ focusTime: 'night', classTime: null }), ['20:00-23:30']);
  });

  test('without preferences, the whole day as before', () => {
    assert.deepEqual(slots({ focusTime: null, classTime: null }), ['09:00-22:00']);
  });

  test('assumed class time is busy on weekdays while no classes are added', () => {
    assert.deepEqual(slots({ focusTime: null, classTime: 'morning' }), ['14:00-22:00']);
  });

  test('weekends are free of assumed classes', () => {
    assert.deepEqual(slots({ focusTime: null, classTime: 'morning' }, empty, new Date(2026, 9, 31)), ['09:00-22:00']);
  });

  test('real classes replace the assumed ones', () => {
    const lecture: ScheduleBlock = { id: 'c', weekday: 3, startTime: '10:00', endTime: '12:00', place: '', color: '#000', categoryId: null, categoryType: null };
    assert.deepEqual(slots({ focusTime: null, classTime: 'morning' }, { ...empty, scheduleBlocks: [lecture] }), ['09:00-10:00', '12:00-22:00']);
  });

  test('studying and classes in the same period: study around the classes', () => {
    assert.deepEqual(slots({ focusTime: 'morning', classTime: 'morning' }), ['14:00-22:00']);
  });
});
