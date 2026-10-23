// Fetches the live sources and prints what the app's parsers extract from
// them. Run in CI (the sources are not reachable from every dev machine).
import { parseMetaforge, parseOfficial, REGIONS } from '../src/core/parsers.ts';

const res = await fetch('https://arcraiders.com/map-conditions');
const html = await res.text();
for (const r of REGIONS) {
  const events = parseOfficial(html, r.id);
  console.log(`official ${r.id}: ${events.length} events`);
}
const now = Date.now();
const europe = parseOfficial(html, 'europe').filter((e) => e.end > now);
for (const e of europe.slice(0, 12)) {
  console.log(new Date(e.start).toISOString(), e.map, '·', e.condition);
}
console.log('maps:', [...new Set(europe.map((e) => e.map))].join(', '));
console.log('conditions:', [...new Set(europe.map((e) => e.condition))].join(', '));

const mf = parseMetaforge(await (await fetch('https://metaforge.app/api/arc-raiders/events-schedule')).json());
console.log(`metaforge: ${mf.length} events`);
const key = (e: { map: string; condition: string; start: number }) => `${e.map}|${e.condition}|${e.start}`;
const official = new Set(europe.map(key));
const overlap = mf.filter((e) => e.start >= now && e.start < now + 12 * 3600_000);
console.log(`metaforge next 12h matching official Europe: ${overlap.filter((e) => official.has(key(e))).length}/${overlap.length}`);
if (europe.length === 0) process.exit(1);
