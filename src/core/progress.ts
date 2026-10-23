import type { GameData, GameItem, Need } from './gamedata.ts';

/** What the player is working towards and what they already hold for it. */
export interface Progress {
  /** Followed goals; a bench or project goal always means its next level/phase. */
  goals: Goal[];
  doneQuests: string[];
  benchLevels: Record<string, number>;
  projectPhases: Record<string, number>;
  /** Items set aside for the goals (counted by the player). */
  owned: Record<string, number>;
}

export type Goal = { kind: 'quest' | 'bench' | 'project'; id: string };

export const EMPTY_PROGRESS: Progress = { goals: [], doneQuests: [], benchLevels: {}, projectPhases: {}, owned: {} };

export function migrateProgress(stored: unknown): Progress {
  return { ...EMPTY_PROGRESS, ...((stored ?? {}) as Partial<Progress>) };
}

export function sameGoal(a: Goal, b: Goal): boolean {
  return a.kind === b.kind && a.id === b.id;
}

export function hasGoal(p: Progress, g: Goal): boolean {
  return p.goals.some((x) => sameGoal(x, g));
}

export function toggleGoal(p: Progress, g: Goal): Progress {
  return { ...p, goals: hasGoal(p, g) ? p.goals.filter((x) => !sameGoal(x, g)) : [...p.goals, g] };
}

export interface GoalStep {
  goal: Goal;
  title: string;
  subtitle: string;
  req: Need[];
  /** False when a bench is maxed or a project finished. */
  available: boolean;
}

/** The concrete step a goal currently points at (next bench level, next project phase, the quest). */
export function goalStep(data: GameData, p: Progress, g: Goal): GoalStep {
  if (g.kind === 'quest') {
    const q = data.quests.find((x) => x.id === g.id);
    return {
      goal: g,
      title: q?.name ?? g.id,
      subtitle: q ? `Quête · ${q.trader}` : 'Quête',
      req: q?.req ?? [],
      available: !!q && !p.doneQuests.includes(g.id),
    };
  }
  if (g.kind === 'bench') {
    const b = data.benches.find((x) => x.id === g.id);
    const next = (p.benchLevels[g.id] ?? 0) + 1;
    const level = b?.levels.find((l) => l.level === next);
    return {
      goal: g,
      title: b ? `${b.name} niveau ${next}` : g.id,
      subtitle: level?.other.length ? `Atelier · ${level.other.join(' · ')}` : 'Atelier',
      req: level?.req ?? [],
      available: !!level,
    };
  }
  const pr = data.projects.find((x) => x.id === g.id);
  const next = (p.projectPhases[g.id] ?? 0) + 1;
  const phase = pr?.phases.find((ph) => ph.phase === next);
  return {
    goal: g,
    title: pr ? `${pr.name} · phase ${next}` : g.id,
    subtitle: phase ? `Projet · ${phase.name}` : 'Projet terminé',
    req: phase?.req ?? [],
    available: !!phase,
  };
}

/** Marks the current step of a goal as done: quest completed, bench level or project phase reached. */
export function completeGoal(data: GameData, p: Progress, g: Goal): Progress {
  const step = goalStep(data, p, g);
  // Items handed in leave the stash.
  const owned = { ...p.owned };
  for (const r of step.req) owned[r.id] = Math.max(0, (owned[r.id] ?? 0) - r.n);
  if (g.kind === 'quest') {
    const q = data.quests.find((x) => x.id === g.id);
    const followUps = (q?.next ?? []).map((id) => ({ kind: 'quest' as const, id })).filter((n) => !hasGoal(p, n));
    return {
      ...p,
      owned,
      doneQuests: [...new Set([...p.doneQuests, g.id])],
      goals: [...p.goals.filter((x) => !sameGoal(x, g)), ...followUps],
    };
  }
  if (g.kind === 'bench') return { ...p, owned, benchLevels: { ...p.benchLevels, [g.id]: (p.benchLevels[g.id] ?? 0) + 1 } };
  return { ...p, owned, projectPhases: { ...p.projectPhases, [g.id]: (p.projectPhases[g.id] ?? 0) + 1 } };
}

export interface ShoppingLine {
  id: string;
  needed: number;
  owned: number;
  missing: number;
  /** Which goals ask for it, e.g. "Établi niveau 2 ×5". */
  for: string[];
}

