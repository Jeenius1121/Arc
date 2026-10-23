import { categoriesOf } from './categories.ts';
import type { EventOccurrence, FilterState } from './types.ts';

/**
 * Keeps occurrences matching every non-empty criterion (maps AND conditions
 * AND categories; values inside one criterion are OR-ed), drops finished
 * events, and sorts from the soonest to the furthest.
 */
export function applyFilter(events: EventOccurrence[], f: FilterState, now: number): EventOccurrence[] {
  return events
    .filter((e) => e.end > now)
    .filter((e) => !f.upcomingOnly || e.start > now)
    .filter((e) => f.maps.length === 0 || f.maps.includes(e.map))
    .filter((e) => f.conditions.length === 0 || f.conditions.includes(e.condition))
    .filter((e) => f.categories.length === 0 || categoriesOf(e.condition).some((c) => f.categories.includes(c)))
    .sort((a, b) => a.start - b.start || a.map.localeCompare(b.map));
}

export function distinct(events: EventOccurrence[], key: 'map' | 'condition'): string[] {
  return [...new Set(events.map((e) => e[key]))].sort((a, b) => a.localeCompare(b));
}

export function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** "dans 1 h 05 min 12 s" before start, "en cours · fin dans 23 min" while running. */
export function countdown(e: EventOccurrence, now: number): { running: boolean; text: string } {
  if (e.start <= now) return { running: true, text: `En cours · fin dans ${duration(e.end - now)}` };
  return { running: false, text: `Dans ${duration(e.start - now)}` };
}

export function duration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (d > 0) return `${d} j ${h} h ${pad(m)} min`;
  if (h > 0) return `${h} h ${pad(m)} min ${pad(s)} s`;
  return `${m} min ${pad(s)} s`;
}
