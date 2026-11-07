// Chargement de la base + index + libellés français
export const CAT_FR = {
  Mechanical: 'Mécanique', Industrial: 'Industriel', Electrical: 'Électrique', Medical: 'Médical',
  Technological: 'Technologique', Security: 'Sécurité', Residential: 'Résidentiel', Commercial: 'Commercial',
  Exodus: 'Exode', 'Old World': 'Ancien Monde', Nature: 'Nature', ARC: 'ARC', Raider: 'Raider',
};
export const CATS = Object.keys(CAT_FR);
export const RARITY_FR = { Common: 'Commun', Uncommon: 'Peu commun', Rare: 'Rare', Epic: 'Épique', Legendary: 'Légendaire' };
export const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
export const TYPE_FR = {
  Recyclable: 'Recyclable', Blueprint: 'Schéma', Trinket: 'Babiole', 'Quick Use': 'Utilisation rapide', Key: 'Clé',
  Modification: "Accessoire d'arme", 'Topside Material': 'Matériau de surface', 'Assault Rifle': "Fusil d'assaut",
  Augment: 'Augmentation', SMG: 'Pistolet-mitrailleur', Pistol: 'Pistolet', Nature: 'Nature', 'Refined Material': 'Matériau raffiné',
  Special: 'Spécial', Shotgun: 'Fusil à pompe', 'Battle Rifle': 'Fusil de combat', Ammunition: 'Munitions',
  'Sniper Rifle': 'Fusil de précision', LMG: 'Mitrailleuse légère', 'Basic Material': 'Matériau de base',
  'Hand Cannon': 'Canon de poing', Shield: 'Bouclier', Misc: 'Divers',
};
export const KIND_FR = {
  weapon: 'Armes', blueprint: 'Schémas', material: 'Matériaux', arc: 'Pièces ARC', nature: 'Nature', recyclable: 'Recyclables',
  trinket: 'Babioles', key: 'Clés', ammo: 'Munitions', mod: 'Accessoires', augment: 'Augmentations', shield: 'Boucliers',
  consumable: 'Gadgets & soins',
};
// Où fouiller selon le type de butin (affiché dans les étapes)
export const CONTAINERS = {
  Mechanical: 'caisses à outils, établis, coffres et capots de véhicules',
  Industrial: 'casiers rouges, caisses de raiders rouillées, conteneurs d’expédition',
  Electrical: 'armoires électriques et murales, armoires serveurs, ordinateurs',
  Medical: 'tiroirs blancs, sacs et armoires médicales',
  Technological: 'ordinateurs, androïdes, armoires techniques et serveurs',
  Security: 'casiers de sécurité, coffres à augmentations, salles à clé',
  Residential: 'poubelles, armoires, commodes, tiroirs de cuisine, bureaux',
  Commercial: 'présentoirs, étagères, comptoirs, valises',
  Exodus: 'caisses et conteneurs Exode (fret spatial)',
  'Old World': 'meubles anciens, coffres et vitrines d’époque',
  Nature: 'plantes et fruits à cueillir, paniers en osier',
  ARC: 'carcasses et épaves d’ARC à démonter',
  Raider: 'caches de raiders, sacs à dos, caisses d’armes et de munitions',
};
export const CONT_FR = {
  arpenteur: 'ARC Arpenteur (Surveyor)', cache_raider: 'Caches de raiders', breach: 'Conteneurs à forcer', caisse_arme: "Caisses d'armes",
  caisse_munitions: 'Caisses de munitions / grenades', sac_medical: 'Sacs médicaux', casier_rouge: 'Casiers rouges', casier: 'Casiers',
  valise: 'Valises', sac: 'Sacs à dos', poubelle: 'Poubelles', electronique: 'Ordinateurs / serveurs', boite_noire: 'Boîtes noires',
  vehicule: 'Véhicules', tiroir: 'Tiroirs', armoire: 'Armoires / placards', bureau: 'Bureaux', caisse: 'Caisses', autre: 'Autres conteneurs',
};
export const CURRENCY = { coins: 'Pièces', creds: 'Crédits' };
export const TRADERS = {
  'Tian Wen': 'Armurière — armes et accessoires', Celeste: 'Projets communautaires — matériaux', Lance: 'Médecin — soins',
  Shani: 'Sécurité — gadgets', Apollo: 'Explosifs et utilitaires',
};

export const D = {
  db: null, I: {}, M: {}, B: {}, E: {}, Q: {}, S: {},
  usedIn: {}, recycleFrom: {}, salvageFrom: {}, dropBy: {}, questReward: {}, questGrant: {}, questNeed: {},
  projectReward: {}, projectNeed: {}, stationNeed: {}, upgradeFrom: {}, families: [], search: [], bpBase: null,
};

const push = (o, k, v) => { (o[k] || (o[k] = [])).push(v); };
export const plain = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export async function loadDB(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('db ' + res.status);
  const db = await res.json();
  index(db);
  return db;
}

