import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { planExamReminders, planRoutineReminders, planTaskReminders } from '@/services/reminder-plan';
import type { Exam, Routine, Task } from '@/types/models';

const now = new Date(2026, 9, 27, 12, 0);

const task = (changes: Partial<Task>): Task => ({
  id: 't', kind: 'task', title: 'Memoria', notes: '', dueDate: null, dueTime: null, priority: 'medium',
  goalId: null, categoryId: null, categoryType: null, completed: false, createdAt: now.toISOString(), ...changes,
} as Task);

const exam = (changes: Partial<Exam>): Exam => ({
  id: 'e', subjectId: null, title: 'Parcial 1', date: now.toISOString(), room: '', reviewProgress: 0, createdAt: now.toISOString(), ...changes,
});

const routine = (changes: Partial<Routine>): Routine => ({
  id: 'r', title: 'Repaso', weekdays: [1, 3], time: '08:30', subjectId: null, completedDates: [], createdAt: now.toISOString(), ...changes,
});

describe('planTaskReminders', () => {
  test('minutes before the due time', () => {
    const [plan] = planTaskReminders([task({ dueDate: new Date(2026, 9, 28).toISOString(), dueTime: '10:00' })], 30, now);
    assert.deepEqual([plan.at.getDate(), plan.at.getHours(), plan.at.getMinutes()], [28, 9, 30]);
  });

  test('skips done, undated and past reminders', () => {
    const plans = planTaskReminders([
      task({ id: 'done', completed: true, dueDate: new Date(2026, 9, 29).toISOString() }),
      task({ id: 'undated' }),
      task({ id: 'past', dueDate: new Date(2026, 9, 27).toISOString(), dueTime: '11:00' }),
    ], 30, now);
    assert.equal(plans.length, 0);
  });
});

describe('planExamReminders', () => {
  test('the evening before, at 20:00', () => {
    const [plan] = planExamReminders([exam({ date: new Date(2026, 9, 30, 10, 0).toISOString() })], now);
    assert.deepEqual([plan.at.getDate(), plan.at.getHours(), plan.at.getMinutes()], [29, 20, 0]);
  });

  test('none once that evening has passed', () => {
    assert.equal(planExamReminders([exam({ date: new Date(2026, 9, 28, 9, 0).toISOString() })], new Date(2026, 9, 27, 21, 0)).length, 0);
  });
});

describe('planRoutineReminders', () => {
  test('one weekly reminder per day, at its time', () => {
    const plans = planRoutineReminders([routine({})]);
    assert.deepEqual(plans.map((plan) => [plan.weekday, plan.hour, plan.minute]), [[1, 8, 30], [3, 8, 30]]);
  });

  test('routines without a time get none', () => {
    assert.equal(planRoutineReminders([routine({ time: null })]).length, 0);
  });
});
