import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  buildInput,
  extractText,
  parseRequest,
  RESPONSE_SCHEMA,
  sanitizeReply,
} from '../supabase/functions/foco-ai/logic.ts';

const valid = {
  messages: [{ role: 'user', content: ' ¿Qué estudio ahora? ' }],
  context: { today: '2026-10-19', subjects: ['Cálculo'] },
  memories: ['Estudia mejor por la tarde'],
};

describe('parseRequest', () => {
  test('accepts a valid request and trims messages', () => {
    const request = parseRequest(valid);
    assert.equal(request.messages[0].content, '¿Qué estudio ahora?');
    assert.equal(request.summary, '');
  });

  test('keeps the chat summary', () => {
    assert.equal(parseRequest({ ...valid, summary: ' - Objetivo: parcial ' }).summary, '- Objetivo: parcial');
  });

  const invalid: [string, unknown][] = [
    ['no body', null],
    ['empty object', {}],
    ['no messages', { ...valid, messages: [] }],
    ['unknown role', { ...valid, messages: [{ role: 'system', content: 'x' }] }],
    ['last turn not from the student', { ...valid, messages: [{ role: 'user', content: 'hola' }, { role: 'assistant', content: 'ey' }] }],
    ['too many messages', { ...valid, messages: Array.from({ length: 21 }, () => ({ role: 'user', content: 'x' })) }],
    ['message too long', { ...valid, messages: [{ role: 'user', content: 'x'.repeat(2001) }] }],
    ['bad today', { ...valid, context: { today: 'mañana' } }],
    ['context too big', { ...valid, context: { today: '2026-10-19', big: 'x'.repeat(30000) } }],
    ['too many memories', { ...valid, memories: Array.from({ length: 31 }, () => 'm') }],
    ['summary not a string', { ...valid, summary: 5 }],
    ['summary too long', { ...valid, summary: 'x'.repeat(2001) }],
  ];
  for (const [name, body] of invalid) {
    test(`rejects: ${name}`, () => assert.throws(() => parseRequest(body)));
  }
});

describe('buildInput', () => {
  test('includes conversation, memory and summary', () => {
    const input = buildInput(parseRequest({ ...valid, summary: '- Objetivo: preparar el parcial' }));
    assert.match(input, /Estudiante: ¿Qué estudio ahora\?/);
    assert.match(input, /- Estudia mejor por la tarde/);
    assert.match(input, /RESUMEN DEL CHAT[^\n]*\n- Objetivo: preparar el parcial/);
  });

  test('marks a new chat', () => {
    assert.match(buildInput(parseRequest(valid)), /\(chat nuevo\)/);
  });
});

describe('extractText', () => {
  test('reads Groq / OpenAI-style responses', () => {
    assert.equal(extractText({ choices: [{ message: { role: 'assistant', content: '{"message":"hola"}' } }] }), '{"message":"hola"}');
  });

  test('reads Gemini interaction and generateContent responses', () => {
    assert.equal(extractText({ output_text: '{"a":1}' }), '{"a":1}');
    assert.equal(
      extractText({ steps: [{ type: 'model_output', content: [{ type: 'text', text: '{"m":' }, { type: 'text', text: '1}' }] }] }),
      '{"m":1}',
    );
    assert.equal(extractText({ candidates: [{ content: { parts: [{ text: 'x' }] } }] }), 'x');
  });

  test('returns empty text for unknown shapes', () => {
    assert.equal(extractText({}), '');
  });
});

