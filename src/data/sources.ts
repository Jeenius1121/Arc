import { extractPayloads } from '../core/html.ts';
import { normalize } from '../core/normalize.ts';
import type { EventOccurrence } from '../core/types.ts';

export interface Source {
  id: string;
  label: string;
  url: string;
  kind: 'html' | 'json';
}

/**
 * Tried in order; the first one that yields events wins. The official page
 * comes first. The community API is a fallback in case the official page is
 * fully rendered client-side and carries no data in its HTML.
 */
export const DEFAULT_SOURCES: Source[] = [
  { id: 'official', label: 'Site officiel (arcraiders.com)', url: 'https://arcraiders.com/map-conditions', kind: 'html' },
  { id: 'metaforge', label: 'MetaForge (communautaire)', url: 'https://metaforge.app/api/arc-raiders/event-timers', kind: 'json' },
];

export interface FetchResult {
  events: EventOccurrence[];
  source: Source;
  fetchedAt: number;
}

export async function fetchFrom(source: Source, now = Date.now()): Promise<EventOccurrence[]> {
  const res = await fetch(source.url, {
    headers: { Accept: source.kind === 'json' ? 'application/json' : 'text/html,application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const trimmed = text.trimStart();
  const payloads =
    trimmed.startsWith('{') || trimmed.startsWith('[') ? [JSON.parse(trimmed)] : extractPayloads(text);
  return normalize(payloads, now);
}

export async function fetchEvents(sources: Source[]): Promise<{ result: FetchResult | null; errors: string[] }> {
  const errors: string[] = [];
  for (const source of sources) {
    try {
      const events = await fetchFrom(source);
      if (events.length > 0) return { result: { events, source, fetchedAt: Date.now() }, errors };
      errors.push(`${source.label} : aucun événement trouvé dans la page`);
    } catch (e) {
      errors.push(`${source.label} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { result: null, errors };
}
