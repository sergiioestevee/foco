import { format } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { planExamReminders, planRoutineReminders, planTaskReminders } from '@/services/reminder-plan';
import type { AppSettings, Exam, Routine, Task } from '@/types/models';

const TASK_REMINDER_TYPE = 'foco-task-reminder';
const EXAM_REMINDER_TYPE = 'foco-exam-reminder';
const ROUTINE_REMINDER_TYPE = 'foco-routine-reminder';
const REMINDER_TYPES = [TASK_REMINDER_TYPE, EXAM_REMINDER_TYPE, ROUTINE_REMINDER_TYPE];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestTaskReminderPermission() {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('task-reminders', {
      name: 'Recordatorios de tareas',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

// iOS keeps at most 64 pending notifications; these caps leave room for all three kinds.
const MAX_TASK_REMINDERS = 30;
const MAX_EXAM_REMINDERS = 10;
const MAX_ROUTINE_REMINDERS = 24;

type ReminderSettings = Pick<AppSettings, 'notificationsEnabled' | 'reminderMinutesBefore' | 'taskReminders' | 'examReminders' | 'routineReminders'>;

/** Replaces every Foco reminder with the ones the current data and settings ask for. */
export async function syncReminders(
  { tasks, exams, routines }: { tasks: Task[]; exams: Exam[]; routines: Routine[] },
  settings: ReminderSettings,
) {
  if (Platform.OS === 'web') return;

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const ours = existing.filter((request) => REMINDER_TYPES.includes(request.content.data?.type as string));
  await Promise.all(ours.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
  if (!settings.notificationsEnabled) return;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  const channel = Platform.OS === 'android' ? { channelId: 'task-reminders' } : {};
  const requests: Notifications.NotificationRequestInput[] = [];

  if (settings.taskReminders) {
    for (const { task, at } of planTaskReminders(tasks, settings.reminderMinutesBefore).slice(0, MAX_TASK_REMINDERS)) {
      requests.push({
        content: {
          title: 'Recordatorio de tarea',
          body: task.dueTime ? `«${task.title}» vence hoy a las ${task.dueTime}.` : `«${task.title}» vence hoy.`,
          data: { type: TASK_REMINDER_TYPE, taskId: task.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, ...channel },
      });
    }
  }

  if (settings.examReminders) {
    for (const { exam, at } of planExamReminders(exams).slice(0, MAX_EXAM_REMINDERS)) {
      requests.push({
        content: {
          title: 'Examen mañana',
          body: `«${exam.title}» es mañana a las ${format(new Date(exam.date), 'HH:mm')}. ¡Mucho ánimo!`,
          data: { type: EXAM_REMINDER_TYPE, examId: exam.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, ...channel },
      });
    }
  }

  if (settings.routineReminders) {
    for (const { routine, weekday, hour, minute } of planRoutineReminders(routines).slice(0, MAX_ROUTINE_REMINDERS)) {
      requests.push({
        content: {
          title: 'Rutina',
          body: `Es hora de «${routine.title}».`,
          data: { type: ROUTINE_REMINDER_TYPE, routineId: routine.id },
        },
        // expo-notifications counts weekdays from 1 (Sunday); Date.getDay() from 0.
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: weekday + 1, hour, minute, ...channel },
      });
    }
  }

  await Promise.all(requests.map((request) => Notifications.scheduleNotificationAsync(request)));
}
