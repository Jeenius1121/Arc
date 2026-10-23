/** One raid logged by the player at the end of it. */
export interface RaidEntry {
  id: string;
  at: number;
  map: string;
  /** Map condition active during the raid, if any. */
  condition?: string;
  outcome: 'extract' | 'death';
  /** Value brought back (credits), when extracted. */
  value?: number;
}

export interface RaidStats {
  key: string;
  raids: number;
  extracts: number;
  rate: number;
  /** Average value per extracted raid. */
  avgValue: number;
  /** Average value per raid, deaths counted as 0: the real yield. */
  yieldPerRaid: number;
}

function stats(key: string, list: RaidEntry[]): RaidStats {
  const extracts = list.filter((r) => r.outcome === 'extract');
  const total = extracts.reduce((s, r) => s + (r.value ?? 0), 0);
  return {
    key,
    raids: list.length,
    extracts: extracts.length,
    rate: list.length ? extracts.length / list.length : 0,
    avgValue: extracts.length ? Math.round(total / extracts.length) : 0,
    yieldPerRaid: list.length ? Math.round(total / list.length) : 0,
  };
}

export function overall(entries: RaidEntry[]): RaidStats {
  return stats('Tous les raids', entries);
}

/** Stats grouped by map, by condition or by both, best yield first. */
export function statsBy(entries: RaidEntry[], by: 'map' | 'condition' | 'both'): RaidStats[] {
  const groups = new Map<string, RaidEntry[]>();
  for (const r of entries) {
    const key = by === 'map' ? r.map : by === 'condition' ? (r.condition ?? 'Sans événement') : `${r.condition ?? 'Sans événement'} · ${r.map}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups].map(([k, list]) => stats(k, list)).sort((a, b) => b.yieldPerRaid - a.yieldPerRaid || b.raids - a.raids);
}
