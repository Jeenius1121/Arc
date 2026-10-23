/**
 * French texts for the ARC bestiary. The community data only has English
 * descriptions; these are translations of them (empty where the source has
 * none yet).
 */
export const THREAT_FR: Record<string, string> = {
  Low: 'Faible',
  Moderate: 'Modérée',
  High: 'Élevée',
  Critical: 'Critique',
  Extreme: 'Extrême',
};

export const THREAT_COLOR: Record<string, string> = {
  Low: '#4ade80',
  Moderate: '#f2c14e',
  High: '#fb923c',
  Critical: '#f87171',
  Extreme: '#c084fc',
};

const TYPE_FR: Record<string, string> = {
  'Heavy Assault': 'Assaut lourd',
  'Heavy Artillery': 'Artillerie lourde',
  'Area Denial': 'Contrôle de zone',
  'Medium Drone': 'Drone moyen',
  'Siege Engine': 'Engin de siège',
  Boss: 'Boss',
  Explosive: 'Explosif',
  'Flying Artillery': 'Artillerie volante',
  'Sniper Turret': 'Tourelle de précision',
  'Scout Drone': 'Drone éclaireur',
  Reconnaissance: 'Reconnaissance',
  'Ambush Predator': 'Prédateur embusqué',
  'Defense System': 'Système de défense',
  'Flying Drone': 'Drone volant',
};

const TEXT_FR: Record<string, { desc: string; weakness: string }> = {
  arc_bastion: {
    desc: 'Machine massive en forme de crabe, lente mais dévastatrice. Elle déchire les boucliers et inflige d’énormes dégâts avec ses attaques lourdes.',
    weakness: 'Détruisez la cartouche à l’arrière pour exposer son point faible.',
  },
  arc_bombardier: {
    desc: 'Énorme unité d’artillerie conçue pour bombarder à longue distance. Lourdement blindée, elle fait pleuvoir les explosions de très loin.',
    weakness: 'Tirer sur la cartouche jaune à l’arrière inflige des dégâts directs à son noyau.',
  },
  arc_fireball: {
    desc: 'Petit ARC blindé qui roule et crache des flammes. Il ouvre son panneau avant près des Raiders pour les brûler, exposant son noyau fragile.',
    weakness: 'Son noyau est exposé quand il utilise son lance-flammes.',
  },
  arc_hornet: {
    desc: 'Drone de classe moyenne aux rotors blindés. Il tire des projectiles rapides et précis, annoncés par un bref laser rouge. Conçu pour déchirer boucliers et armures légères.',
    weakness: 'Propulseurs arrière non blindés.',
  },
  arc_leaper: {
    desc: 'Engin de siège massif en forme d’araignée, lourdement blindé, capable de bonds défiant la gravité pour franchir des gouffres et atteindre les points élevés.',
    weakness: 'Le feu est le plus efficace. Vous pouvez aussi viser son œil.',
  },
  arc_matriarch: {
    desc: 'Machine ARC imposante à côté de laquelle la Reine paraît sympathique. Elle n’apparaît que pendant une condition de carte précise.',
    weakness: 'Noyau lumineux central, exposé quand elle attaque. Les articulations des pattes et les zones rouges de la couronne sont aussi vulnérables.',
  },
  arc_pop: {
    desc: 'Petit ARC explosif qui détone quand on s’approche. Éliminez-le vite pour éviter les dégâts de zone.',
    weakness: 'Il suffit de lui tirer dessus.',
  },
  arc_rocketeer: {
    desc: 'Redoutable ARC volant qui domine les airs avec de puissantes roquettes et des dégâts de zone dévastateurs.',
    weakness: 'Détruisez ses deux propulseurs ou tirez sur son noyau, situé en dessous.',
  },
  arc_sentinel: {
    desc: 'Tourelle immobile mais mortelle perchée en hauteur. Elle balaie la zone avec une précision de longue portée et verrouille les joueurs de loin.',
    weakness: 'La cartouche jaune non blindée est votre cible principale.',
  },
  arc_shredder: {
    desc: 'La Déchiqueteuse apparaît à Stella Montis et oblige les Raiders à rester vigilants dans les combats rapprochés.',
    weakness: 'Son point faible principal est la barre « œil » sur sa tête. Le noyau orange visible entre ses plaques d’armure peut aussi être visé.',
  },
  arc_snitch: {
    desc: 'Drone éclaireur rapide et non blindé à trois rotors. Fragile, il sert d’alarme aérienne et appelle des renforts quand il repère des Raiders.',
    weakness: 'Propulseurs ou plaque du dessous.',
  },
  arc_spotter: {
    desc: 'Drones de soutien du Bombardier : ils pointent un laser sur tout Raider en vue pour guider ses tirs. Une paire détruite est remplacée ; ils s’enfuient quand le Bombardier tombe.',
    weakness: 'Propulseurs non blindés.',
  },
  arc_surveyor: {
    desc: 'Le plus grand des ARC roulants. Il s’arrête régulièrement pour émettre des signaux, attaque rarement et fuit souvent les Raiders. Il se brise en morceaux sous les dégâts.',
    weakness: 'Expose son noyau d’énergie quand il projette son rayon bleu vers le ciel.',
  },
  arc_the_queen: {
    desc: 'Machine colossale déployée pendant les événements Récolteur. Le Goliath des forces ARC, extrêmement résistant et lourdement armé. Demande une escouade coordonnée.',
    weakness: 'Les articulations jaunes de ses pattes. Elle expose son noyau quand elle tire son laser.',
  },
  arc_tick: {
    desc: 'Petits robots araignées qui bondissent sur les joueurs et s’accrochent à leur tête. Rapides et déroutants, ils punissent les Raiders imprudents.',
    weakness: 'Il suffit de lui tirer dessus. Un coup de mêlée le détruit aussi.',
  },
  arc_turret: {
    desc: 'Petite tourelle non blindée de défense rapprochée, fixée aux murs intérieurs. Elle tire en rafale dès qu’elle détecte un mouvement.',
    weakness: 'Non blindée : il suffit de lui tirer dessus.',
  },
  arc_wasp: {
    desc: 'Drones volants armés de puissantes mitrailleuses, qui opèrent en essaims. Rapides, agiles et implacables ; leur bourdonnement est le premier avertissement.',
    weakness: 'Propulseurs non blindés.',
  },
};

export function botTexts(id: string, type: string, threat: string) {
  const t = TEXT_FR[id];
  return {
    type: TYPE_FR[type] ?? (type && type !== 'None' ? type : ''),
    threat: THREAT_FR[threat] ?? '',
    desc: t?.desc ?? '',
    weakness: t?.weakness ?? '',
  };
}
