import type { EventOccurrence } from './types.ts';

/** Reminder choices offered for an upcoming event, in minutes before its start. */
export const BEFORE_OPTIONS = [
  { minutes: 0, label: 'Au début de l’événement' },
  { minutes: 5, label: '5 min avant' },
  { minutes: 15, label: '15 min avant' },
  { minutes: 30, label: '30 min avant' },
  { minutes: 60, label: '1 h avant' },
  { minutes: 120, label: '2 h avant' },
];

/** The bell set on one event: reminders before/at its start and/or at its end. */
export interface EventAlert {
  event: EventOccurrence;
  minutesBefore: number[];
  atEnd: boolean;
  notificationIds: string[];
}

export interface AlertTrigger {
  at: number;
  title: string;
  body: string;
}

const MIN = 60_000;

function hhmm(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function delay(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

/** An option can only be picked while its reminder time is still ahead. */
export function optionAvailable(event: EventOccurrence, minutes: number, now: number): boolean {
  return event.start - minutes * MIN > now;
}

/** Notifications to schedule for an alert, skipping any whose time has passed. */
export function triggersFor(alert: Omit<EventAlert, 'notificationIds'>, now: number): AlertTrigger[] {
  const { event } = alert;
  const title = `${event.condition} · ${event.map}`;
  const out: AlertTrigger[] = [];
  for (const minutes of [...alert.minutesBefore].sort((a, b) => b - a)) {
    const at = event.start - minutes * MIN;
    if (at <= now) continue;
    const body =
      minutes === 0
        ? `C’est parti ! Jusqu’à ${hhmm(event.end)}.`
        : `Commence dans ${delay(minutes)}, à ${hhmm(event.start)}.`;
    out.push({ at, title, body });
  }
  if (alert.atEnd && event.end > now) out.push({ at: event.end, title, body: 'L’événement est terminé.' });
  return out;
}

/** Short summary shown on the event card, e.g. "1 h avant · début · fin". */
export function alertSummary(alert: EventAlert): string {
  const parts = [...alert.minutesBefore]
    .sort((a, b) => b - a)
    .map((m) => (m === 0 ? 'début' : `${delay(m)} avant`));
  if (alert.atEnd) parts.push('fin');
  return parts.join(' · ');
}

/** Alerts stay until their event is over. */
export function pruneAlerts(alerts: Record<string, EventAlert>, now: number): Record<string, EventAlert> {
  return Object.fromEntries(Object.entries(alerts).filter(([, a]) => a.event.end > now));
}
