import { triggersFor, type AlertTrigger } from './alerts.ts';
import type { EventOccurrence } from './types.ts';

/** One followed condition; an empty `maps` list means every map. */
export interface FavoriteRule {
  condition: string;
  maps: string[];
}

/** Hours (local, 0-23) during which favourite notifications are muted; may wrap past midnight. */
export interface QuietHours {
  enabled: boolean;
  start: number;
  end: number;
}

export interface Favorites {
  rules: FavoriteRule[];
  minutesBefore: number[];
  quiet: QuietHours;
  /** Notify when an upcoming event helps the shopping list (see planner.ts). */
  smart: boolean;
}

export const DEFAULT_FAVORITES: Favorites = {
  rules: [],
  minutesBefore: [0],
  quiet: { enabled: false, start: 1, end: 8 },
  smart: false,
};

export const FAVORITE_PREFIX = 'fav:';

/** Accepts favourites saved by older versions ({ conditions: string[] }). */
export function migrateFavorites(stored: unknown): Favorites {
  const s = (stored ?? {}) as Partial<Favorites> & { conditions?: string[] };
  const rules = s.rules ?? (s.conditions ?? []).map((condition) => ({ condition, maps: [] }));
  return { ...DEFAULT_FAVORITES, ...s, rules, quiet: { ...DEFAULT_FAVORITES.quiet, ...s.quiet } };
}

export function findRule(fav: Favorites, condition: string): FavoriteRule | undefined {
  return fav.rules.find((r) => r.condition === condition);
}

export function isFollowed(fav: Favorites, event: EventOccurrence): boolean {
  const rule = findRule(fav, event.condition);
  return !!rule && (rule.maps.length === 0 || rule.maps.includes(event.map));
}

/** Replaces (or removes, with `maps === null`) the rule for `condition`. */
export function setRule(fav: Favorites, condition: string, maps: string[] | null): Favorites {
  const rules = fav.rules.filter((r) => r.condition !== condition);
  if (maps !== null) rules.push({ condition, maps });
  return { ...fav, rules };
}

export function inQuietHours(at: number, quiet: QuietHours): boolean {
  if (!quiet.enabled || quiet.start === quiet.end) return false;
  const h = new Date(at).getHours();
  return quiet.start < quiet.end ? h >= quiet.start && h < quiet.end : h >= quiet.start || h < quiet.end;
}

export interface FavoriteTrigger extends AlertTrigger {
  /** Stable notification identifier, so a resync only adds or removes what changed. */
  id: string;
  eventId: string;
}

/**
 * Notifications for every upcoming occurrence of a followed condition, outside
 * quiet hours. Events that already carry a manual bell are skipped.
 */
export function favoriteTriggers(events: EventOccurrence[], fav: Favorites, now: number, belled: Set<string>): FavoriteTrigger[] {
  const out: FavoriteTrigger[] = [];
  for (const event of events) {
    if (!isFollowed(fav, event) || belled.has(event.id)) continue;
    for (const minutes of fav.minutesBefore) {
      for (const t of triggersFor({ event, minutesBefore: [minutes], atEnd: false }, now)) {
        if (inQuietHours(t.at, fav.quiet)) continue;
        out.push({ ...t, id: `${FAVORITE_PREFIX}${event.id}|${minutes}`, eventId: event.id });
      }
    }
  }
  return out;
}
