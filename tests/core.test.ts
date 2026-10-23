/// <reference types="node" />
// Fixtures below are synthetic shapes used to exercise the parser; they are
// not real ARC Raiders schedule data.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyFilter, countdown } from '../src/core/filter.ts';
import { extractPayloads } from '../src/core/html.ts';
import { canonicalMap, normalize, parseTime } from '../src/core/normalize.ts';
import { EMPTY_FILTER } from '../src/core/types.ts';

const H = 3600_000;
const NOW = Date.UTC(2026, 9, 23, 12, 30); // 12:30 UTC

test('parseTime handles epoch, ISO and daily HH:MM', () => {
  assert.deepEqual(parseTime(1_700_000_000), { kind: 'absolute', ms: 1_700_000_000_000 });
  assert.deepEqual(parseTime('2026-10-23T14:00:00Z'), { kind: 'absolute', ms: Date.UTC(2026, 9, 23, 14) });
  assert.deepEqual(parseTime('14:00'), { kind: 'daily', minutesUtc: 840 });
  assert.equal(parseTime('hello'), null);
});

test('canonicalMap merges aliases', () => {
  assert.equal(canonicalMap('dam_battlegrounds'), 'Dam Battlegrounds');
  assert.equal(canonicalMap('Champ de bataille du barrage'), 'Dam Battlegrounds');
  assert.equal(canonicalMap('blue-gate'), 'The Blue Gate');
});

test('normalize flat absolute records', () => {
  const events = normalize(
    { data: [{ map: 'Spaceport', condition: 'Night Raid', startTime: NOW + H, endTime: NOW + 2 * H }] },
    NOW,
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].map, 'Spaceport');
  assert.equal(events[0].condition, 'Night Raid');
});

test('normalize map groups with nested daily times', () => {
  const events = normalize(
    [{ name: 'Buried City', events: [{ name: 'Electromagnetic Storm', times: [{ start: '13:00', end: '14:00' }] }] }],
    NOW,
  );
  assert.ok(events.length >= 2, 'daily time expanded over several days');
  const next = events.find((e) => e.start > NOW)!;
  assert.equal(next.map, 'Buried City');
  assert.equal(next.condition, 'Electromagnetic Storm');
  assert.equal(next.start, Date.UTC(2026, 9, 23, 13));
  assert.equal(next.end - next.start, H);
});

test('normalize event-first shape with map field and string list', () => {
  const events = normalize({ events: [{ name: 'Harvester', map: { name: 'Dam' }, times: ['18:00'] }] }, NOW);
  const today = events.find((e) => e.start === Date.UTC(2026, 9, 23, 18));
  assert.ok(today);
  assert.equal(today!.map, 'Dam Battlegrounds');
});

test('extractPayloads reads __NEXT_DATA__ and hour tables', () => {
  const html = `
    <script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"conditions":[{"map":"Stella Montis","condition":"Night Raid","start":"2026-10-23T15:00:00Z"}]}}}</script>
    <table><tr><th>Map</th><th>13:00</th><th>14:00</th></tr>
    <tr><td>Spaceport</td><td>Hurricane</td><td>-</td></tr></table>`;
  const events = normalize(extractPayloads(html), NOW);
  assert.deepEqual(
    events.filter((e) => e.start > NOW && e.start < NOW + 3 * H).map((e) => `${e.map}/${e.condition}`),
    ['Spaceport/Hurricane', 'Stella Montis/Night Raid'],
  );
});

test('applyFilter combines criteria and sorts soonest first', () => {
  const ev = (map: string, condition: string, startH: number) => ({
    id: `${map}${condition}${startH}`,
    map,
    condition,
    start: NOW + startH * H,
    end: NOW + (startH + 1) * H,
  });
  const events = [
    ev('Dam Battlegrounds', 'Night Raid', 5),
    ev('Spaceport', 'Night Raid', 2),
    ev('Dam Battlegrounds', 'Electromagnetic Storm', 1),
    ev('Dam Battlegrounds', 'Launch Tower Loot', 3),
    ev('Spaceport', 'Night Raid', -3), // finished
  ];
  const night = applyFilter(events, { ...EMPTY_FILTER, categories: ['night'] }, NOW);
  assert.deepEqual(night.map((e) => e.map), ['Spaceport', 'Dam Battlegrounds']);

  const stormDam = applyFilter(events, { ...EMPTY_FILTER, categories: ['weather'], maps: ['Dam Battlegrounds'] }, NOW);
  assert.deepEqual(stormDam.map((e) => e.condition), ['Electromagnetic Storm']);

  const lootDam = applyFilter(events, { ...EMPTY_FILTER, categories: ['loot'], maps: ['Dam Battlegrounds'] }, NOW);
  assert.deepEqual(lootDam.map((e) => e.condition), ['Launch Tower Loot']);
});

test('countdown text', () => {
  const e = { id: 'x', map: 'm', condition: 'c', start: NOW + H + 65_000, end: NOW + 2 * H };
  assert.equal(countdown(e, NOW).text, 'Dans 1 h 01 min 05 s');
  assert.equal(countdown(e, NOW + 1.5 * H).running, true);
});
