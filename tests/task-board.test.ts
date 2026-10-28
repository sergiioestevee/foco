import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  buildSubjectBoard,
  collapsedLabel,
  formatDueLabel,
  openLabel,
  groupByDate,
  summarizeGoals,
  summarizeRoutinesToday,
} from '@/features/tasks/task-board';
import type { Exam, Goal, PersonalProject, Routine, Subject, Task } from '@/types/models';

// Monday 26 October 2026, 17:00.
const now = new Date(2026, 9, 26, 17, 0);
const on = (month: number, day: number, hour = 10) => new Date(2026, month, day, hour).toISOString();

const subject = (id: string, name: string, order: number): Subject => ({ id, name, color: '#8B8FFF', order });
const task = (id: string, changes: Partial<Task> = {}): Task => ({
  id, kind: 'task', title: id, notes: '', dueDate: null, priority: 'medium', completed: false, completedAt: null,
  createdAt: '', goalId: null, categoryId: null, categoryType: null, ...changes,
});
const exam = (id: string, subjectId: string | null, date: string): Exam => ({
  id, subjectId, title: id, date, room: '', reviewProgress: 0, createdAt: '',
});
const forSubject = (id: string): Pick<Task, 'categoryId' | 'categoryType'> => ({ categoryId: id, categoryType: 'subject' });

const subjects = [subject('calc', 'Cálculo', 0), subject('prog', 'Programación', 1), subject('ing', 'Inglés', 2), subject('fis', 'Física', 3)];

describe('buildSubjectBoard', () => {
  const board = buildSubjectBoard({
    subjects,
    projects: [],
    tasks: [task('atrasada', { ...forSubject('prog'), dueDate: on(9, 24) })],
    exams: [exam('parcial', 'calc', on(9, 31)), exam('oral', 'ing', on(10, 7))],
  }, now);

  test('orders subjects by urgency, then empty ones last', () => {
    assert.deepEqual(board.map((card) => card.category.name), ['Programación', 'Cálculo', 'Inglés', 'Física']);
  });

  test('opens subjects with an exam in the next 14 days or an urgent task', () => {
    const collapsed = Object.fromEntries(board.map((card) => [card.category.name, card.collapsed]));
    assert.deepEqual(collapsed, { Programación: false, Cálculo: false, Inglés: false, Física: true });
  });

  test('a task due in 3 days keeps its subject expanded', () => {
    const [card] = buildSubjectBoard({ subjects: [subjects[0]], projects: [], exams: [], tasks: [task('t', { ...forSubject('calc'), dueDate: on(9, 29) })] }, now);
    assert.equal(card.collapsed, false);
  });

  test('tasks of a deleted subject go to «Sin asignatura»', () => {
    const cards = buildSubjectBoard({ subjects, projects: [], exams: [], tasks: [task('huérfana', forSubject('borrada'))] }, now);
    const none = cards.find((card) => card.category.key === 'none');
    assert.equal(none?.category.name, 'Sin asignatura');
    assert.deepEqual(none?.pending.map((item) => item.id), ['huérfana']);
  });

  test('without subjects, loose tasks make a single «Sin asignatura» card', () => {
    const cards = buildSubjectBoard({ subjects: [], projects: [], exams: [], tasks: [task('a'), task('b')] }, now);
    assert.deepEqual(cards.map((card) => card.category.key), ['none']);
  });

  test('projects appear after subjects only when they have pending tasks', () => {
    const projects: PersonalProject[] = [
      { id: 'app', name: 'Mi app', description: '', color: '#B79AE8', targetDate: null, status: 'active' },
      { id: 'viaje', name: 'Viaje', description: '', color: '#80C6B5', targetDate: null, status: 'active' },
    ];
    const cards = buildSubjectBoard({
      subjects: [subjects[0]],
      projects,
      exams: [],
      tasks: [
        task('codigo', { categoryId: 'app', categoryType: 'project' }),
        task('hecha', { categoryId: 'viaje', categoryType: 'project', completed: true }),
      ],
    }, now);
    assert.deepEqual(cards.map((card) => card.category.name), ['Cálculo', 'Mi app']);
  });

  test('pending tasks without a date or far away fold the card', () => {
    const cards = buildSubjectBoard({
      subjects: [subjects[0], subjects[1]],
      projects: [],
      exams: [],
      tasks: [task('sin fecha', forSubject('calc')), task('lejos', { ...forSubject('prog'), dueDate: on(11, 20) })],
    }, now);
    assert.deepEqual(cards.map((card) => card.collapsed), [true, true]);
  });

  test('high priority, overdue or due within 3 days are important; the rest wait behind «+N»', () => {
    const [card] = buildSubjectBoard({
      subjects: [subjects[0]],
      projects: [],
      exams: [],
      tasks: [
        task('alta', { ...forSubject('calc'), priority: 'high', dueDate: on(11, 20) }),
        task('pronto', { ...forSubject('calc'), dueDate: on(9, 29) }),
        task('lejos', { ...forSubject('calc'), dueDate: on(10, 10) }),
        task('sin fecha', forSubject('calc')),
      ],
    }, now);
    assert.equal(card.collapsed, false);
    assert.deepEqual(card.important.map((item) => item.id).sort(), ['alta', 'pronto']);
    assert.deepEqual(card.others.map((item) => item.id), ['lejos', 'sin fecha']);
  });

  test('«Sin asignatura» with only completed tasks still shows, so they stay reachable', () => {
    const cards = buildSubjectBoard({ subjects: [], projects: [], exams: [], tasks: [task('hecha', { completed: true })] }, now);
    assert.deepEqual(cards.map((card) => [card.category.key, card.completed.length]), [['none', 1]]);
  });

  test('an exam earlier today still counts', () => {
    const [card] = buildSubjectBoard({ subjects: [subjects[0]], projects: [], tasks: [], exams: [exam('hoy', 'calc', on(9, 26, 9))] }, now);
    assert.deepEqual(card.exams.map((item) => item.id), ['hoy']);
    assert.notEqual(card.urgency, null);
    assert.equal(card.collapsed, false);
  });
});

