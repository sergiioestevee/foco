import { differenceInCalendarDays } from 'date-fns';

import { minutesToTime, timeToMinutes, toDayKey } from '@/features/calendar/calendar-utils';
import { formatCountdown, getUpcomingExams } from '@/features/exams/exam-utils';
import type { NewStudyBlock } from '@/store/use-foco-store';
import { categoryColors } from '@/theme/tokens';
import type {
  Exam,
  Goal,
  PersonalProject,
  ScheduleBlock,
  StudyBlock,
  Subject,
  Task,
  TaskPriority,
} from '@/types/models';

export type AssistantContext = {
  subjects: Subject[];
  projects: PersonalProject[];
  tasks: Task[];
  goals: Goal[];
  scheduleBlocks: ScheduleBlock[];
};

export type AssistantSuggestion =
  | {
      id: string;
      kind: 'task';
      title: string;
      notes: string;
      dueDate: string | null;
      priority: TaskPriority;
      goalId: string | null;
      categoryId: string | null;
      categoryType: 'subject' | 'project' | null;
    }
  | {
      id: string;
      kind: 'scheduleBlock';
      weekday: number;
      startTime: string;
      endTime: string;
      place: string;
      color: string;
      categoryId: string | null;
      categoryType: 'subject' | 'project' | null;
    }
  | {
      id: string;
      kind: 'priority';
      taskId: string;
      taskTitle: string;
      priority: TaskPriority;
    };

export type AssistantReply = {
  message: string;
  suggestions: AssistantSuggestion[];
};

export interface AIService {
  respond(prompt: string, context: AssistantContext): Promise<AssistantReply>;
}

export class MockAIService implements AIService {
  async respond(prompt: string, context: AssistantContext): Promise<AssistantReply> {
    await new Promise((resolve) => setTimeout(resolve, 360));
    const normalizedPrompt = prompt.toLocaleLowerCase();
    const subject = context.subjects.find((item) => normalizedPrompt.includes(item.name.toLocaleLowerCase()));
    const project = context.projects.find((item) => normalizedPrompt.includes(item.name.toLocaleLowerCase()));
    const requestedGoal = context.goals.find((item) => normalizedPrompt.includes(item.title.toLocaleLowerCase()));
    const goal = requestedGoal ?? context.goals.find((item) => item.status === 'inProgress');
    const focusCategory = subject
      ? { categoryId: subject.id, categoryType: 'subject' as const, color: subject.color, name: subject.name }
      : project
        ? { categoryId: project.id, categoryType: 'project' as const, color: project.color, name: project.name }
        : goal?.categoryId && goal.categoryType
          ? {
              categoryId: goal.categoryId,
              categoryType: goal.categoryType,
              color: goal.categoryType === 'subject'
                ? context.subjects.find((item) => item.id === goal.categoryId)?.color ?? categoryColors[0]
                : context.projects.find((item) => item.id === goal.categoryId)?.color ?? categoryColors[5],
              name: goal.title,
            }
          : context.subjects[0]
            ? { categoryId: context.subjects[0].id, categoryType: 'subject' as const, color: context.subjects[0].color, name: context.subjects[0].name }
            : context.projects[0]
              ? { categoryId: context.projects[0].id, categoryType: 'project' as const, color: context.projects[0].color, name: context.projects[0].name }
              : { categoryId: null, categoryType: null, color: categoryColors[0], name: 'tu semana' };
    const focusName = subject?.name ?? project?.name ?? goal?.title ?? focusCategory.name;
    const tomorrow = addLocalDays(new Date(), 1);
    const dayAfterTomorrow = addLocalDays(new Date(), 2);
    const suggestions: AssistantSuggestion[] = [
      {
        id: `task-${Date.now()}-1`,
        kind: 'task',
        title: `Preparar un plan breve para ${focusName}`,
        notes: 'Propuesta del asistente. Ajusta los detalles cuando quieras.',
        dueDate: tomorrow.toISOString(),
        priority: 'high',
        goalId: goal?.id ?? null,
        categoryId: focusCategory.categoryId,
        categoryType: focusCategory.categoryType,
      },
      {
        id: `task-${Date.now()}-2`,
        kind: 'task',
        title: `Repasar lo más importante de ${focusName}`,
        notes: 'Divide el repaso en partes pequeñas y haz una pausa entre ellas.',
        dueDate: dayAfterTomorrow.toISOString(),
        priority: 'medium',
        goalId: goal?.id ?? null,
        categoryId: focusCategory.categoryId,
        categoryType: focusCategory.categoryType,
      },
      {
        id: `block-${Date.now()}`,
        kind: 'scheduleBlock',
        weekday: tomorrow.getDay(),
        startTime: '17:00',
        endTime: '17:45',
        place: 'En casa',
        color: focusCategory.color,
        categoryId: focusCategory.categoryId,
        categoryType: focusCategory.categoryType,
      },
    ];

    if (normalizedPrompt.includes('prioriz')) {
      const nextTask = [...context.tasks]
        .filter((item) => !item.completed && item.priority !== 'high')
        .sort((left, right) => (left.dueDate ?? '9999').localeCompare(right.dueDate ?? '9999'))[0];
      if (nextTask) {
        suggestions.unshift({
          id: `priority-${Date.now()}`,
          kind: 'priority',
          taskId: nextTask.id,
          taskTitle: nextTask.title,
          priority: 'high',
        });
      }
    }

    const goalContext = goal ? ` La propuesta queda vinculada al objetivo «${goal.title}».` : '';
    return {
      message: `Puedo ayudarte a avanzar con ${focusName}. He preparado dos tareas pequeñas y un bloque de 45 minutos para que revises.${goalContext} Es una propuesta local de demostración; puedes aceptar solo lo que te sirva.`,
      suggestions,
    };
  }
}