describe('sanitizeReply', () => {
  test('keeps only valid plan items, memories and summary', () => {
    const reply = sanitizeReply({
      message: ' Primero la práctica. ',
      chat_title: 'Plan del parcial',
      chat_summary: ' - Plan acordado ',
      plan: [
        { date: '2026-10-19', start_time: '17:00', end_time: '19:00', title: 'Práctica 2', subject: 'Programación' },
        { date: '2026-10-18', start_time: '17:00', end_time: '18:00', title: 'pasado', subject: '' },
        { date: '2026-11-10', start_time: '17:00', end_time: '18:00', title: 'lejos', subject: '' },
        { date: '2026-10-20', start_time: '19:00', end_time: '18:00', title: 'al revés', subject: '' },
        { date: '2026-10-20', start_time: '25:00', end_time: '26:00', title: 'hora mala', subject: '' },
        { date: '2026-10-20', start_time: '18:00', end_time: '19:30', title: '', subject: '' },
      ],
      remember: ['Estudia mejor por la tarde', '', 'x'.repeat(200), 4],
    }, '2026-10-19');
    assert.equal(reply.message, 'Primero la práctica.');
    assert.equal(reply.chatTitle, 'Plan del parcial');
    assert.equal(reply.chatSummary, '- Plan acordado');
    assert.deepEqual(reply.plan.map((item) => item.title), ['Práctica 2']);
    assert.deepEqual(reply.remember, ['Estudia mejor por la tarde']);
  });

  test('caps plan length and summary size', () => {
    const plan = Array.from({ length: 12 }, (_, index) => ({ date: '2026-10-20', start_time: '10:00', end_time: '11:00', title: `t${index}`, subject: '' }));
    const reply = sanitizeReply({ message: 'ok', plan, chat_summary: 'x'.repeat(5000) }, '2026-10-19');
    assert.equal(reply.plan.length, 8);
    assert.equal(reply.chatSummary.length, 1500);
  });

  const action = (overrides: Record<string, unknown>) => ({
    type: 'add_exam', ref: '', title: '', subject: '', date: '', time: '', room: '', task_kind: '', priority: '', weekdays: [],
    ...overrides,
  });

  test('keeps valid add actions and fills defaults', () => {
    const reply = sanitizeReply({
      message: 'Te lo dejo preparado.',
      actions: [
        action({ title: ' Parcial 1 ', subject: 'Cálculo', date: '2026-11-05', time: '10:00', room: 'A2' }),
        action({ date: '2027-06-10', time: '9h' }),
        action({ type: 'add_task', title: 'Entrega práctica 3', date: '2026-10-24', task_kind: 'delivery', priority: 'high', room: 'ignorado' }),
        action({ type: 'add_routine', title: 'Repasar inglés', weekdays: [5, 1, 1, 9, 3], time: '20:00', date: '2026-10-24' }),
      ],
    }, '2026-10-19');
    assert.deepEqual(reply.actions.map(({ type, title, date, time, room }) => ({ type, title, date, time, room })), [
      { type: 'add_exam', title: 'Parcial 1', date: '2026-11-05', time: '10:00', room: 'A2' },
      { type: 'add_exam', title: 'Examen', date: '2027-06-10', time: '', room: '' },
      { type: 'add_task', title: 'Entrega práctica 3', date: '2026-10-24', time: '', room: '' },
      { type: 'add_routine', title: 'Repasar inglés', date: '', time: '20:00', room: '' },
    ]);
    assert.equal(reply.actions[2].taskKind, 'delivery');
    assert.deepEqual(reply.actions[3].weekdays, [1, 3, 5]);
  });

  test('drops adds missing essentials', () => {
    const reply = sanitizeReply({
      message: 'ok',
      actions: [
        action({ title: 'sin fecha' }),
        action({ title: 'pasado', date: '2026-10-18' }),
        action({ title: 'demasiado lejos', date: '2028-01-01' }),
        action({ type: 'add_task', title: '' }),
        action({ type: 'add_routine', title: 'sin días' }),
        action({ type: 'fly_to_moon', title: 'x' }),
      ],
    }, '2026-10-19');
    assert.deepEqual(reply.actions, []);
  });

  test('updates and deletes need a ref of the right kind and something to change', () => {
    const reply = sanitizeReply({
      message: 'ok',
      actions: [
        action({ type: 'update_exam', ref: 'e2', date: '2026-11-07' }),
        action({ type: 'update_exam', ref: 'T1', date: '2026-11-07' }),
        action({ type: 'update_exam', ref: 'E1' }),
        action({ type: 'update_exam', ref: 'E1', date: '2026-10-01' }),
        action({ type: 'delete_task', ref: 'T3' }),
        action({ type: 'delete_routine', ref: '' }),
        action({ type: 'update_task', ref: 'T1', time: '18:30', priority: 'urgent' }),
      ],
    }, '2026-10-19');
    assert.deepEqual(reply.actions.map(({ type, ref, date, time, priority }) => ({ type, ref, date, time, priority })), [
      { type: 'update_exam', ref: 'E2', date: '2026-11-07', time: '', priority: '' },
      { type: 'delete_task', ref: 'T3', date: '', time: '', priority: '' },
      { type: 'update_task', ref: 'T1', date: '', time: '18:30', priority: '' },
    ]);
  });

  test('caps the number of actions and defaults to none', () => {
    const actions = Array.from({ length: 12 }, (_, index) => action({ title: `e${index}`, date: '2026-11-01' }));
    assert.equal(sanitizeReply({ message: 'ok', actions }, '2026-10-19').actions.length, 8);
    assert.deepEqual(sanitizeReply({ message: 'ok' }, '2026-10-19').actions, []);
  });

  test('rejects an empty message', () => {
    assert.throws(() => sanitizeReply({ message: '  ' }, '2026-10-19'));
  });
});

test('response schema is valid for strict structured outputs', () => {
  const check = (schema: Record<string, any>) => {
    if (schema.type === 'object') {
      assert.equal(schema.additionalProperties, false);
      assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort());
      Object.values(schema.properties).forEach(check);
    }
    if (schema.type === 'array') check(schema.items);
  };
  check(RESPONSE_SCHEMA);
});