describe('collapsedLabel', () => {
  const board = buildSubjectBoard({
    subjects,
    projects: [],
    tasks: [task('a', forSubject('fis')), task('b', forSubject('fis')), task('c', forSubject('fis'))],
    exams: [exam('oral', 'ing', on(10, 7))],
  }, now);
  const label = (name: string) => collapsedLabel(board.find((card) => card.category.name === name)!, now);

  test('counts what is inside: exams and pending tasks', () => {
    assert.equal(label('Inglés'), '+1');
    assert.equal(label('Física'), '+3');
  });
  test('says it is up to date', () => assert.equal(label('Cálculo'), 'Al día'));
});

describe('openLabel', () => {
  const [card] = buildSubjectBoard({
    subjects: [subjects[0]],
    projects: [],
    tasks: [task('a', { ...forSubject('calc'), priority: 'high' }), task('b', { ...forSubject('calc'), dueDate: on(9, 27) }), task('c', forSubject('calc'))],
    exams: [exam('parcial', 'calc', on(9, 31))],
  }, now);

  test('sums up what is urgent', () => assert.equal(openLabel(card, now), 'Examen en 5 días · 2 urgentes'));

  test('a card opened by hand with nothing urgent shows its pending count', () => {
    const [quiet] = buildSubjectBoard({ subjects: [subjects[0]], projects: [], exams: [], tasks: [task('c', forSubject('calc'))] }, now);
    assert.equal(openLabel(quiet, now), '1 pendiente');
  });
});

