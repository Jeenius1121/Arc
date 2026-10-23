import type { EventOccurrence } from './types.ts';

/**
 * Turns arbitrary JSON coming from a schedule source into EventOccurrences.
 *
 * The official site and community APIs do not publish a documented format, so
 * instead of hard-coding one shape we walk the whole tree and pick up any
 * object that (directly or through its parents) carries a map, a condition
 * name and a start time. Supported shapes include:
 *   { map, condition, start, end }
 *   { map: { name }, events: [{ name, startTime, endTime }] }
 *   { name, map, times: [{ start: "14:00", end: "15:00" }] }   (daily, UTC)
 */

const MAP_KEYS = ['map', 'mapName', 'map_name', 'mapId', 'map_id', 'location', 'sector', 'zone'];
const CONDITION_KEYS = [
  'condition',
  'conditionName',
  'condition_name',
  'event',
  'eventName',
  'event_name',
  'modifier',
  'name',
  'title',
  'label',
  'type',
];
const START_KEYS = ['start', 'startTime', 'start_time', 'startsAt', 'starts_at', 'startAt', 'start_at', 'from', 'begin', 'time'];
const END_KEYS = ['end', 'endTime', 'end_time', 'endsAt', 'ends_at', 'endAt', 'end_at', 'to', 'until'];

/** Events start on the hour and last about an hour when no end is given. */
export const DEFAULT_DURATION_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const KNOWN_MAPS: Array<[RegExp, string]> = [
  [/dam|barrage|battleground|champ.?de.?bataille/i, 'Dam Battlegrounds'],
  [/buried|ensevelie|enfouie/i, 'Buried City'],
  [/space.?port|astroport/i, 'Spaceport'],
  [/blue.?gate|porte.?bleue/i, 'The Blue Gate'],
  [/stella|montis/i, 'Stella Montis'],
];

/** Maps aliases / ids ("dam_battlegrounds", "Barrage") to one display name per map. */
export function canonicalMap(raw: string): string {
  const cleaned = raw.trim();
  for (const [re, name] of KNOWN_MAPS) if (re.test(cleaned)) return name;
  return prettify(cleaned);
}

export function prettify(raw: string): string {
  const s = raw.trim();
  if (/[_-]/.test(s) && !/\s/.test(s)) {
    return s
      .split(/[_-]+/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  return s;
}

type TimeValue = { kind: 'absolute'; ms: number } | { kind: 'daily'; minutesUtc: number };

export function parseTime(value: unknown): TimeValue | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 1e12) return { kind: 'absolute', ms: value };
    if (value > 1e9) return { kind: 'absolute', ms: value * 1000 };
    return null;
  }
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (/^\d{10,13}$/.test(s)) return parseTime(Number(s));
  const hm = /^(\d{1,2})[:h](\d{2})(?::\d{2})?\s*(utc|z)?$/i.exec(s);
  if (hm) {
    const h = Number(hm[1]);
    const m = Number(hm[2]);
    if (h > 24 || m > 59) return null;
    return { kind: 'daily', minutesUtc: (h % 24) * 60 + m };
  }
  if (/\d{4}-\d{2}-\d{2}/.test(s)) {
    const ms = Date.parse(s);
    if (!Number.isNaN(ms)) return { kind: 'absolute', ms };
  }
  return null;
}

function textOf(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    for (const k of ['name', 'title', 'label', 'displayName', 'id', 'slug']) {
      if (typeof o[k] === 'string' && (o[k] as string).trim()) return (o[k] as string).trim();
    }
  }
  return null;
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}

interface Context {
  map?: string;
  condition?: string;
}

interface RawOccurrence {
  map: string;
  condition: string;
  start: TimeValue;
  end: TimeValue | null;
}

function walk(node: unknown, ctx: Context, out: RawOccurrence[], depth: number): void {
  if (depth > 40 || node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) {
      // A bare list of times under an event: ["14:00", "18:00"].
      const t = parseTime(child);
      if (t && ctx.map && ctx.condition) out.push({ map: ctx.map, condition: ctx.condition, start: t, end: null });
      else walk(child, ctx, out, depth + 1);
    }
    return;
  }
  const obj = node as Record<string, unknown>;
  const map = textOf(pick(obj, MAP_KEYS)) ?? ctx.map;
  const ownCondition = textOf(pick(obj, CONDITION_KEYS));
  // An object naming a map but no explicit map key is a map grouping, not a condition.
  const isMapGroup = !pick(obj, MAP_KEYS) && ownCondition !== null && isKnownMap(ownCondition) && !ctx.map;
  const next: Context = isMapGroup
    ? { map: ownCondition!, condition: ctx.condition }
    : { map, condition: ownCondition ?? ctx.condition };

  const start = parseTime(pick(obj, START_KEYS));
  if (start && next.map && next.condition) {
    out.push({ map: next.map, condition: next.condition, start, end: parseTime(pick(obj, END_KEYS)) });
  }
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !START_KEYS.includes(k) && !END_KEYS.includes(k)) walk(v, next, out, depth + 1);
  }
}

function isKnownMap(name: string): boolean {
  return KNOWN_MAPS.some(([re]) => re.test(name));
}

/**
 * Daily "HH:MM" times are expanded into concrete occurrences from
 * yesterday through `horizonMs` after `now`, so running events are kept.
 */
export function normalize(data: unknown, now: number, horizonMs = 2 * DAY_MS): EventOccurrence[] {
  const raw: RawOccurrence[] = [];
  walk(data, {}, raw, 0);

  const seen = new Map<string, EventOccurrence>();
  const add = (map: string, condition: string, start: number, end: number) => {
    if (end <= start) end = start + DEFAULT_DURATION_MS;
    if (end < now - DAY_MS || start > now + horizonMs) return;
    const m = canonicalMap(map);
    const c = prettify(condition);
    if (isKnownMap(c) || c.length > 60) return;
    const id = `${m}|${c}|${start}`;
    if (!seen.has(id)) seen.set(id, { id, map: m, condition: c, start, end });
  };

  const dayStart = Math.floor(now / DAY_MS) * DAY_MS;
  for (const r of raw) {
    if (r.start.kind === 'absolute') {
      const end = r.end?.kind === 'absolute' ? r.end.ms : r.start.ms + DEFAULT_DURATION_MS;
      add(r.map, r.condition, r.start.ms, end);
      continue;
    }
    let durationMs = DEFAULT_DURATION_MS;
    if (r.end?.kind === 'daily') {
      const diff = (r.end.minutesUtc - r.start.minutesUtc + 1440) % 1440;
      if (diff > 0) durationMs = diff * 60 * 1000;
    }
    for (let day = dayStart - DAY_MS; day <= now + horizonMs; day += DAY_MS) {
      const start = day + r.start.minutesUtc * 60 * 1000;
      add(r.map, r.condition, start, start + durationMs);
    }
  }
  return [...seen.values()].sort((a, b) => a.start - b.start);
}
