/**
 * French names as shown in the game's French localisation, taken from
 * arctracker.io/fr/map-events. Unknown names fall back to the English one.
 */

const MAPS: Array<[RegExp, string]> = [
  [/dam|barrage/i, 'Champ de bataille du Barrage'],
  [/buried|enfouie/i, 'Ville enfouie'],
  [/space.?port|port spatial/i, 'Port spatial'],
  [/blue.?gate|portail bleu/i, 'Portail bleu'],
  [/stella|montis/i, 'Stella Montis'],
  [/pendola/i, 'Col de Pendola'],
  [/riven/i, 'Riven Tides'],
];

const CONDITIONS: Record<string, string> = {
  'night raid': 'Raid nocturne',
  'electromagnetic storm': 'Tempête électromagnétique',
  'cold snap': 'Vague de froid',
  'locked gate': 'Portail verrouillé',
  matriarch: 'Matriarche',
  harvester: 'Récolteur',
  'lush blooms': 'Floraisons luxuriantes',
  'prospecting probes': 'Sondes de prospection',
  'husk graveyard': "Cimetière d'épaves",
  'uncovered caches': 'Caches de raider',
  'launch tower loot': 'Butin de la tour de lancement',
  'hidden bunker': 'Bunker caché',
  'bird city': 'Cité des Oiseaux',
  beachcombing: 'Fouille de plage',
  hurricane: 'Ouragan',
  'close scrutiny': 'Examen minutieux',
  'arc frigate': 'Frégate ARC',
  'acid rain': 'Pluie acide',
  'delayed departure': 'Départ retardé',
  derecho: 'Derecho',
  'heat wave': 'Vague de chaleur',
  'high winds': 'Grand vent',
  sandcombing: 'Chasse aux trésors dans le sable',
  'show of force': 'Démonstration de force',
  'sifting for trinkets': 'À la recherche de petits trésors',
  'some assembly required': 'Réparations requises',
  'the queens': 'Les Reines',
  'toxic swamp': 'Marécage toxique',
  'toxic swamp - clean air': "Marécage toxique - Purification d'air",
  'toxic swamp - rock collector': 'Marécage toxique - Collection de pierres',
  'tube disruptions': 'Perturbations des tubes',
  windswept: 'Battu par le vent',
  redirection: 'Redirection',
  'lost in transit': 'Perdu en transit',
  'special delivery': 'Livraison spéciale',
};

export function mapName(raw: string): string {
  const s = raw.trim();
  for (const [re, fr] of MAPS) if (re.test(s)) return fr;
  return s;
}

export function conditionName(raw: string): string {
  const s = raw.trim();
  return CONDITIONS[s.toLowerCase()] ?? s;
}
