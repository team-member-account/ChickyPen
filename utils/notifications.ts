import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Snapshot } from '@/types';
import { pendingVaccines } from './analytics';
import { addDays, formatDate } from './format';
import { log } from './logger';
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
let notificationQueue: Promise<unknown> = Promise.resolve();
export function scheduleVaccineReminder(
  s: Snapshot,
  requestPermission = false,
): Promise<string | null> {
  const job = notificationQueue.catch(() => undefined).then(() => reconcile(s, requestPermission));
  notificationQueue = job;
  return job;
}
async function reconcile(s: Snapshot, request: boolean): Promise<string | null> {
  try {
    if (Platform.OS !== 'ios') return 'Nhắc lịch được cấu hình cho iPhone.';
    let permission = await Notifications.getPermissionsAsync();
    if (request && !permission.granted && permission.canAskAgain) {
      permission = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: true },
      });
      log('notification permission', { status: permission.status });
    }
    const allowed =
      permission.granted ||
      permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    const pending = pendingVaccines(s)
      .map((item) => ({ ...item, fire: new Date(`${addDays(item.date, -1)}T08:00:00+07:00`) }))
      .filter((item) => item.fire.getTime() > Date.now());
    // iOS caps pending local notifications; reserve room for the system and queue nearest reminders.
    const wanted = pending
      .slice(0, 60)
      .map((item) => ({
        identifier: `chickypen-vaccine-${item.vaccine.id}-${item.booster ? 'booster' : 'first'}-${item.date}`,
        content: {
          title: `Nhắc tiêm ${item.vaccine.name}`,
          body: `${item.flock.name}: ${item.booster ? 'tiêm nhắc lại' : 'tiêm vaccine'} ngày ${formatDate(item.date)}.`,
          sound: 'default',
          data: { vaccineId: item.vaccine.id, flockId: item.flock.id },
        },
        fire: item.fire,
      }));
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of existing.filter((n) => n.identifier.startsWith('chickypen-'))) {
      const target = wanted.find((w) => w.identifier === item.identifier);
      if (
        !allowed ||
        !target ||
        target.content.title !== item.content.title ||
        target.content.body !== item.content.body
      ) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
        log('notification cancel', { id: item.identifier });
      }
    }
    if (!allowed)
      return 'Chưa bật thông báo. Bật quyền nhắc lịch để nhận thông báo lúc 08:00 trước ngày tiêm một ngày.';
    for (const target of wanted) {
      if (
        existing.some(
          (n) =>
            n.identifier === target.identifier &&
            n.content.title === target.content.title &&
            n.content.body === target.content.body,
        )
      )
        continue;
      await Notifications.scheduleNotificationAsync({
        identifier: target.identifier,
        content: target.content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target.fire },
      });
      log('notification schedule', { id: target.identifier, at: target.fire.toISOString() });
    }
    if (pending.length > 60)
      return `Đã đặt 60 lời nhắc gần nhất. Còn ${pending.length - 60} lời nhắc được bổ sung khi mở ứng dụng lần sau.`;
    return null;
  } catch (error) {
    log('notification error', error);
    return 'Dữ liệu đã lưu, nhưng chưa đồng bộ được lời nhắc. Chọn “Bật / đồng bộ lời nhắc” để thử lại.';
  }
}
