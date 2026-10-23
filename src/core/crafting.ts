import type { GameData, GameItem } from './gamedata.ts';

/**
 * Raw materials behind `qty` crafts of an item: recipes are expanded down to
 * components that cannot be crafted themselves.
 */
export function baseMaterials(data: GameData, id: string, qty = 1, seen: Set<string> = new Set()): Record<string, number> {
  const item = data.items[id];
  if (!item?.recipe || seen.has(id)) return { [id]: qty };
  const out: Record<string, number> = {};
  const crafts = qty / (item.craftQty ?? 1);
  for (const [cid, n] of Object.entries(item.recipe)) {
    for (const [bid, bn] of Object.entries(baseMaterials(data, cid, n * crafts, new Set([...seen, id])))) {
      out[bid] = (out[bid] ?? 0) + bn;
    }
  }
  return out;
}

/** True when at least one component of the recipe is itself craftable. */
export function hasSubRecipes(data: GameData, item: GameItem): boolean {
  return Object.keys(item.recipe ?? {}).some((cid) => !!data.items[cid]?.recipe);
}

/** Sell value of the components consumed to craft one unit. */
export function craftCost(data: GameData, item: GameItem): number {
  const total = Object.entries(item.recipe ?? {}).reduce((s, [cid, n]) => s + (data.items[cid]?.value ?? 0) * n, 0);
  return Math.round(total / (item.craftQty ?? 1));
}

/** Cheapest price in coins at a trader, if any sells it for coins. */
export function buyPrice(item: GameItem): number | undefined {
  const prices = (item.vendors ?? []).map((v) => v.cost.coins).filter((c): c is number => typeof c === 'number');
  return prices.length ? Math.min(...prices) : undefined;
}

/** How many times the recipe can be made with the given stock. */
export function craftableTimes(item: GameItem, stock: Record<string, number>): number {
  const recipe = Object.entries(item.recipe ?? {});
  if (recipe.length === 0) return 0;
  return Math.min(...recipe.map(([cid, n]) => Math.floor((stock[cid] ?? 0) / n)));
}
