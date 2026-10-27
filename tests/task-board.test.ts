import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  buildSubjectBoard,
  collapsedLabel,
  formatDueLabel,
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

  test('collapses subjects with nothing in the next 7 days', () => {
    const collapsed = Object.fromEntries(board.map((card) => [card.category.name, card.collapsed]));
    assert.deepEqual(collapsed, { Programación: false, Cálculo: false, Inglés: true, Física: true });
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

  test('pending tasks without a date or far away keep the card expanded', () => {
    const cards = buildSubjectBoard({
      subjects: [subjects[0], subjects[1]],
      projects: [],
      exams: [],
      tasks: [task('sin fecha', forSubject('calc')), task('lejos', { ...forSubject('prog'), dueDate: on(11, 20) })],
    }, now);
    assert.deepEqual(cards.map((card) => card.collapsed), [false, false]);
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

  test('shows the exam countdown', () => assert.equal(label('Inglés'), 'Examen en 12 días'));
  test('shows pending count', () => assert.equal(label('Física'), '3 pendientes'));
  test('says it is up to date', () => assert.equal(label('Cálculo'), 'Al día'));
});

describe('groupByDate', () => {
  const sections = groupByDate(
    [
      task('atrasada', { dueDate: on(9, 24) }),
      task('hoy', { dueDate: on(9, 26) }),
      task('jueves', { dueDate: on(9, 29) }),
      task('noviembre', { dueDate: on(10, 10) }),
      task('sin fecha'),
      task('hecha', { dueDate: on(9, 26), completed: true }),
    ],
    [exam('examen hoy', null, on(9, 26, 18)), exam('examen viernes', null, on(9, 30)), exam('pasado', null, on(9, 24))],
    now,
  );
  const ids = (key: string) => sections.find((section) => section.key === key)?.items
    .map((item) => (item.type === 'task' ? item.task.id : item.exam.id));

  test('sections come in order', () => {
    assert.deepEqual(sections.map((section) => section.key), ['overdue', 'today', 'week', 'later', 'completed']);
    assert.deepEqual(sections.map((section) => section.title), ['Atrasadas', 'Hoy', 'Esta semana', 'Más adelante', 'Completadas']);
  });

  test('puts tasks and exams in their day', () => {
    assert.deepEqual(ids('today')?.sort(), ['examen hoy', 'hoy']);
    assert.deepEqual(ids('week')?.sort(), ['examen viernes', 'jueves']);
    assert.deepEqual(ids('completed'), ['hecha']);
  });

  test('past exams do not appear', () => {
    assert.ok(!sections.some((section) => section.items.some((item) => item.type === 'exam' && item.exam.id === 'pasado')));
  });

  test('undated tasks go last in «Más adelante»', () => {
    assert.deepEqual(ids('later'), ['noviembre', 'sin fecha']);
  });

  test('nothing to show gives no sections', () => {
    assert.deepEqual(groupByDate([], [], now), []);
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
