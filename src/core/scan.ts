import { fold, type GameData, type GameItem } from './gamedata.ts';

/**
 * Finds which items appear in text read from a photo of the game screen.
 * Every item name found in the text scores by its length (longer names are
 * more specific); partial matches on most words of a name score less.
 */
export function matchScannedText(data: GameData, lines: string[], limit = 5): GameItem[] {
  const text = ` ${fold(lines.join(' ')).replace(/[^a-z0-9]+/g, ' ')} `;
  const words = new Set(text.split(' ').filter((w) => w.length > 2));
  const scored: Array<[number, GameItem]> = [];
  for (const item of Object.values(data.items)) {
    const name = fold(item.name).replace(/[^a-z0-9]+/g, ' ').trim();
    if (name.length < 3) continue;
    if (text.includes(` ${name} `)) {
      scored.push([100 + name.length, item]);
      continue;
    }
    const parts = name.split(' ').filter((w) => w.length > 2);
    if (parts.length < 2) continue;
    const hits = parts.filter((w) => words.has(w)).length;
    if (hits / parts.length >= 0.66) scored.push([hits * 10, item]);
  }
  return scored
    .sort((a, b) => b[0] - a[0])
    .slice(0, limit)
    .map(([, it]) => it);
}
