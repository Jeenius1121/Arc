// Builds src/data/gamedata.json (French only, trimmed to what the app uses)
// from a checkout of the community data repository
// https://github.com/fgrzesiak/arcraiders-data (MIT, synced from arctracker.io).
//
//   node scripts/build-gamedata.ts <path-to-arcraiders-data> [output]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { GameData, GameItem } from '../src/core/gamedata.ts';

const [src, out = 'src/data/gamedata.json'] = process.argv.slice(2);
if (!src) {
  console.error('usage: node scripts/build-gamedata.ts <arcraiders-data dir> [output]');
  process.exit(1);
}

type Loc = Record<string, string> | string | undefined;
const fr = (v: Loc): string => (typeof v === 'string' ? v : (v?.fr ?? v?.en ?? '')).trim();
const json = (p: string) => JSON.parse(readFileSync(join(src, p), 'utf8'));
const counts = (list: Array<{ itemId: string; quantity: number }> | undefined) =>
  (list ?? []).map((r) => ({ id: r.itemId, n: r.quantity }));

const TYPES: Record<string, string> = {
  Recyclable: 'Recyclable',
  Design: 'Design',
  'Outpost Furniture': 'Mobilier d’avant-poste',
  Blueprint: 'Plan',
  Trinket: 'Bibelot',
  'Quick Use': 'Utilisation rapide',
  'Topside Material': 'Matériau de surface',
  Key: 'Clé',
  Modification: 'Modification',
  'Assault Rifle': 'Fusil d’assaut',
  'Battle Rifle': 'Fusil de combat',
  Special: 'Spécial',
  Pistol: 'Pistolet',
  'Sniper Rifle': 'Fusil de précision',
  SMG: 'Pistolet-mitrailleur',
  Augment: 'Augmentation',
  Research: 'Recherche',
  Stencil: 'Pochoir',
  Shotgun: 'Fusil à pompe',
  'Refined Material': 'Matériau raffiné',
  Nature: 'Nature',
  'Hand Cannon': 'Canon à main',
  'Basic Material': 'Matériau de base',
  Misc: 'Divers',
  Ammunition: 'Munitions',
  'Outpost Room': 'Pièce d’avant-poste',
  LMG: 'Mitrailleuse légère',
  Shield: 'Bouclier',
};

const THEMES: Record<string, string> = {
  Mechanical: 'Mécanique',
  Industrial: 'Industriel',
  Electrical: 'Électrique',
  Technological: 'Technologique',
  ARC: 'ARC',
  Medical: 'Médical',
  Residential: 'Résidentiel',
  Commercial: 'Commercial',
  Exodus: 'Exodus',
  'Old World': 'Ancien monde',
  Nature: 'Nature',
  Security: 'Sécurité',
  Raider: 'Raider',
};

/** Map condition slugs used in bots.json → English condition names (translated by the app). */
const EVENT_SLUGS: Record<string, string> = {
  'night-raid': 'Night Raid',
  hurricane: 'Hurricane',
  frigate: 'ARC Frigate',
  'close-scrutiny': 'Close Scrutiny',
  'electromagnetic-storm': 'Electromagnetic Storm',
  'cold-snap': 'Cold Snap',
};

const maps: Record<string, string> = {};
for (const m of json('maps.json')) maps[m.id] = fr(m.name);
// bots.json uses short ids for some maps.
Object.assign(maps, { stella_montis: 'Stella Montis' });

const benches: Record<string, string> = { in_raid: 'En raid', workbench: 'Établi' };
const benchData: GameData['benches'] = [];
for (const f of readdirSync(join(src, 'hideout')).filter((f) => f.endsWith('.json') && !f.startsWith('all'))) {
  const b = json(`hideout/${f}`);
  benches[b.id] = fr(b.name);
  if (b.levels?.length) {
    benchData.push({
      id: b.id,
      name: fr(b.name),
      levels: b.levels.map((l: any) => ({
        level: l.level,
        req: counts(l.requirementItemIds),
        other: [...(l.otherRequirements ?? []), ...(l.description ? [l.description] : [])],
      })),
    });
  }
}

