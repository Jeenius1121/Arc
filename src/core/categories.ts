/**
 * Broad categories inferred from condition names, so the user can ask for
 * "every loot event" without knowing every condition name. Keywords cover
 * both English (official site) and French spellings.
 */
export interface Category {
  id: string;
  label: string;
  pattern: RegExp;
}

export const CATEGORIES: Category[] = [
  { id: 'night', label: 'Nuit', pattern: /night|nuit|nocturne/i },
  {
    id: 'weather',
    label: 'Orage / météo',
    pattern: /storm|tempête|tempete|orage|hurricane|ouragan|cold snap|froid|rain|pluie|blizzard|fog|brouillard/i,
  },
  {
    id: 'loot',
    label: 'Butin bonus',
    pattern: /loot|butin|cache|x2|×2|double|bunker|bloom|floraison|probe|sonde|supply|ravitaillement/i,
  },
  {
    id: 'boss',
    label: 'ARC majeur',
    pattern: /harvester|matriarch|queen|reine|moissonneu|boss/i,
  },
];

export function categoriesOf(condition: string): string[] {
  return CATEGORIES.filter((c) => c.pattern.test(condition)).map((c) => c.id);
}
