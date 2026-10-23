import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

import { triggersFor, type EventAlert } from '../core/alerts.ts';

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
 * on Android 12+, offers to allow exact alarms (otherwise Android may deliver
 * reminders a few minutes late).
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
    if (Platform.OS === 'android') {
      const exact = await Notifications.getExactAlarmPermissionsAsync();
      if (!exact.granted && exact.canAskAgain) {
        Alert.alert(
          'Notifications à l’heure pile',
          'Pour être prévenu exactement à l’heure, autorise « Alarmes et rappels » pour ARC Events.',
          [
            { text: 'Plus tard', style: 'cancel' },
            { text: 'Autoriser', onPress: () => Notifications.requestExactAlarmPermissionsAsync().catch(() => {}) },
          ],
        );
      }
    }
    return true;
  })();
  return ready;
}

export async function scheduleAlert(alert: Omit<EventAlert, 'notificationIds'>): Promise<string[]> {
  const ids: string[] = [];
  for (const t of triggersFor(alert, Date.now())) {
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: { title: t.title, body: t.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: t.at, channelId: CHANNEL_ID },
      }),
    );
  }
  return ids;
}

export async function cancelAlert(alert: EventAlert): Promise<void> {
  await Promise.all(alert.notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}
