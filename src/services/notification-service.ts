import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AppSettings, Task } from '@/types/models';

const TASK_REMINDER_TYPE = 'foco-task-reminder';

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

export async function syncTaskReminders(
  tasks: Task[],
  settings: Pick<AppSettings, 'notificationsEnabled' | 'reminderMinutesBefore'>,
) {
  if (Platform.OS === 'web') return;

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const taskReminders = existing.filter((request) => request.content.data?.type === TASK_REMINDER_TYPE);
  await Promise.all(taskReminders.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
  if (!settings.notificationsEnabled) return;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  const now = Date.now();
  const reminders = tasks
    .filter((task) => !task.completed && task.dueDate)
    .map((task) => {
      const dueAt = new Date(task.dueDate as string);
      if (Number.isNaN(dueAt.getTime())) return null;
      // Tasks store a date without a due time; use 18:00 local time as its reminder anchor.
      dueAt.setHours(18, 0, 0, 0);
      const reminderAt = new Date(dueAt.getTime() - settings.reminderMinutesBefore * 60_000);
      return reminderAt.getTime() > now ? { task, reminderAt } : null;
    })
    .filter((item): item is { task: Task; reminderAt: Date } => item !== null)
    .sort((left, right) => left.reminderAt.getTime() - right.reminderAt.getTime())
    .slice(0, 50);

  await Promise.all(reminders.map(({ task, reminderAt }) => Notifications.scheduleNotificationAsync({
    content: {
      title: 'Recordatorio de tarea',
      body: `«${task.title}» vence hoy.`,
      data: { type: TASK_REMINDER_TYPE, taskId: task.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderAt,
      ...(Platform.OS === 'android' ? { channelId: 'task-reminders' } : {}),
    },
  })));
}