describe('groupByDate', () => {
  // The default range: today and the next 14 days.
  const range = { from: new Date(2026, 9, 26), to: new Date(2026, 10, 9) };
  const sections = groupByDate(
    [
      task('atrasada', { dueDate: on(9, 24) }),
      task('hoy', { dueDate: on(9, 26) }),
      task('jueves', { dueDate: on(9, 29) }),
      task('fuera', { dueDate: on(10, 20) }),
      task('sin fecha'),
      task('hecha', { dueDate: on(9, 26), completed: true }),
      task('hecha fuera', { dueDate: on(10, 25), completed: true }),
    ],
    [exam('examen hoy', null, on(9, 26, 18)), exam('examen viernes', null, on(9, 30)), exam('pasado', null, on(9, 24))],
    range,
    now,
  );
  const ids = (key: string) => sections.find((section) => section.key === key)?.items
    .map((item) => (item.type === 'task' ? item.task.id : item.exam.id));

  test('overdue first, then one section per day, undated and completed last', () => {
    assert.deepEqual(sections.map((section) => section.key), ['overdue', 'day:2026-10-26', 'day:2026-10-29', 'day:2026-10-30', 'undated', 'completed']);
    assert.deepEqual(sections.map((section) => section.title), [
      'Atrasadas', 'Hoy · lunes 26', 'Jueves 29 de octubre', 'Viernes 30 de octubre', 'Sin fecha', 'Completadas',
    ]);
  });

  test('puts tasks and exams in their day', () => {
    assert.deepEqual(ids('day:2026-10-26')?.sort(), ['examen hoy', 'hoy']);
    assert.deepEqual(ids('day:2026-10-30'), ['examen viernes']);
  });

  test('leaves out what falls outside the range', () => {
    const all = sections.flatMap((section) => section.items.map((item) => (item.type === 'task' ? item.task.id : item.exam.id)));
    assert.ok(!all.includes('fuera') && !all.includes('hecha fuera') && !all.includes('pasado'));
    assert.deepEqual(ids('completed'), ['hecha']);
  });

  test('a range that does not reach today has no «Atrasadas»', () => {
    const later = groupByDate([task('atrasada', { dueDate: on(9, 24) }), task('fuera', { dueDate: on(10, 20) })], [], { from: new Date(2026, 10, 15), to: new Date(2026, 10, 30) }, now);
    assert.deepEqual(later.map((section) => section.key), ['day:2026-11-20']);
  });

  test('nothing to show gives no sections', () => {
    assert.deepEqual(groupByDate([], [], range, now), []);
  });
});

describe('summarizeRoutinesToday', () => {
  const routine = (id: string, weekdays: number[], time: string | null, completedDates: string[] = []): Routine => ({
    id, title: id, weekdays, time, subjectId: null, completedDates, createdAt: '',
  });
  const routines = [routine('plan', [1, 2, 3, 4, 5], '22:00', ['2026-10-26']), routine('gimnasio', [1], '08:00')];

  test('counts what is due and done today and the next pending one', () => {
    const summary = summarizeRoutinesToday(routines, now);
    assert.equal(summary.done, 1);
    assert.equal(summary.total, 2);
    assert.equal(summary.next?.id, 'gimnasio');
  });

  test('a day with no routines', () => {
    assert.deepEqual(summarizeRoutinesToday(routines, new Date(2026, 10, 1, 12)), { done: 0, total: 0, next: null });
  });
});

describe('summarizeGoals', () => {
  const goal = (id: string, status: Goal['status']): Goal => ({
    id, title: id, description: '', targetDate: null, status, taskIds: [], categoryId: null, categoryType: null,
  });
  const project: PersonalProject = { id: 'app', name: 'Mi app', description: '', color: '', targetDate: null, status: 'active' };

  test('averages progress of goals in progress and active projects', () => {
    const summary = summarizeGoals(
      [goal('aprobar', 'inProgress'), goal('logrado', 'achieved')],
      [project],
      [
        task('t1', { goalId: 'aprobar', completed: true }),
        task('t2', { goalId: 'aprobar' }),
        task('t3', { categoryId: 'app', categoryType: 'project', completed: true }),
      ],
    );
    assert.deepEqual(summary, { percent: 75, goals: 1, projects: 1 });
  });

  test('no linked tasks means no percentage', () => {
    assert.deepEqual(summarizeGoals([goal('aprobar', 'inProgress')], [], []), { percent: null, goals: 1, projects: 0 });
  });
});

describe('formatDueLabel', () => {
  test('today and tomorrow', () => {
    assert.deepEqual(formatDueLabel(on(9, 26), now), { label: 'hoy', overdue: false });
    assert.equal(formatDueLabel(on(9, 27), now).label, 'mañana');
  });
  test('weekday within the next days', () => assert.equal(formatDueLabel(on(9, 29), now).label, 'jueves'));
  test('short date further away', () => assert.equal(formatDueLabel(on(10, 10), now).label, '10 nov'));
  test('overdue', () => assert.equal(formatDueLabel(on(9, 24), now).overdue, true));
});
