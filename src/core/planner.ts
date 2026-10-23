import { conditionName, mapName } from './names.ts';
import type { GameData, GameItem } from './gamedata.ts';
import type { ShoppingLine } from './progress.ts';
import type { EventOccurrence } from './types.ts';

/**
 * Which map conditions make an item easier to get, from its loot zones and
 * type. Condition names are the French ones the schedule uses.
 */
const THEME_EVENTS: Array<{ test: (it: GameItem) => boolean; events: string[]; why: string }> = [
  { test: (it) => it.type === 'Nature' || !!it.foundIn?.includes('Nature'), events: ['Floraisons luxuriantes'], why: 'plus de plantes' },
  { test: (it) => !!it.foundIn?.includes('ARC'), events: ["Cimetière d'épaves"], why: 'plus d’épaves d’ARC' },
  { test: (it) => it.type === 'Bibelot', events: ['Cité des Oiseaux', 'À la recherche de petits trésors'], why: 'plus de bibelots' },
  { test: (it) => !!it.foundIn?.includes('Raider'), events: ['Caches de raider'], why: 'caches de raiders' },
  {
    test: (it) => it.rarity === 'Epic' || it.rarity === 'Legendary',
    events: ['Raid nocturne', 'Tempête électromagnétique'],
    why: 'butin de plus grande valeur',
  },
];

export interface SlotReason {
  itemId: string;
  missing: number;
  why: string;
}

export interface PlannedSlot {
  event: EventOccurrence;
  score: number;
  reasons: SlotReason[];
}

/**
 * Ranks upcoming events by how much they help with what the shopping list
 * still misses: an ARC that drops a needed item spawns more there during this
 * condition, or the condition boosts the item's loot zone or rarity.
 */
export function planSlots(data: GameData, missing: ShoppingLine[], events: EventOccurrence[], now: number, limit = 6): PlannedSlot[] {
  const wanted = missing.filter((l) => l.missing > 0);
  if (wanted.length === 0) return [];
  const slots: PlannedSlot[] = [];
  for (const event of events) {
    if (event.end <= now) continue;
    const reasons: SlotReason[] = [];
    for (const line of wanted) {
      const item = data.items[line.id];
      if (!item) continue;
      const why = reasonFor(data, item, event);
      if (why) reasons.push({ itemId: line.id, missing: line.missing, why });
    }
    if (reasons.length === 0) continue;
    const score = reasons.reduce((s, r) => s + Math.min(r.missing, 10), 0);
    slots.push({ event, score, reasons });
  }
  return slots.sort((a, b) => b.score - a.score || a.event.start - b.event.start).slice(0, limit);
}

function reasonFor(data: GameData, item: GameItem, event: EventOccurrence): string | null {
  for (const bot of data.bots) {
    if (!bot.drops.includes(item.id)) continue;
    const boosted = bot.moreDuring.some((m) => mapName(m.map) === event.map && m.events.some((e) => conditionName(e) === event.condition));
    if (boosted) return `plus de ${bot.name} (le lâche)`;
  }
  for (const rule of THEME_EVENTS) if (rule.events.includes(event.condition) && rule.test(item)) return rule.why;
  return null;
}