/** Every item the followed goals still require, most missing first. */
export function shoppingList(data: GameData, p: Progress): ShoppingLine[] {
  const lines = new Map<string, ShoppingLine>();
  for (const g of p.goals) {
    const step = goalStep(data, p, g);
    if (!step.available) continue;
    for (const r of step.req) {
      const line = lines.get(r.id) ?? { id: r.id, needed: 0, owned: p.owned[r.id] ?? 0, missing: 0, for: [] };
      line.needed += r.n;
      line.for.push(`${step.title} ×${r.n}`);
      lines.set(r.id, line);
    }
  }
  return [...lines.values()]
    .map((l) => ({ ...l, missing: Math.max(0, l.needed - l.owned) }))
    .sort((a, b) => b.missing - a.missing || (data.items[a.id]?.name ?? a.id).localeCompare(data.items[b.id]?.name ?? b.id));
}

export interface ItemUse {
  label: string;
  n: number;
  kind: 'quest' | 'bench' | 'project' | 'recipe' | 'trade';
  /** Quest, bench, project or crafted item id. */
  ref: string;
  /** Bench level or project phase. */
  step?: number;
}

/** Everywhere an item is consumed: quests, workshop levels, project phases, recipes, trades. */
export function usesOf(data: GameData, id: string): ItemUse[] {
  const uses: ItemUse[] = [];
  for (const q of data.quests)
    for (const r of q.req) if (r.id === id) uses.push({ kind: 'quest', ref: q.id, label: `Quête « ${q.name} » (${q.trader})`, n: r.n });
  for (const b of data.benches)
    for (const l of b.levels)
      for (const r of l.req) if (r.id === id) uses.push({ kind: 'bench', ref: b.id, step: l.level, label: `${b.name} niveau ${l.level}`, n: r.n });
  for (const pr of data.projects)
    for (const ph of pr.phases)
      for (const r of ph.req)
        if (r.id === id) uses.push({ kind: 'project', ref: pr.id, step: ph.phase, label: `${pr.name} · phase ${ph.phase}`, n: r.n });
  for (const it of Object.values(data.items))
    if (it.recipe?.[id]) uses.push({ kind: 'recipe', ref: it.id, label: `Fabrication : ${it.name}`, n: it.recipe[id] });
  for (const t of data.trades)
    if (t.cost.id === id)
      uses.push({ kind: 'trade', ref: t.item, label: `Échange chez ${t.trader} : ${data.items[t.item]?.name ?? t.item}`, n: t.cost.n });
  return uses;
}

/** Sell value of what an item recycles into. */
export function recycleValue(data: GameData, item: GameItem): number {
  return Object.entries(item.recycles ?? {}).reduce((sum, [id, n]) => sum + (data.items[id]?.value ?? 0) * n, 0);
}

export interface Verdict {
  action: 'keep' | 'later' | 'recycle' | 'sell';
  title: string;
  reason: string;
}

/**
 * Keep it if a followed goal still needs it; set it aside if something not yet
 * done uses it; otherwise recycle or sell, whichever is worth more.
 */
export function verdict(data: GameData, p: Progress, item: GameItem): Verdict {
  const line = shoppingList(data, p).find((l) => l.id === item.id);
  if (line && line.missing > 0) {
    return { action: 'keep', title: 'Garder', reason: `Il t’en faut encore ${line.missing} pour : ${line.for.join(', ')}.` };
  }
  const pending = usesOf(data, item.id).filter((u) => u.kind !== 'recipe' && u.kind !== 'trade' && !isUseDone(p, u));
  if (pending.length > 0) {
    return { action: 'later', title: 'Mettre de côté', reason: `Servira plus tard : ${pending.slice(0, 3).map((u) => `${u.label} ×${u.n}`).join(', ')}${pending.length > 3 ? '…' : ''}.` };
  }
  const recycled = recycleValue(data, item);
  const sold = item.value ?? 0;
  if (item.recycles && recycled > sold) {
    const parts = Object.entries(item.recycles)
      .map(([id, n]) => `${n} ${data.items[id]?.name ?? id}`)
      .join(', ');
    return { action: 'recycle', title: 'Recycler', reason: `Donne ${parts} (valeur ${recycled} contre ${sold} à la vente).` };
  }
  if (item.type.startsWith('Matériau') || Object.values(data.items).some((it) => it.recipe?.[item.id])) {
    return { action: 'later', title: 'Garder pour l’artisanat', reason: 'Sert à fabriquer d’autres objets.' };
  }
  return { action: 'sell', title: 'Vendre', reason: sold ? `Se revend ${sold} crédits.` : 'Aucune utilité connue.' };
}

function isUseDone(p: Progress, u: ItemUse): boolean {
  if (u.kind === 'quest') return p.doneQuests.includes(u.ref);
  if (u.kind === 'bench') return (p.benchLevels[u.ref] ?? 0) >= (u.step ?? 0);
  if (u.kind === 'project') return (p.projectPhases[u.ref] ?? 0) >= (u.step ?? 0);
  return false;
}

/** ARC that drop an item. */
export function droppedBy(data: GameData, id: string) {
  return data.bots.filter((b) => b.drops.includes(id));
}
