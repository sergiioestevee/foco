import { differenceInCalendarDays } from 'date-fns';

import { minutesToTime, timeToMinutes, toDayKey } from '@/features/calendar/calendar-utils';
import { formatCountdown, getUpcomingExams } from '@/features/exams/exam-utils';
import type { NewStudyBlock } from '@/store/use-foco-store';
import type { Exam, Routine, ScheduleBlock, StudyBlock, Subject, Task } from '@/types/models';

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

type ProposalContext = {
  tasks: Task[];
  subjects: Subject[];
  scheduleBlocks: ScheduleBlock[];
  exams?: Exam[];
  studyBlocks?: StudyBlock[];
  routines?: Routine[];
};

/** Time a routine with a set hour is assumed to take when looking for free slots. */
const ROUTINE_MINUTES = 30;

/** Local, rule-based proposal for the home screen until the AI backend exists. */
export function getDailyProposal(
  { tasks, subjects, scheduleBlocks, exams = [], studyBlocks = [], routines = [] }: ProposalContext,
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
  ].map((block) => ({ start: timeToMinutes(block.startTime), end: timeToMinutes(block.endTime) }))
    .concat(routines
      .filter((routine) => routine.time && routine.weekdays.includes(now.getDay()))
      .map((routine) => ({ start: timeToMinutes(routine.time as string), end: timeToMinutes(routine.time as string) + ROUTINE_MINUTES })));
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
