import type { EventOccurrence } from './types.ts';

const HOUR = 3600_000;

export interface MapStatus {
  map: string;
  current: EventOccurrence[];
  next: EventOccurrence | undefined;
}

/** For each map: the conditions running now and the next one to start. */
export function mapsNow(events: EventOccurrence[], now: number): MapStatus[] {
  const maps = [...new Set(events.map((e) => e.map))].sort((a, b) => a.localeCompare(b));
  return maps.map((map) => {
    const onMap = events.filter((e) => e.map === map && e.end > now).sort((a, b) => a.start - b.start);
    return { map, current: onMap.filter((e) => e.start <= now), next: onMap.find((e) => e.start > now) };
  });
}

export interface Section {
  title: string;
  data: EventOccurrence[];
}

/** Splits an already sorted list into "En cours", "Dans l'heure", "Aujourd'hui", "Demain", "Plus tard". */
export function groupByMoment(events: EventOccurrence[], now: number): Section[] {
  const endOfToday = new Date(now);
  endOfToday.setHours(24, 0, 0, 0);
  const endOfTomorrow = endOfToday.getTime() + 24 * HOUR;
  const buckets: Array<[string, (e: EventOccurrence) => boolean]> = [
    ['En cours', (e) => e.start <= now],
    ['Dans l’heure', (e) => e.start - now <= HOUR],
    ['Aujourd’hui', (e) => e.start < endOfToday.getTime()],
    ['Demain', (e) => e.start < endOfTomorrow],
    ['Plus tard', () => true],
  ];
  const sections: Section[] = buckets.map(([title]) => ({ title, data: [] }));
  for (const e of events) sections[buckets.findIndex(([, test]) => test(e))].data.push(e);
  return sections.filter((s) => s.data.length > 0);
}

/**
 * Conditions that show up at most `max` times in the whole loaded schedule
 * (about 24 h, all maps): those are worth not missing.
 */
export function rareConditions(events: EventOccurrence[], max = 2): Set<string> {
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.condition, (counts.get(e.condition) ?? 0) + 1);
  return new Set([...counts].filter(([, n]) => n <= max).map(([c]) => c));
}

/** Upcoming (or running) occurrences of the same condition, soonest first. */
export function occurrencesOf(events: EventOccurrence[], condition: string, now: number): EventOccurrence[] {
  return events.filter((e) => e.condition === condition && e.end > now).sort((a, b) => a.start - b.start);
}