const items: Record<string, GameItem> = {};
for (const i of json('items.json').items) {
  const item: GameItem = {
    id: i.id,
    name: fr(i.name) || i.id,
    type: TYPES[i.type] ?? i.type,
    rarity: i.rarity,
    stack: i.stackSize ?? 1,
  };
  const desc = fr(i.description);
  if (desc) item.desc = desc;
  if (i.value) item.value = i.value;
  if (i.weightKg) item.weight = i.weightKg;
  if (i.imageFilename) item.img = i.imageFilename;
  if (i.recipe) item.recipe = i.recipe;
  if (i.craftQuantity) item.craftQty = i.craftQuantity;
  if (i.craftBench) item.bench = (Array.isArray(i.craftBench) ? i.craftBench : [i.craftBench]).map((b: string) => benches[b] ?? b);
  if (i.recyclesInto) item.recycles = i.recyclesInto;
  if (i.salvagesInto) item.salvages = i.salvagesInto;
  if (i.foundIn) item.foundIn = String(i.foundIn).split(',').map((t) => THEMES[t.trim()] ?? t.trim());
  if (i.vendors?.length) item.vendors = i.vendors.map((v: any) => ({ trader: v.trader, cost: v.cost }));
  if (i.questItem) item.questItem = true;
  if (i.phasedOut) item.phasedOut = true;
  items[i.id] = item;
}

const quests: GameData['quests'] = [];
for (const f of readdirSync(join(src, 'quests')).filter((f) => f.endsWith('.json') && !f.startsWith('all'))) {
  const q = json(`quests/${f}`);
  if (Array.isArray(q)) continue;
  quests.push({
    id: q.id,
    name: fr(q.name),
    trader: q.trader,
    maps: (q.map ?? []).map((m: string) => maps[m] ?? m),
    desc: fr(q.description),
    objectives: (q.objectives ?? []).map(fr),
    req: counts(q.requiredItemIds),
    rewards: counts(q.rewardItemIds),
    xp: q.xp ?? 0,
    prev: q.previousQuestIds ?? [],
    next: q.nextQuestIds ?? [],
  });
}

const projects: GameData['projects'] = json('projects.json')
  .filter((p: any) => !p.disabled)
  .map((p: any) => ({
    id: p.id,
    name: fr(p.name),
    desc: fr(p.description),
    phases: (p.phases ?? []).map((ph: any) => ({ phase: ph.phase, name: fr(ph.name), req: counts(ph.requirementItemIds) })),
  }));

const bots: GameData['bots'] = json('bots.json').map((b: any) => ({
  id: b.id,
  name: b.nameTranslations?.fr ?? b.name,
  type: b.type,
  threat: b.threat,
  desc: b.description ?? '',
  weakness: b.weakness ?? '',
  maps: (b.maps ?? []).map((m: string) => maps[m] ?? m),
  drops: b.drops ?? [],
  img: b.image,
  xp: (b.destroyXp ?? 0) + (b.lootXp ?? 0),
  moreDuring: (b.spawns ?? [])
    .filter((s: any) => s.moreDuring?.length)
    .map((s: any) => ({ map: maps[s.map] ?? s.map, events: s.moreDuring.map((e: string) => EVENT_SLUGS[e] ?? e) })),
}));

const trades: GameData['trades'] = json('trades.json').map((t: any) => ({
  trader: t.trader,
  item: t.itemId,
  n: t.quantity,
  cost: { id: t.cost.itemId, n: t.cost.quantity },
  daily: t.dailyLimit ?? undefined,
}));

const mapImages: GameData['maps'] = json('maps.json')
  .filter((m: any) => m.image)
  .map((m: any) => ({ id: m.id, name: fr(m.name), img: m.image }));

const data: GameData = {
  version: json('items.json').version ?? '',
  generatedAt: new Date().toISOString(),
  items,
  maps: mapImages,
  quests: quests.sort((a, b) => a.trader.localeCompare(b.trader) || a.name.localeCompare(b.name)),
  benches: benchData,
  projects,
  bots,
  trades,
};
writeFileSync(out, JSON.stringify(data));
console.log(
  `${out}: ${Object.keys(items).length} items, ${quests.length} quests, ${benchData.length} benches, ${projects.length} projects, ${bots.length} ARC, ${trades.length} trades`,
);
