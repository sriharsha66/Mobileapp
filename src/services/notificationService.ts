import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function ensureAndroidChannels() {
  if (Platform.OS !== 'android') return;

  // Reminder channel — HIGH importance, device default sound
  await Notifications.setNotificationChannelAsync('visit-reminders', {
    name: 'Visit Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 200, 300],
    lightColor: '#1565C0',
  });

  // Alarm channel — MAX importance with long vibration, bypasses DND
  await Notifications.setNotificationChannelAsync('visit-alarm', {
    name: 'Visit Alarm',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 600, 200, 600, 200, 600, 200, 1000],
    enableLights: true,
    lightColor: '#E53935',
    bypassDnd: true,
  });
}

interface ScheduleVisitOptions {
  reportId: string;
  reportTitle: string;
  doctorName: string;
  hospitalName: string;
  visitDate: Date;
}

export async function scheduleVisitNotifications(opts: ScheduleVisitOptions): Promise<string[]> {
  const { reportId, reportTitle, doctorName, hospitalName, visitDate } = opts;
  const granted = await requestNotificationPermission();
  if (!granted) return [];

  await ensureAndroidChannels();

  const ids: string[] = [];
  const now = Date.now();
  const visitMs = visitDate.getTime();

  const offsets = [24, 20, 16, 12, 8, 4, 0];

  for (const hoursBeforeVisit of offsets) {
    const triggerMs = visitMs - hoursBeforeVisit * 60 * 60 * 1000;
    if (triggerMs <= now) continue;

    const isAlarm = hoursBeforeVisit === 0;

    const timeLabel = hoursBeforeVisit === 24
      ? 'Tomorrow'
      : hoursBeforeVisit === 0
        ? 'Now'
        : `In ${hoursBeforeVisit} hours`;

    const title = isAlarm
      ? `🔔 Visit Time! – ${reportTitle}`
      : `📅 Visit Reminder – ${reportTitle}`;

    const body = isAlarm
      ? `Your visit${doctorName ? ` with Dr. ${doctorName}` : ''} at ${hospitalName} is now. Tap to open.`
      : `${timeLabel}: Appointment${doctorName ? ` with Dr. ${doctorName}` : ''} at ${hospitalName}.`;

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { reportId, isVisitAlarm: isAlarm },
          // iOS: true = default system sound; Android: sound is channel-controlled
          sound: true,
          ...(Platform.OS === 'android' && {
            channelId: isAlarm ? 'visit-alarm' : 'visit-reminders',
            priority: isAlarm
              ? Notifications.AndroidNotificationPriority.MAX
              : Notifications.AndroidNotificationPriority.HIGH,
            vibrate: isAlarm
              ? [0, 600, 200, 600, 200, 600, 200, 1000]
              : [0, 300, 200, 300],
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(triggerMs),
        },
      });
      ids.push(id);
    } catch {}
  }

  return ids;
}

export async function cancelVisitNotifications(notificationIds: string[]) {
  for (const id of notificationIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
}
