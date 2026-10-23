import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

import { triggersFor, type EventAlert } from '../core/alerts.ts';
import { FAVORITE_PREFIX, favoriteTriggers, type Favorites } from '../core/favorites.ts';
import type { EventOccurrence } from '../core/types.ts';

const CHANNEL_ID = 'events';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let ready: Promise<boolean> | null = null;

/**
 * Asks for the notification permission once, creates the Android channel and,
 * if exact alarms are still denied (Android 12 only; USE_EXACT_ALARM grants
 * them on 13+), offers to allow them. Without exact alarms Android batches
 * reminders and drops ones a few minutes apart.
 */
export function ensureNotificationsReady(): Promise<boolean> {
  ready ??= (async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Événements ARC Raiders',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { granted } = await Notifications.getPermissionsAsync();
    if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) {
      Alert.alert('Notifications désactivées', 'Autorise les notifications pour ARC Events dans les réglages du téléphone.');
      ready = null;
      return false;
    }
    if (!(await exactAlarmsAllowed())) {
      Alert.alert(
        'Rappels à l’heure pile',
        'Sans l’autorisation « Alarmes et rappels », Android retarde ou saute des rappels. L’autoriser pour ARC Events ?',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Autoriser', onPress: () => Notifications.requestExactAlarmPermissionsAsync().catch(() => {}) },
        ],
      );
    }
    return true;
  })();
  return ready;
}

export async function exactAlarmsAllowed(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  return (await Notifications.getExactAlarmPermissionsAsync()).granted;
}

export async function requestExactAlarms(): Promise<boolean> {
  return (await Notifications.requestExactAlarmPermissionsAsync().catch(() => ({ granted: false }))).granted;
}

async function schedule(at: number, title: string, body: string, identifier?: string): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body },
    // alarmClock (AlarmManager.setAlarmClock) is never deferred or throttled by
    // Doze, unlike regular alarms which may fire only once every ~9 minutes.
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID, delivery: 'alarmClock' },
  });
}

export async function scheduleAlert(alert: Omit<EventAlert, 'notificationIds'>): Promise<string[]> {
  const ids: string[] = [];
  for (const t of triggersFor(alert, Date.now())) ids.push(await schedule(t.at, t.title, t.body));
  return ids;
}

export async function cancelAlert(alert: EventAlert): Promise<void> {
  await Promise.all(alert.notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

/**
 * Cancels every scheduled bell notification and schedules the bells again, so
 * they pick up the current delivery mode and permissions. Favourite
 * notifications are left to syncFavorites().
 */
export async function rescheduleAll(alerts: Record<string, EventAlert>): Promise<Record<string, EventAlert>> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => !n.identifier.startsWith(FAVORITE_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  const next: Record<string, EventAlert> = {};
  for (const [id, a] of Object.entries(alerts)) {
    next[id] = { ...a, notificationIds: await scheduleAlert(a) };
  }
  return next;
}

/**
 * Makes the scheduled favourite notifications match `events`: adds the
 * missing ones and cancels those no longer wanted (unfavourited, belled...).
 */
export async function syncFavorites(events: EventOccurrence[], fav: Favorites, alerts: Record<string, EventAlert>): Promise<void> {
  const wanted = favoriteTriggers(events, fav, Date.now(), new Set(Object.keys(alerts)));
  const wantedIds = new Set(wanted.map((t) => t.id));
  const scheduled = (await Notifications.getAllScheduledNotificationsAsync())
    .map((n) => n.identifier)
    .filter((id) => id.startsWith(FAVORITE_PREFIX));
  const existing = new Set(scheduled);
  await Promise.all(scheduled.filter((id) => !wantedIds.has(id)).map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  for (const t of wanted) {
    if (!existing.has(t.id)) await schedule(t.at, `❤ ${t.title}`, t.body, t.id);
  }
}

export async function scheduledCount(): Promise<number> {
  return (await Notifications.getAllScheduledNotificationsAsync()).length;
}

/** Three notifications 15 s apart, to check that several reminders in a row all arrive. */
export async function sendTestNotifications(): Promise<void> {
  if (!(await ensureNotificationsReady())) return;
  const now = Date.now();
  for (const [i, s] of [15, 30, 45].entries()) {
    await schedule(now + s * 1000, `Test ARC Events ${i + 1}/3`, `Notification de test envoyée ${s} s après l’appui.`);
  }
}
