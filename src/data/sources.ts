import { parseMetaforge, parseOfficial, type RegionId } from '../core/parsers.ts';
import type { EventOccurrence } from '../core/types.ts';

export interface FetchResult {
  events: EventOccurrence[];
  source: string;
  region: RegionId;
  fetchedAt: number;
}

const OFFICIAL_URL = 'https://arcraiders.com/map-conditions';
const METAFORGE_URL = 'https://metaforge.app/api/arc-raiders/events-schedule';

async function get(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * The official tracker comes first. MetaForge is only a fallback, and only
 * for Europe: its schedule is the European one.
 */
export async function fetchEvents(region: RegionId): Promise<{ result: FetchResult | null; errors: string[] }> {
  const errors: string[] = [];
  const attempts: Array<[string, () => Promise<EventOccurrence[]>]> = [
    ['Site officiel', async () => parseOfficial(await get(OFFICIAL_URL), region)],
  ];
  if (region === 'europe') attempts.push(['MetaForge', async () => parseMetaforge(JSON.parse(await get(METAFORGE_URL)))]);

  for (const [source, load] of attempts) {
    try {
      const events = await load();
      if (events.length > 0) return { result: { events, source, region, fetchedAt: Date.now() }, errors };
      errors.push(`${source} : aucun événement trouvé`);
    } catch (e) {
      errors.push(`${source} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { result: null, errors };
}
