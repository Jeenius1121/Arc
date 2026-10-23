import { triggersFor, type AlertTrigger } from './alerts.ts';
import type { EventOccurrence } from './types.ts';

/** Event types (condition names) the user follows, and when to be told about each occurrence. */
export interface Favorites {
  conditions: string[];
  minutesBefore: number[];
}

export const DEFAULT_FAVORITES: Favorites = { conditions: [], minutesBefore: [0] };

export const FAVORITE_PREFIX = 'fav:';

export interface FavoriteTrigger extends AlertTrigger {
  /** Stable notification identifier, so a resync only adds or removes what changed. */
  id: string;
}

/**
 * Notifications for every upcoming occurrence of a favourite condition.
 * Events that already carry a manual bell are skipped to avoid duplicates.
 */
export function favoriteTriggers(events: EventOccurrence[], fav: Favorites, now: number, belled: Set<string>): FavoriteTrigger[] {
  if (fav.conditions.length === 0 || fav.minutesBefore.length === 0) return [];
  const out: FavoriteTrigger[] = [];
  for (const event of events) {
    if (!fav.conditions.includes(event.condition) || belled.has(event.id)) continue;
    for (const minutes of fav.minutesBefore) {
      for (const t of triggersFor({ event, minutesBefore: [minutes], atEnd: false }, now)) {
        out.push({ ...t, id: `${FAVORITE_PREFIX}${event.id}|${minutes}` });
      }
    }
  }
  return out;
}
