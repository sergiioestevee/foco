import { addDays, format, setHours, startOfDay } from 'date-fns';

import type { Exam, Goal, PersonalProject, Routine, ScheduleBlock, StudyBlock, Subject, Task } from '@/types/models';
import { defaultSubjects } from '@/features/subjects/default-subjects';

export type DemoData = {
  subjects: Subject[];
  projects: PersonalProject[];
  tasks: Task[];
  exams: Exam[];
  goals: Goal[];
  scheduleBlocks: ScheduleBlock[];
  studyBlocks: StudyBlock[];
  routines: Routine[];
};

export function createDemoData(now = new Date()): DemoData {
  const today = startOfDay(now);
  const subjects: Subject[] = defaultSubjects.slice(0, 4).map((subject, index) => ({
    ...subject,
    id: `demo-subject-${index + 1}`,
  }));
  const projects: PersonalProject[] = [
    {
      id: 'demo-project-programming',
      name: 'Aprender a programar',
      description: 'Un pequeño proyecto para practicar cada semana.',
      color: '#B79AE8',
      icon: 'laptopcomputer',
      targetDate: addDays(today, 28).toISOString(),
      status: 'active',
    },
    {
      id: 'demo-project-trip',
      name: 'Preparar el viaje',
      description: 'Guardar ideas y organizar los detalles.',
      color: '#80C6B5',
      icon: 'airplane',
      targetDate: addDays(today, 45).toISOString(),
      status: 'active',
    },
  ];
  const tasks: Task[] = [
    {
      id: 'demo-task-math', kind: 'task', title: 'Repasar ecuaciones', notes: 'Capítulos 4 y 5',
      dueDate: addDays(today, 0).toISOString(), priority: 'high', completed: false,
      completedAt: null, createdAt: now.toISOString(), goalId: 'demo-goal-math',
      categoryId: subjects[0].id, categoryType: 'subject',
    },
    {
      id: 'demo-task-language', kind: 'delivery', title: 'Leer el capítulo pendiente', notes: '',
      dueDate: addDays(today, 0).toISOString(), priority: 'medium', completed: true,
      completedAt: now.toISOString(), createdAt: now.toISOString(), goalId: null,
      categoryId: subjects[1].id, categoryType: 'subject',
    },
    {
      id: 'demo-task-code', kind: 'practice', title: 'Terminar el ejercicio de funciones', notes: 'Practicar con arrays',
      dueDate: addDays(today, -1).toISOString(), priority: 'medium', completed: false,
      completedAt: null, createdAt: now.toISOString(), goalId: 'demo-goal-code',
      categoryId: projects[0].id, categoryType: 'project',
    },
    {
      id: 'demo-task-trip', kind: 'task', title: 'Buscar alojamiento', notes: '',
      dueDate: addDays(today, 2).toISOString(), priority: 'low', completed: false,
      completedAt: null, createdAt: now.toISOString(), goalId: null,
      categoryId: projects[1].id, categoryType: 'project',
    },
  ];
  const exams: Exam[] = [
    {
      id: 'demo-exam-partial', subjectId: subjects[0].id, title: 'Parcial 1',
      date: setHours(addDays(today, 5), 10).toISOString(), room: 'Aula 2.04',
      reviewProgress: 40, createdAt: now.toISOString(),
    },
    {
      id: 'demo-exam-oral', subjectId: subjects[2].id, title: 'Examen oral',
      date: setHours(addDays(today, 18), 12).toISOString(), room: '',
      reviewProgress: 10, createdAt: now.toISOString(),
    },
  ];
  const goals: Goal[] = [
    {
      id: 'demo-goal-math', title: 'Llegar preparado al examen',
      description: 'Repasar los temas con tiempo y practicar ejercicios.',
      targetDate: addDays(today, 12).toISOString(), status: 'inProgress',
      categoryId: subjects[0].id, categoryType: 'subject', taskIds: ['demo-task-math'],
    },
    {
      id: 'demo-goal-code', title: 'Crear mi primera app',
      description: 'Aprender lo básico construyendo algo pequeño.',
      targetDate: addDays(today, 28).toISOString(), status: 'inProgress',
      categoryId: projects[0].id, categoryType: 'project', taskIds: ['demo-task-code'],
    },
  ];
  const scheduleBlocks: ScheduleBlock[] = [
    {
      id: 'demo-block-math', weekday: today.getDay(), startTime: '09:00', endTime: '10:00',
      place: 'Aula 2.14', color: subjects[0].color,
      categoryId: subjects[0].id, categoryType: 'subject',
    },
    {
      id: 'demo-block-code', weekday: today.getDay(), startTime: '17:30', endTime: '18:15',
      place: 'En casa', color: projects[0].color,
      categoryId: projects[0].id, categoryType: 'project',
    },
  ];

  const studyBlocks: StudyBlock[] = [
    {
      id: 'demo-study-review', subjectId: subjects[0].id, title: 'Repaso de límites',
      date: format(today, 'yyyy-MM-dd'), startTime: '18:30', endTime: '19:15',
      completed: false, completedAt: null, createdAt: now.toISOString(),
    },
    {
      id: 'demo-study-reading', subjectId: subjects[1].id, title: 'Leer tema 3',
      date: format(today, 'yyyy-MM-dd'), startTime: '11:00', endTime: '11:30',
      completed: true, completedAt: now.toISOString(), createdAt: now.toISOString(),
    },
  ];

  const routines: Routine[] = [
    {
      id: 'demo-routine-plan', title: 'Plan de mañana', weekdays: [0, 1, 2, 3, 4],
      time: '22:00', subjectId: null, completedDates: [], createdAt: now.toISOString(),
    },
    {
      id: 'demo-routine-notes', title: 'Pasar apuntes a limpio', weekdays: [1, 3, 5],
      time: null, subjectId: subjects[0].id,
      completedDates: [format(addDays(today, -2), 'yyyy-MM-dd')], createdAt: now.toISOString(),
    },
  ];

  return { subjects, projects, tasks, exams, goals, scheduleBlocks, studyBlocks, routines };
}
