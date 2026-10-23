import { conditionName, mapName } from './names.ts';
import type { EventOccurrence } from './types.ts';

/**
 * Server regions offered by the official tracker. The page's base timestamps
 * are Europe's; the others come from each entry's `regionTimestamps`.
 */
export const REGIONS = [
  { id: 'europe', label: 'Europe' },
  { id: 'north-america', label: 'Amérique du Nord' },
  { id: 'brazil', label: 'Brésil' },
  { id: 'east-asia', label: 'Asie de l’Est' },
  { id: 'oceania', label: 'Océanie' },
] as const;

export type RegionId = (typeof REGIONS)[number]['id'];

function occurrence(map: string, condition: string, start: number, end: number): EventOccurrence {
  const m = mapName(map);
  const c = conditionName(condition);
  return { id: `${m}|${c}|${start}`, map: m, condition: c, start, end };
}

interface OfficialEntry {
  conditionName: string;
  mapDisplayName: string;
  startTimestamp: number;
  endTimestamp: number;
  regionTimestamps?: Record<string, [number, number]>;
}

/**
 * arcraiders.com/map-conditions is a Next.js page: the schedule sits in the
 * React Server Components payload (self.__next_f.push chunks) as a
 * `"liveEntries": [...]` array.
 */
export function parseOfficial(html: string, region: RegionId): EventOccurrence[] {
  let flight = '';
  for (const m of html.matchAll(/self\.__next_f\.push\(\[\s*\d+\s*,\s*("(?:[^"\\]|\\.)*")\s*\]\)/g)) {
    try {
      flight += JSON.parse(m[1]);
    } catch {
      // Skip malformed chunk.
    }
  }
  const key = '"liveEntries":';
  const at = flight.indexOf(key);
  if (at < 0) throw new Error('planning introuvable dans la page');
  const entries = JSON.parse(sliceJsonArray(flight, at + key.length)) as OfficialEntry[];

  const out: EventOccurrence[] = [];
  for (const e of entries) {
    const times = region === 'europe' ? [e.startTimestamp, e.endTimestamp] : e.regionTimestamps?.[region];
    if (!times || !e.conditionName || !e.mapDisplayName) continue;
    out.push(occurrence(e.mapDisplayName, e.conditionName, times[0], times[1]));
  }
  return dedupe(out);
}

/** Returns the JSON array text starting at `from` (which must point at '['). */
function sliceJsonArray(text: string, from: number): string {
  let depth = 0;
  let inString = false;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return text.slice(from, i + 1);
    }
  }
  throw new Error('planning tronqué');
}

/** MetaForge /api/arc-raiders/events-schedule: { data: [{ name, map, startTime, endTime }], region }. */
export function parseMetaforge(json: unknown): EventOccurrence[] {
  const data = (json as { data?: unknown })?.data;
  if (!Array.isArray(data)) throw new Error('format inattendu');
  const out: EventOccurrence[] = [];
  for (const e of data as Array<Record<string, unknown>>) {
    if (typeof e.name !== 'string' || typeof e.map !== 'string' || typeof e.startTime !== 'number') continue;
    const end = typeof e.endTime === 'number' ? e.endTime : e.startTime + 3600_000;
    out.push(occurrence(e.map, e.name, e.startTime, end));
  }
  return dedupe(out);
}

function dedupe(events: EventOccurrence[]): EventOccurrence[] {
  const byId = new Map(events.map((e) => [e.id, e]));
  return [...byId.values()].sort((a, b) => a.start - b.start || a.map.localeCompare(b.map));
}