export class BackendAIService implements AIService {
  constructor(private readonly endpoint: string) {}

  async respond(prompt: string, context: AssistantContext): Promise<AssistantReply> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, context }),
    });
    if (!response.ok) throw new Error(`El backend respondió con ${response.status}.`);
    const result = await response.json() as Partial<AssistantReply>;
    if (typeof result.message !== 'string' || !Array.isArray(result.suggestions)) {
      throw new Error('La respuesta del backend tiene un formato inesperado.');
    }
    return { message: result.message, suggestions: result.suggestions as AssistantSuggestion[] };
  }
}

export function createAIService(endpoint = ''): AIService {
  return endpoint.trim() ? new BackendAIService(endpoint.trim()) : new MockAIService();
}

export type DailyProposal = {
  message: string;
  /** Present when there is a free slot today; "Añadir al día" turns it into a study block. */
  block: NewStudyBlock | null;
  /** True when a pending study block for the focus subject is already planned today. */
  alreadyPlanned: boolean;
};

const PROPOSAL_MINUTES = 45;
const DAY_START_MINUTES = 9 * 60;
const DAY_END_MINUTES = 22 * 60;
/** An exam closer than this takes priority over pending tasks when choosing what to review. */
const EXAM_FOCUS_DAYS = 14;

type ProposalContext = Pick<AssistantContext, 'tasks' | 'subjects' | 'scheduleBlocks'> & {
  exams?: Exam[];
  studyBlocks?: StudyBlock[];
};

/** Local, rule-based proposal for the home screen until the AI backend exists. */
export function getDailyProposal(
  { tasks, subjects, scheduleBlocks, exams = [], studyBlocks = [] }: ProposalContext,
  now = new Date(),
): DailyProposal | null {
  const orderedSubjects = [...subjects].sort((left, right) => left.order - right.order);
  const focusExam = getUpcomingExams(exams, now)
    .find((exam) => exam.subjectId && differenceInCalendarDays(new Date(exam.date), now) <= EXAM_FOCUS_DAYS);
  const urgentSubjectId = [...tasks]
    .filter((task) => !task.completed && task.categoryType === 'subject' && task.categoryId)
    .sort((left, right) => (left.dueDate ?? '9999').localeCompare(right.dueDate ?? '9999'))[0]?.categoryId;
  const subject = orderedSubjects.find((item) => item.id === focusExam?.subjectId)
    ?? orderedSubjects.find((item) => item.id === urgentSubjectId)
    ?? orderedSubjects[0];
  if (!subject) return null;

  const todayKey = toDayKey(now);
  const plannedToday = studyBlocks
    .filter((block) => block.date === todayKey && block.subjectId === subject.id && !block.completed)
    .sort((left, right) => left.startTime.localeCompare(right.startTime))[0];
  if (plannedToday) {
    return {
      message: `Hoy tienes «${plannedToday.title}» a las ${plannedToday.startTime}. Cuando lo termines, márcalo como hecho.`,
      block: null,
      alreadyPlanned: true,
    };
  }

  const busy = [
    ...scheduleBlocks.filter((block) => block.weekday === now.getDay()),
    ...studyBlocks.filter((block) => block.date === todayKey),
  ].map((block) => ({ start: timeToMinutes(block.startTime), end: timeToMinutes(block.endTime) }));
  const earliest = Math.max(DAY_START_MINUTES, Math.ceil((now.getHours() * 60 + now.getMinutes() + 15) / 30) * 30);
  let slot: number | null = null;
  for (let start = earliest; start + PROPOSAL_MINUTES <= DAY_END_MINUTES; start += 30) {
    const end = start + PROPOSAL_MINUTES;
    if (busy.every((block) => block.end <= start || block.start >= end)) {
      slot = start;
      break;
    }
  }

  if (slot === null) {
    return {
      message: `Hoy tu horario está completo. Mañana reserva ${PROPOSAL_MINUTES} min para repasar ${subject.name}.`,
      block: null,
      alreadyPlanned: false,
    };
  }

  const startTime = minutesToTime(slot);
  const nextClass = scheduleBlocks
    .filter((block) => block.weekday === now.getDay() && timeToMinutes(block.startTime) >= slot + PROPOSAL_MINUTES)
    .sort((left, right) => left.startTime.localeCompare(right.startTime))[0];
  const nextClassName = nextClass?.categoryType === 'subject'
    ? subjects.find((item) => item.id === nextClass.categoryId)?.name
    : undefined;

  return {
    message: focusExam?.subjectId === subject.id
      ? `${PROPOSAL_MINUTES} min de repaso de ${subject.name} a las ${startTime}: el examen es ${formatCountdown(focusExam.date, now)}.`
      : `${PROPOSAL_MINUTES} min de repaso de ${subject.name} a las ${startTime}${nextClassName ? `, antes de ${nextClassName}` : ''}.`,
    block: {
      subjectId: subject.id,
      title: `Repaso de ${subject.name}`,
      date: todayKey,
      startTime,
      endTime: minutesToTime(slot + PROPOSAL_MINUTES),
    },
    alreadyPlanned: false,
  };
}

function addLocalDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  result.setHours(9, 0, 0, 0);
  return result;
}
