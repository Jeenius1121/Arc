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
    pattern: /tempête|orage|ouragan|vague de froid|storm|hurricane|cold snap/i,
  },
  {
    id: 'loot',
    label: 'Butin bonus',
    pattern: /butin|caches?|bunker|récoltes|épaves|oiseaux|sondes|redirection|loot|bloom|graveyard|bird city|probe|beachcombing/i,
  },
  {
    id: 'boss',
    label: 'ARC majeur',
    pattern: /matriarche|récolteur|frégate|matriarch|harvester|frigate/i,
  },
];

export function categoriesOf(condition: string): string[] {
  return CATEGORIES.filter((c) => c.pattern.test(condition)).map((c) => c.id);
}
