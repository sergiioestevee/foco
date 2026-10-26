import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

import { toDayKey } from '@/features/calendar/calendar-utils';
import { formatWeekdays } from '@/features/routines/routine-utils';
import { taskKindLabel } from '@/features/tasks/task-kinds';
import { useFocoStore, type FocoState } from '@/store/use-foco-store';
import type { AiAction, Subject, TaskKind, TaskPriority } from '@/types/models';

/** What foco-ai returns for each action (see supabase/functions/foco-ai/logic.ts). Empty strings mean "not given". */
export type RawAiAction = {
  type: string;
  ref: string;
  title: string;
  subject: string;
  date: string;
  time: string;
  room: string;
  taskKind: TaskKind | '';
  priority: TaskPriority | '';
  weekdays: number[];
};

/** Exams and tasks given without a time are set at this hour; the student can change it later. */
const DEFAULT_TIME = '09:00';

type ResolveSource = Pick<FocoState, 'subjects' | 'exams' | 'tasks' | 'routines'>;

/** A local date-time as ISO, or null if the parts don't form a real date (e.g. 2026-02-30). */
function toIso(day: string, time: string): string | null {
  // A date-time without a zone is read as local time.
  const date = new Date(`${day}T${time}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Combines a new day and/or time with the old date-time, keeping whichever part didn't change. */
function changedDate(previous: string | null, day: string, time: string): string | undefined {
  if (!day && !time) return undefined;
  if (!previous && !day) return undefined;
  const old = previous ? new Date(previous) : null;
  return toIso(day || toDayKey(old as Date), time || (old ? format(old, 'HH:mm') : DEFAULT_TIME)) ?? undefined;
}

function subjectIdFor(subjects: Subject[], name: string): string | null {
  if (!name) return null;
  return subjects.find((subject) => subject.name.toLocaleLowerCase() === name.toLocaleLowerCase())?.id ?? null;
}

/** Drops undefined keys so an update only carries what changes. */
function defined<T extends object>(changes: T): Partial<T> {
  return Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined)) as Partial<T>;
}

/**
 * Turns foco-ai's actions into concrete changes, using `refs` (E1, T2… → ids) from the context that was sent.
 * Anything that can't be resolved (unknown ref, impossible date, nothing to change) is dropped.
 */
export function resolveAiActions(raw: RawAiAction[], state: ResolveSource, refs: Record<string, string>): AiAction[] {
  return raw.flatMap((item): AiAction[] => {
    const subjectId = subjectIdFor(state.subjects, item.subject);
    // In an update, an unknown or empty subject means "leave it as it is".
    const newSubjectId = subjectId ?? undefined;
    const id = refs[item.ref];

    switch (item.type) {
      case 'add_exam': {
        const date = toIso(item.date, item.time || DEFAULT_TIME);
        return date ? [{ type: 'addExam', exam: { title: item.title, subjectId, date, room: item.room } }] : [];
      }
      case 'update_exam': {
        const exam = state.exams.find((entry) => entry.id === id);
        if (!exam) return [];
        const changes = defined({
          title: item.title || undefined,
          subjectId: newSubjectId,
          room: item.room || undefined,
          date: changedDate(exam.date, item.date, item.time),
        });
        return Object.keys(changes).length ? [{ type: 'updateExam', id: exam.id, label: exam.title, changes }] : [];
      }
      case 'delete_exam': {
        const exam = state.exams.find((entry) => entry.id === id);
        return exam ? [{ type: 'deleteExam', id: exam.id, label: exam.title }] : [];
      }
      case 'add_task':
        return [{
          type: 'addTask',
          task: {
            title: item.title,
            kind: item.taskKind || 'task',
            priority: item.priority || 'medium',
            dueDate: item.date ? toIso(item.date, item.time || DEFAULT_TIME) : null,
            categoryId: subjectId,
            categoryType: subjectId ? 'subject' : null,
          },
        }];
      case 'update_task': {
        const task = state.tasks.find((entry) => entry.id === id);
        if (!task) return [];
        const changes = defined({
          title: item.title || undefined,
          kind: item.taskKind || undefined,
          priority: item.priority || undefined,
          dueDate: changedDate(task.dueDate, item.date, item.time),
          categoryId: newSubjectId,
          categoryType: newSubjectId ? 'subject' as const : undefined,
        });
        return Object.keys(changes).length ? [{ type: 'updateTask', id: task.id, label: task.title, changes }] : [];
      }
      case 'delete_task': {
        const task = state.tasks.find((entry) => entry.id === id);
        return task ? [{ type: 'deleteTask', id: task.id, label: task.title }] : [];
      }
      case 'add_routine':
        return [{ type: 'addRoutine', routine: { title: item.title, weekdays: item.weekdays, time: item.time || null, subjectId } }];
      case 'update_routine': {
        const routine = state.routines.find((entry) => entry.id === id);
        if (!routine) return [];
        const changes = defined({
          title: item.title || undefined,
          weekdays: item.weekdays.length ? item.weekdays : undefined,
          time: item.time || undefined,
          subjectId: newSubjectId,
        });
        return Object.keys(changes).length ? [{ type: 'updateRoutine', id: routine.id, label: routine.title, changes }] : [];
      }
      case 'delete_routine': {
        const routine = state.routines.find((entry) => entry.id === id);
        return routine ? [{ type: 'deleteRoutine', id: routine.id, label: routine.title }] : [];
      }
      default:
        return [];
    }
  });
}

/** Applies confirmed actions. Items deleted in the meantime are skipped. */
export function applyAiActions(actions: AiAction[]) {
  const store = useFocoStore.getState();
  const has = (list: { id: string }[], id: string) => list.some((item) => item.id === id);

  for (const action of actions) {
    switch (action.type) {
      case 'addExam':
        store.addExam({ ...action.exam, reviewProgress: 0 });
        break;
      case 'updateExam':
        if (has(store.exams, action.id)) store.updateExam(action.id, action.changes);
        break;
      case 'deleteExam':
        store.deleteExam(action.id);
        break;
      case 'addTask':
        store.addTask({ ...action.task, notes: '', goalId: null });
        break;
      case 'updateTask':
        if (has(store.tasks, action.id)) store.updateTask(action.id, action.changes);
        break;
      case 'deleteTask':
        store.deleteTask(action.id);
        break;
      case 'addRoutine':
        store.addRoutine(action.routine);
        break;
      case 'updateRoutine':
        if (has(store.routines, action.id)) store.updateRoutine(action.id, action.changes);
        break;
      case 'deleteRoutine':
        store.deleteRoutine(action.id);
        break;
    }
  }
}

export type ActionTone = 'add' | 'update' | 'delete';

export type ActionDescription = {
  tone: ActionTone;
  /** "Añadir examen", "Cambiar tarea", "Borrar rutina"… */
  verb: string;
  title: string;
  detail: string;
  icon: { ios: SFSymbol; other: AndroidSymbol };
};

const icons = {
  exam: { ios: 'graduationcap', other: 'school' },
  task: { ios: 'checklist', other: 'checklist' },
  routine: { ios: 'repeat', other: 'repeat' },
} as const;

const formatWhen = (iso: string) => {
  const text = format(new Date(iso), "EEEE d 'de' MMMM · HH:mm", { locale: es });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Text for one row of the confirmation card. */
export function describeAiAction(action: AiAction, subjects: Subject[]): ActionDescription {
  const subjectName = (id: string | null | undefined) => subjects.find((subject) => subject.id === id)?.name;
  const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(' · ');

  switch (action.type) {
    case 'addExam':
      return {
        tone: 'add', verb: 'Añadir examen', icon: icons.exam,
        title: join(subjectName(action.exam.subjectId), action.exam.title),
        detail: join(formatWhen(action.exam.date), action.exam.room),
      };
    case 'addTask':
      return {
        tone: 'add', verb: `Añadir ${taskKindLabel(action.task.kind).toLocaleLowerCase()}`, icon: icons.task,
        title: action.task.title,
        detail: join(subjectName(action.task.categoryId), action.task.dueDate ? formatWhen(action.task.dueDate) : 'Sin fecha'),
      };
    case 'addRoutine':
      return {
        tone: 'add', verb: 'Añadir rutina', icon: icons.routine,
        title: action.routine.title,
        detail: join(formatWeekdays(action.routine.weekdays), action.routine.time, subjectName(action.routine.subjectId)),
      };
    case 'updateExam':
      return {
        tone: 'update', verb: 'Cambiar examen', icon: icons.exam, title: action.label,
        detail: join(
          action.changes.date && formatWhen(action.changes.date),
          action.changes.title && `Ahora «${action.changes.title}»`,
          action.changes.subjectId && subjectName(action.changes.subjectId),
          action.changes.room && `Aula ${action.changes.room}`,
        ),
      };
    case 'updateTask':
      return {
        tone: 'update', verb: 'Cambiar tarea', icon: icons.task, title: action.label,
        detail: join(
          action.changes.dueDate && formatWhen(action.changes.dueDate),
          action.changes.title && `Ahora «${action.changes.title}»`,
          action.changes.kind && taskKindLabel(action.changes.kind),
          action.changes.categoryId && subjectName(action.changes.categoryId),
          action.changes.priority && `Prioridad ${{ low: 'baja', medium: 'media', high: 'alta' }[action.changes.priority]}`,
        ),
      };
    case 'updateRoutine':
      return {
        tone: 'update', verb: 'Cambiar rutina', icon: icons.routine, title: action.label,
        detail: join(
          action.changes.weekdays && formatWeekdays(action.changes.weekdays),
          action.changes.time,
          action.changes.title && `Ahora «${action.changes.title}»`,
          action.changes.subjectId && subjectName(action.changes.subjectId),
        ),
      };
    case 'deleteExam':
      return { tone: 'delete', verb: 'Borrar examen', icon: icons.exam, title: action.label, detail: 'Se eliminará de Exámenes' };
    case 'deleteTask':
      return { tone: 'delete', verb: 'Borrar tarea', icon: icons.task, title: action.label, detail: 'Se eliminará de Tareas' };
    case 'deleteRoutine':
      return { tone: 'delete', verb: 'Borrar rutina', icon: icons.routine, title: action.label, detail: 'Se eliminará de Rutinas' };
  }
}
