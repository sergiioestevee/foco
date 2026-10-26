import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { addDays, differenceInCalendarDays } from 'date-fns';

import { getFreeWindows, minutesToTime, timeToMinutes, toDayKey } from '@/features/calendar/calendar-utils';
import { describeAiAction, resolveAiActions, type RawAiAction } from '@/features/assistant/ai-actions';
import { getUpcomingExams } from '@/features/exams/exam-utils';
import type { FocoState } from '@/store/use-foco-store';
import type { AiAction, ChatMessage, PlanItem } from '@/types/models';

import { buildAiContext, buildAiRefs } from './ai-context';
import { ensureSupabaseSession, isSupabaseConfigured, supabase } from './supabase-client';

const FUNCTION_NAME = 'foco-ai';
/** Older turns are covered by the chat summary. */
const MAX_HISTORY = 12;
const MAX_TURN_CHARS = 2000;

export type AiReply = { message: string; chatTitle: string; chatSummary: string; plan: PlanItem[]; actions: AiAction[]; remember: string[] };

export type AiErrorCode = 'daily_limit' | 'busy' | 'offline' | 'not_configured' | 'failed';

export class AiError extends Error {
  constructor(readonly code: AiErrorCode, message: string) {
    super(message);
  }
}

const errorMessages: Record<AiErrorCode, string> = {
  daily_limit: 'Has llegado a tus mensajes de hoy con Foco IA. Mañana podrás seguir.',
  busy: 'Foco IA está saturada ahora mismo. Inténtalo de nuevo en un rato.',
  offline: 'No hay conexión. Comprueba tu internet y vuelve a intentarlo.',
  not_configured: 'Foco IA todavía no está activada en el servidor.',
  failed: 'Foco IA no ha podido responder. Vuelve a intentarlo.',
};

type AskSource = Pick<
  FocoState,
  'profile' | 'subjects' | 'projects' | 'tasks' | 'exams' | 'studyBlocks' | 'routines' | 'scheduleBlocks' | 'aiMemories'
>;

/** Sends the chat (ending with the student's new message) and its summary to Foco IA. */
export async function askFocoIa(
  history: Pick<ChatMessage, 'role' | 'content' | 'plan' | 'actions'>[],
  summary: string,
  state: AskSource,
): Promise<AiReply> {
  if (!isSupabaseConfigured || !supabase) return demoReply(state);

  try {
    await ensureSupabaseSession();
  } catch {
    throw new AiError('failed', 'No se pudo iniciar la sesión con el servidor de Foco.');
  }

  const messages = history.slice(-MAX_HISTORY).map((message) => ({
    role: message.role,
    content: withPlanSummary(message).slice(0, MAX_TURN_CHARS),
  }));
  const now = new Date();
  // Built from the same snapshot as the context, so the refs Foco IA answers with point at the right items.
  const refs = buildAiRefs(state, now);
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { messages, summary, context: buildAiContext(state, now), memories: state.aiMemories.map((memory) => memory.text) },
  });

  if (error) {
    if (error instanceof FunctionsFetchError) throw new AiError('offline', errorMessages.offline);
    let code: AiErrorCode = 'failed';
    if (error instanceof FunctionsHttpError) {
      const response = error.context as Response;
      const body = await response.json().catch(() => null) as { error?: string; code?: string } | null;
      if (body?.error === 'daily_limit' || body?.error === 'busy' || body?.error === 'not_configured') code = body.error;
      // The gateway answers 404 when foco-ai hasn't been deployed yet.
      else if (response.status === 404) code = 'not_configured';
      if (__DEV__) console.warn('foco-ai', response.status, body);
    }
    throw new AiError(code, errorMessages[code]);
  }

  const reply = data as {
    message: string;
    chatTitle: string;
    chatSummary: string;
    plan: { date: string; startTime: string; endTime: string; title: string; subject: string }[];
    actions?: RawAiAction[];
    remember: string[];
  };
  const subjectIdFor = (name: string) =>
    state.subjects.find((subject) => subject.name.toLocaleLowerCase() === name.toLocaleLowerCase())?.id ?? null;
  return {
    message: reply.message,
    chatTitle: reply.chatTitle,
    chatSummary: reply.chatSummary ?? '',
    remember: reply.remember ?? [],
    plan: (reply.plan ?? []).map((item) => ({
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      title: item.title,
      subjectId: subjectIdFor(item.subject),
    })),
    actions: resolveAiActions(reply.actions ?? [], state, refs),
  };
}

function summarizeAction(action: AiAction) {
  const { verb, title, detail } = describeAiAction(action, []);
  return `${verb} «${title}»${detail ? ` (${detail})` : ''}`;
}

/** Assistant turns carry their plan and changes as text so the model knows what it proposed ("Ajustar", "Corregir"). */
function withPlanSummary(message: Pick<ChatMessage, 'role' | 'content' | 'plan' | 'actions'>) {
  const notes: string[] = [];
  if (message.plan.length) {
    notes.push(`[Plan propuesto: ${message.plan.map((item) => `${item.date} ${item.startTime}–${item.endTime} ${item.title}`).join('; ')}]`);
  }
  if (message.actions?.length) {
    notes.push(`[Cambios propuestos: ${message.actions.map(summarizeAction).join('; ')}]`);
  }
  return [message.content, ...notes].join('\n');
}

const BLOCK_MINUTES = 60;
const focusWindows = { morning: [9 * 60, 14 * 60], afternoon: [15 * 60, 20 * 60], night: [19 * 60, 22 * 60] } as const;

/** Offline stand-in used while Supabase isn't configured: a simple plan built from free slots. */
function demoReply(state: AskSource, now = new Date()): AiReply {
  const exam = getUpcomingExams(state.exams, now).find((item) => item.subjectId);
  const subject = state.subjects.find((item) => item.id === exam?.subjectId)
    ?? [...state.subjects].sort((left, right) => left.order - right.order)[0];
  const [preferredStart, preferredEnd] = focusWindows[state.profile?.focusTime ?? 'afternoon'];
  const agendaSource = { scheduleBlocks: state.scheduleBlocks, studyBlocks: state.studyBlocks, exams: state.exams, routines: state.routines };

  const plan: PlanItem[] = [];
  for (let offset = 0; offset < 7 && plan.length < 4; offset += 1) {
    const day = addDays(now, offset);
    const slot = getFreeWindows(day, agendaSource, now, BLOCK_MINUTES)
      .map((window) => ({ start: Math.max(timeToMinutes(window.startTime), preferredStart), end: Math.min(timeToMinutes(window.endTime), preferredEnd) }))
      .find((window) => window.end - window.start >= BLOCK_MINUTES);
    if (!slot) continue;
    plan.push({
      date: toDayKey(day),
      startTime: minutesToTime(slot.start),
      endTime: minutesToTime(slot.start + BLOCK_MINUTES),
      title: subject ? `Repaso de ${subject.name}` : 'Bloque de estudio',
      subjectId: subject?.id ?? null,
    });
  }

  const examNote = exam && subject
    ? ` Tu examen de ${subject.name} es en ${differenceInCalendarDays(new Date(exam.date), now)} días.`
    : '';
  return {
    message: `Te propongo ${plan.length} bloques de una hora en tus huecos libres.${examNote} (Respuesta de demostración: Foco IA aún no está conectada.)`,
    chatTitle: subject ? `Plan de ${subject.name}` : 'Plan de estudio',
    chatSummary: plan.length ? `- Plan de demostración con ${plan.length} bloques de repaso.` : '',
    plan,
    actions: [],
    remember: [],
  };
}
