/// <reference types="node" />
// Fixtures reproduce the shape of arcraiders.com/map-conditions and
// MetaForge's events-schedule as captured in October 2026.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { alertSummary, optionAvailable, triggersFor } from '../src/core/alerts.ts';
import { DEFAULT_FAVORITES, favoriteTriggers, inQuietHours, migrateFavorites } from '../src/core/favorites.ts';
import { groupByMoment, mapsNow, rareConditions } from '../src/core/insights.ts';
import { applyFilter, countdown } from '../src/core/filter.ts';
import { conditionName, mapName } from '../src/core/names.ts';
import { parseMetaforge, parseOfficial } from '../src/core/parsers.ts';
import { EMPTY_FILTER } from '../src/core/types.ts';

const H = 3600_000;
const NOW = 1792710000000;

const liveEntries = [
  {
    conditionName: 'Night Raid',
    mapDisplayName: 'Stella Montis',
    durationInSeconds: 3600,
    startTimestamp: NOW,
    endTimestamp: NOW + H,
    regionTimestamps: { 'north-america': [NOW + 7 * H, NOW + 8 * H], oceania: [NOW - 9 * H, NOW - 8 * H] },
  },
  {
    conditionName: 'Redirection',
    mapDisplayName: 'Pendola Pass',
    durationInSeconds: 3600,
    startTimestamp: NOW,
    endTimestamp: NOW + H,
    regionTimestamps: { 'north-america': [NOW + 7 * H, NOW + 8 * H] },
  },
];

/** The RSC payload is split across several push() calls, mid-JSON. */
function officialHtml(): string {
  const flight = `5:["$","$L14",null,{"conditionItems":[{"name":"Night Raid","type":"major"}],"liveEntries":${JSON.stringify(liveEntries)},"lookAheadMs":86400000}]\n`;
  const cut = Math.floor(flight.length / 2);
  return [flight.slice(0, cut), flight.slice(cut)]
    .map((part) => `<script>self.__next_f.push([1,${JSON.stringify(part)}])</script>`)
    .join('\n');
}

test('parseOfficial reads Europe (base) timestamps across split chunks', () => {
  const events = parseOfficial(officialHtml(), 'europe');
  assert.deepEqual(
    events.map((e) => [e.map, e.condition, e.start]),
    [
      ['Col de Pendola', 'Redirection', NOW],
      ['Stella Montis', 'Raid nocturne', NOW],
    ],
  );
});

test('parseOfficial uses regionTimestamps for other regions', () => {
  const na = parseOfficial(officialHtml(), 'north-america');
  assert.equal(na.length, 2);
  assert.ok(na.every((e) => e.start === NOW + 7 * H));
  const oce = parseOfficial(officialHtml(), 'oceania');
  assert.deepEqual(oce.map((e) => e.condition), ['Raid nocturne']);
});

test('parseOfficial fails clearly when the schedule is missing', () => {
  assert.throws(() => parseOfficial('<html></html>', 'europe'), /planning introuvable/);
});

test('parseMetaforge reads events-schedule', () => {
  const events = parseMetaforge({
    data: [{ name: 'Matriarch', map: 'Dam', icon: 'x', startTime: NOW + H, endTime: NOW + 2 * H }],
    region: 'europe',
  });
  assert.deepEqual(events.map((e) => [e.map, e.condition]), [['Champ de bataille du Barrage', 'Matriarche']]);
});

test('French names for maps and conditions', () => {
  assert.equal(mapName('The Blue Gate'), 'Portail bleu');
  assert.equal(mapName('Blue Gate'), 'Portail bleu');
  assert.equal(mapName('Buried City'), 'Ville enfouie');
  assert.equal(mapName('Spaceport'), 'Port spatial');
  assert.equal(conditionName('Electromagnetic Storm'), 'Tempête électromagnétique');
  assert.equal(conditionName('Launch Tower Loot'), 'Butin de la tour de lancement');
  assert.equal(conditionName('Some New Event'), 'Some New Event');
});

test('applyFilter combines criteria and sorts soonest first', () => {
  const ev = (map: string, condition: string, startH: number) => ({
    id: `${map}${condition}${startH}`,
    map,
    condition,
    start: NOW + startH * H,
    end: NOW + (startH + 1) * H,
  });
  const dam = 'Champ de bataille du Barrage';
  const events = [
    ev(dam, 'Raid nocturne', 5),
    ev('Port spatial', 'Raid nocturne', 2),
    ev(dam, 'Tempête électromagnétique', 1),
    ev(dam, 'Butin de la tour de lancement', 3),
    ev('Port spatial', 'Raid nocturne', -3), // finished
  ];
  const night = applyFilter(events, { ...EMPTY_FILTER, categories: ['night'] }, NOW);
  assert.deepEqual(night.map((e) => e.map), ['Port spatial', dam]);

  const stormDam = applyFilter(events, { ...EMPTY_FILTER, categories: ['weather'], maps: [dam] }, NOW);
  assert.deepEqual(stormDam.map((e) => e.condition), ['Tempête électromagnétique']);

  const lootDam = applyFilter(events, { ...EMPTY_FILTER, categories: ['loot'], maps: [dam] }, NOW);
  assert.deepEqual(lootDam.map((e) => e.condition), ['Butin de la tour de lancement']);
});

