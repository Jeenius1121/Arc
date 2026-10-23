/**
 * Broad categories inferred from condition names (French names, with the
 * English ones as fallback), so the user can ask for "every loot event"
 * without knowing every condition name.
 */
export interface Category {
  id: string;
  label: string;
  pattern: RegExp;
}

export const CATEGORIES: Category[] = [
  { id: 'night', label: 'Nuit', pattern: /nocturne|nuit|night/i },
  {
    id: 'weather',
    label: 'Orage / météo',
    pattern: /tempête|ouragan|vague de|pluie|vent|derecho|marécage|storm|hurricane|cold snap|rain|wind|heat wave|swamp/i,
  },
  {
    id: 'loot',
    label: 'Butin bonus',
    pattern: /butin|caches|bunker|floraisons|épaves|oiseaux|sondes|fouille|trésors|livraison|redirection|loot|bloom|graveyard|bird city|probe|combing|trinkets|delivery/i,
  },
  {
    id: 'boss',
    label: 'ARC majeur',
    pattern: /matriarche|récolteur|frégate|reines|matriarch|harvester|frigate|queens/i,
  },
];

export function categoriesOf(condition: string): string[] {
  return CATEGORIES.filter((c) => c.pattern.test(condition)).map((c) => c.id);
}
