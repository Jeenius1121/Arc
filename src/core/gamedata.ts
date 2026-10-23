/**
 * Game data (items, quests, workshop, projects, ARC, trades) in French, built
 * by scripts/build-gamedata.ts from the community data repository.
 */
export interface Need {
  id: string;
  n: number;
}

export interface GameItem {
  id: string;
  name: string;
  type: string;
  rarity: string;
  stack: number;
  desc?: string;
  value?: number;
  weight?: number;
  img?: string;
  recipe?: Record<string, number>;
  craftQty?: number;
  bench?: string[];
  recycles?: Record<string, number>;
  salvages?: Record<string, number>;
  foundIn?: string[];
  vendors?: Array<{ trader: string; cost: Record<string, number> }>;
  questItem?: boolean;
  phasedOut?: boolean;
}

export interface Quest {
  id: string;
  name: string;
  trader: string;
  maps: string[];
  desc: string;
  objectives: string[];
  req: Need[];
  rewards: Need[];
  xp: number;
  prev: string[];
  next: string[];
}

export interface Bench {
  id: string;
  name: string;
  levels: Array<{ level: number; req: Need[]; other: string[] }>;
}

export interface Project {
  id: string;
  name: string;
  desc: string;
  phases: Array<{ phase: number; name: string; req: Need[] }>;
}

export interface Bot {
  id: string;
  name: string;
  type: string;
  threat: string;
  desc: string;
  weakness: string;
  maps: string[];
  drops: string[];
  img?: string;
  xp: number;
  /** Maps where this ARC is more common during the given (English) conditions. */
  moreDuring: Array<{ map: string; events: string[] }>;
}

export interface Trade {
  trader: string;
  item: string;
  n: number;
  cost: Need;
  daily?: number;
}

export interface GameData {
  version: string;
  generatedAt: string;
  items: Record<string, GameItem>;
  quests: Quest[];
  benches: Bench[];
  projects: Project[];
  bots: Bot[];
  trades: Trade[];
}

export const RARITY_FR: Record<string, string> = {
  Common: 'Commun',
  Uncommon: 'Peu commun',
  Rare: 'Rare',
  Epic: 'Épique',
  Legendary: 'Légendaire',
};

export const RARITY_COLOR: Record<string, string> = {
  Common: '#9ca3af',
  Uncommon: '#4ade80',
  Rare: '#60a5fa',
  Epic: '#c084fc',
  Legendary: '#f2c14e',
};

/** Lower-case, accent-free text for search. */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function searchItems(data: GameData, query: string, limit = 60): GameItem[] {
  const q = fold(query.trim());
  const all = Object.values(data.items);
  if (!q) return [];
  const scored: Array<[number, GameItem]> = [];
  for (const it of all) {
    const name = fold(it.name);
    const at = name.indexOf(q);
    if (at < 0) continue;
    scored.push([at === 0 ? 0 : name.includes(` ${q}`) ? 1 : 2, it]);
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name))
    .slice(0, limit)
    .map(([, it]) => it);
}
