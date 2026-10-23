/**
 * French names as shown in the game's French localisation. Sources disagree
 * on some names; entries marked "unconfirmed" keep the closest name found and
 * should be checked in-game. Unknown names fall back to the English one.
 */

const MAPS: Array<[RegExp, string]> = [
  [/dam|barrage/i, 'Champ de bataille du barrage'],
  [/buried|enfouie/i, 'Ville enfouie'],
  [/space.?port|port spatial/i, 'Port spatial'],
  [/blue.?gate|portail bleu/i, 'Portail bleu'],
  [/stella|montis/i, 'Stella Montis'],
  [/pendola/i, 'Col de Pendola'],
  [/riven/i, 'Riven Tides'], // unconfirmed: French articles keep the English name
];

const CONDITIONS: Record<string, string> = {
  'night raid': 'Raid nocturne',
  'electromagnetic storm': 'Tempête électromagnétique',
  'cold snap': 'Vague de froid',
  'locked gate': 'Portail verrouillé',
  matriarch: 'Matriarche',
  harvester: 'Récolteur',
  'hidden bunker': 'Bunker caché',
  'husk graveyard': "Cimetière d'épaves",
  'lush blooms': 'Saison des récoltes',
  'uncovered caches': 'Caches de raider',
  'prospecting probes': 'Sondes de prospection',
  'launch tower loot': 'Butin de la tour de lancement',
  'bird city': 'La Ville aux oiseaux',
  hurricane: 'Ouragan',
  redirection: 'Redirection',
  'arc frigate': 'Frégate ARC', // unconfirmed
  // 'Beachcombing' and 'Close Scrutiny': no French name found yet.
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