function index(db) {
  D.db = db;
  for (const it of db.items) D.I[it.id] = it;
  for (const m of db.maps) D.M[m.id] = m;
  for (const b of db.bots) D.B[b.id] = b;
  for (const e of db.events) D.E[e.id] = e;
  for (const q of db.quests) D.Q[q.id] = q;
  for (const s of db.stations) D.S[s.id] = s;

  for (const it of db.items) {
    for (const [k, q] of Object.entries(it.rc || {})) push(D.usedIn, k, { id: it.id, q, via: 'craft' });
    for (const [k, q] of Object.entries(it.up || {})) push(D.usedIn, k, { id: it.id, q, via: 'upgrade' });
    for (const [k, q] of Object.entries(it.ry || {})) push(D.recycleFrom, k, { id: it.id, q });
    for (const [k, q] of Object.entries(it.sv || {})) push(D.salvageFrom, k, { id: it.id, q });
    if (it.ut) D.upgradeFrom[it.ut] = it.id;
  }
  for (const b of db.bots) for (const d of b.drops) push(D.dropBy, d, b.id);
  for (const q of db.quests) {
    for (const [k, n] of q.rew) push(D.questReward, k, { q: q.id, n });
    for (const [k, n] of q.grant) push(D.questGrant, k, { q: q.id, n });
    for (const [k, n] of q.req) push(D.questNeed, k, { q: q.id, n });
  }
  for (const p of db.projects) for (const ph of p.phases) for (const r of ph.req) {
    push(D.projectNeed, r.id, { p: p.id, ph: ph.p, phn: ph.n, n: r.q });
    for (const [k, n] of r.rew) push(D.projectReward, k, { p: p.id, ph: ph.p, phn: ph.n, give: r.id, giveN: r.q, n });
  }
  for (const s of db.stations) for (const l of s.levels) for (const [k, n] of l.req) push(D.stationNeed, k, { s: s.id, lv: l.lv, n });

  // familles d'armes (I → IV)
  for (const it of db.items) {
    if (!it.wpn || D.upgradeFrom[it.id]) continue;
    const tiers = [it.id];
    let cur = it;
    while (cur.ut && D.I[cur.ut]) { tiers.push(cur.ut); cur = D.I[cur.ut]; }
    D.families.push({ id: it.id, base: it.n.replace(/\s+I$/, ''), t: it.t, r: it.r, tiers });
  }
  D.families.sort((a, b) => a.t.localeCompare(b.t) || a.base.localeCompare(b.base));

  // base de comparaison des signalements de schémas
  const maps = {}, cond = {};
  let total = 0;
  for (const r of Object.values(db.bpr)) {
    total += r.n;
    for (const [m, c] of Object.entries(r.maps)) maps[m] = (maps[m] || 0) + c;
    for (const [k, c] of Object.entries(r.cond)) cond[k] = (cond[k] || 0) + c;
  }
  D.bpBase = { total, maps, cond };

  D.search = db.items.map((it) => ({ id: it.id, k: plain(it.n + ' ' + it.en + ' ' + (TYPE_FR[it.t] || '') + ' ' + (it.t || '')) }));
}

export const item = (id) => D.I[id];
export const name = (id) => D.I[id]?.n || CURRENCY[id] || id.replace(/_/g, ' ');

export function kind(it) {
  if (!it) return 'material';
  if (it.t === 'Blueprint') return 'blueprint';
  if (it.wpn) return 'weapon';
  if (it.t === 'Key') return 'key';
  if (it.t === 'Ammunition') return 'ammo';
  if (it.t === 'Modification') return 'mod';
  if (it.t === 'Augment') return 'augment';
  if (it.t === 'Shield') return 'shield';
  if (it.t === 'Nature') return 'nature';
  if (it.t === 'Trinket') return 'trinket';
  const arcish = D.dropBy[it.id] || (it.f || []).includes('ARC');
  if (['Basic Material', 'Refined Material', 'Topside Material'].includes(it.t)) return arcish ? 'arc' : 'material';
  if (it.t === 'Recyclable') return arcish ? 'arc' : 'recyclable';
  return 'consumable';
}

export function iconFor(it) {
  const k = kind(it);
  if (['material', 'recyclable', 'trinket'].includes(k) && it.f && it.f.length) return it.f[0];
  return k;
}

export function search(q, limit = 40) {
  const p = plain(q);
  if (!p) return [];
  const words = p.split(' ');
  const out = [];
  for (const s of D.search) {
    if (!words.every((w) => s.k.includes(w))) continue;
    const it = D.I[s.id];
    const n = plain(it.n);
    let score = 0;
    if (n === p) score += 100;
    if (n.startsWith(p)) score += 40;
    if (plain(it.en).startsWith(p)) score += 25;
    score += { weapon: 8, blueprint: 6, material: 7, arc: 5 }[kind(it)] || 0;
    if (/ (ii|iii|iv)$/.test(n)) score -= 6;
    out.push({ it, score: score - n.length * 0.05 });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.it);
}

// carte associée à une clé (préfixe de l'identifiant)
export function keyMap(id) {
  const pre = [['dam_', 'dam'], ['buried_city_', 'buried_city'], ['spaceport_', 'spaceport'], ['blue_gate_', 'blue_gate'], ['stella_montis_', 'stella_montis'], ['riven_', 'riven_tides'], ['pendola_', 'pendola_pass']];
  const f = pre.find(([p]) => id.startsWith(p));
  return f ? f[1] : null;
}
