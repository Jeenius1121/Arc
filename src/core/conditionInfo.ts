import icons from './conditionIcons.json';

/**
 * What each condition does, keyed by its French name. "major" / "minor" is the
 * official classification; effects are summarised from French guides
 * (Millenium, GAMEWAVE, Dexerto) and community wikis.
 */
export interface ConditionInfo {
  slug: string;
  kind: 'major' | 'minor';
  effects: string[];
}

const INFO: Record<string, ConditionInfo> = {
  'Raid nocturne': {
    slug: 'night-raid',
    kind: 'major',
    effects: ['Carte plongée dans l’obscurité', 'ARC plus agressifs', 'Butin de plus grande valeur', 'Trappes de raider désactivées'],
  },
  'Tempête électromagnétique': {
    slug: 'electromagnetic-storm',
    kind: 'major',
    effects: ['La foudre frappe et étourdit raiders et ARC', 'Moins de points d’extraction actifs', 'Trappes de raider désactivées', 'Butin de plus grande valeur'],
  },
  'Vague de froid': {
    slug: 'cold-snap',
    kind: 'major',
    effects: ['Le froid fait perdre de la vie à découvert : restez à l’abri', 'Les empreintes dans la neige trahissent les autres raiders', 'Lacs gelés et tas de neige'],
  },
  'Portail verrouillé': {
    slug: 'locked-gate',
    kind: 'major',
    effects: ['Trouvez les codes de sécurité / cartes-clés dispersés', 'Ouvrez le portail pour accéder à une zone de butin'],
  },
  'Bunker caché': {
    slug: 'hidden-bunker',
    kind: 'major',
    effects: ['Port spatial', 'Activez les 4 points d’accès disséminés sur la carte', 'Événement collaboratif : mieux vaut s’entendre avec la session'],
  },
  Ouragan: {
    slug: 'hurricane',
    kind: 'major',
    effects: ['Vents violents sur toute la carte', 'Visibilité et déplacements perturbés'],
  },
  'Examen minutieux': {
    slug: 'close-scrutiny',
    kind: 'major',
    effects: ['Condition majeure : surveillance ARC renforcée'],
  },
  'Frégate ARC': {
    slug: 'arc-frigate',
    kind: 'major',
    effects: ['Un vaisseau de patrouille ARC survole la carte', 'Trappes de raider indisponibles, portes verrouillées inactives', 'Butin normal de moindre valeur : visez la cargaison de la Frégate'],
  },
  Matriarche: {
    slug: 'matriarch',
    kind: 'minor',
    effects: ['Boss ARC itinérant, le plus redoutable du jeu', 'Composants d’artisanat légendaires à la clé', 'Idéal en coopération avec d’autres groupes'],
  },
  Récolteur: {
    slug: 'harvester',
    kind: 'minor',
    effects: ['La Reine garde le Récolteur', 'Détruisez la Reine pour piller le Récolteur'],
  },
  "Cimetière d'épaves": {
    slug: 'husk-graveyard',
    kind: 'minor',
    effects: ['Plus d’épaves d’ARC à fouiller', 'Certaines épaves électrifiées donnent un meilleur butin'],
  },
  'Floraisons luxuriantes': {
    slug: 'lush-blooms',
    kind: 'minor',
    effects: ['Plantes et ressources à récolter en abondance'],
  },
  'Caches de raider': {
    slug: 'uncovered-caches',
    kind: 'minor',
    effects: ['Des caches de raiders sont exposées et peuvent être fouillées'],
  },
  'Sondes de prospection': {
    slug: 'prospecting-probes',
    kind: 'minor',
    effects: ['Des sondes de prospection tombent sur la carte, à fouiller'],
  },
  'Butin de la tour de lancement': {
    slug: 'launch-tower-loot',
    kind: 'minor',
    effects: ['Port spatial', 'Trouvez une batterie et branchez-la sur un générateur', 'Accès au sommet de la tour de lancement et à son butin'],
  },
  'Cité des Oiseaux': {
    slug: 'bird-city',
    kind: 'minor',
    effects: ['Ville enfouie', 'Nids à fouiller dans les cheminées', 'Plus de bibelots, d’oiseaux et de tyroliennes', 'Canards en plastique exclusifs'],
  },
  'Fouille de plage': {
    slug: 'beachcombing',
    kind: 'minor',
    effects: ['Riven Tides', 'Objets de valeur enterrés sur les plages', 'Détecteurs du maître de port à récupérer'],
  },
  Redirection: {
    slug: 'redirection',
    kind: 'minor',
    effects: ['Col de Pendola', 'Détournez les cargaisons du Récolteur vers vous avec l’émetteur', 'L’émetteur attire ARC et raiders', 'Seule source du plan du conduit de la Porte de l’Empereur'],
  },
};

export function conditionInfo(condition: string): ConditionInfo | undefined {
  return INFO[condition];
}

/** Official SVG icon markup for a condition, if known. */
export function conditionIcon(condition: string): string | undefined {
  const slug = INFO[condition]?.slug;
  return slug ? (icons as Record<string, string>)[slug] : undefined;
}