test('countdown text', () => {
  const e = { id: 'x', map: 'm', condition: 'c', start: NOW + H + 65_000, end: NOW + 2 * H };
  assert.equal(countdown(e, NOW).text, 'Dans 1 h 01 min 05 s');
  assert.equal(countdown(e, NOW + 1.5 * H).running, true);
});

test('alert triggers skip past times and cover start, before and end', () => {
  const event = { id: 'e', map: 'Stella Montis', condition: 'Raid nocturne', start: NOW + H, end: NOW + 2 * H };
  const triggers = triggersFor({ event, minutesBefore: [0, 30, 120], atEnd: true }, NOW);
  assert.deepEqual(
    triggers.map((t) => t.at),
    [NOW + 0.5 * H, NOW + H, NOW + 2 * H],
    '2 h before is already past',
  );
  assert.match(triggers[0].body, /Commence dans 30 min/);
  assert.equal(triggers[2].body, 'L’événement est terminé.');
  assert.equal(triggers[0].title, 'Raid nocturne · Stella Montis');
  assert.equal(optionAvailable(event, 60, NOW), false);
  assert.equal(optionAvailable(event, 30, NOW), true);
  assert.equal(alertSummary({ event, minutesBefore: [0, 60], atEnd: true, notificationIds: [] }), '1 h avant · début · fin');
});

test('favorite triggers cover every upcoming occurrence except belled ones', () => {
  const ev = (id: string, condition: string, startH: number) => ({ id, map: 'Portail bleu', condition, start: NOW + startH * H, end: NOW + (startH + 1) * H });
  const events = [
    ev('a', 'Tempête électromagnétique', 2),
    ev('b', 'Tempête électromagnétique', 10),
    ev('c', 'Tempête électromagnétique', 12),
    ev('d', 'Raid nocturne', 3),
    ev('e', 'Tempête électromagnétique', -0.5), // already running
  ];
  const fav = { ...DEFAULT_FAVORITES, rules: [{ condition: 'Tempête électromagnétique', maps: [] }], minutesBefore: [0, 15] };
  const triggers = favoriteTriggers(events, fav, NOW, new Set(['c']));
  assert.deepEqual(
    triggers.map((t) => t.id),
    ['fav:a|0', 'fav:a|15', 'fav:b|0', 'fav:b|15'],
  );
  assert.deepEqual(favoriteTriggers(events, DEFAULT_FAVORITES, NOW, new Set()), []);
});

test('favorites can be limited to some maps and muted during quiet hours', () => {
  const ev = (id: string, map: string, startH: number) => ({ id, map, condition: 'Ouragan', start: NOW + startH * H, end: NOW + (startH + 1) * H });
  const events = [ev('a', 'Portail bleu', 1), ev('b', 'Port spatial', 2), ev('c', 'Portail bleu', 5)];
  const onlyBlueGate = { ...DEFAULT_FAVORITES, rules: [{ condition: 'Ouragan', maps: ['Portail bleu'] }] };
  assert.deepEqual(favoriteTriggers(events, onlyBlueGate, NOW, new Set()).map((t) => t.eventId), ['a', 'c']);

  // Quiet hours covering event c's local start hour only.
  const h = new Date(NOW + 5 * H).getHours();
  const quiet = { ...onlyBlueGate, quiet: { enabled: true, start: h, end: (h + 1) % 24 } };
  assert.deepEqual(favoriteTriggers(events, quiet, NOW, new Set()).map((t) => t.eventId), ['a']);
  assert.equal(inQuietHours(Date.UTC(2026, 0, 1, 0, 0), { enabled: false, start: 0, end: 23 }), false);
});

test('favorites saved by older versions are migrated', () => {
  const fav = migrateFavorites({ conditions: ['Raid nocturne'], minutesBefore: [15] });
  assert.deepEqual(fav.rules, [{ condition: 'Raid nocturne', maps: [] }]);
  assert.deepEqual(fav.minutesBefore, [15]);
  assert.equal(fav.quiet.enabled, false);
  assert.deepEqual(migrateFavorites(null), DEFAULT_FAVORITES);
});

test('map view, moment groups and rarity', () => {
  const ev = (id: string, map: string, condition: string, startH: number) => ({ id, map, condition, start: NOW + startH * H, end: NOW + (startH + 1) * H });
  const events = [
    ev('a', 'Stella Montis', 'Raid nocturne', -0.5),
    ev('b', 'Stella Montis', 'Raid nocturne', 1.5),
    ev('c', 'Port spatial', 'Matriarche', 0.5),
    ev('d', 'Port spatial', 'Raid nocturne', 30),
  ];
  const maps = mapsNow(events, NOW);
  assert.deepEqual(
    maps.map((m) => [m.map, m.current.map((e) => e.id), m.next?.id]),
    [
      ['Port spatial', [], 'c'],
      ['Stella Montis', ['a'], 'b'],
    ],
  );
  const groups = groupByMoment(events, NOW);
  assert.equal(groups[0].title, 'En cours');
  assert.deepEqual(groups[0].data.map((e) => e.id), ['a']);
  assert.equal(groups[1].title, 'Dans l’heure');
  assert.deepEqual(groups.at(-1)!.data.map((e) => e.id), ['d']);
  assert.deepEqual([...rareConditions(events)], ['Matriarche']);
});
