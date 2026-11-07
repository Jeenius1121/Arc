// Moteur de stratégie Tracker : où aller, quoi fouiller, combien de chances, quel plan de raids
import { D, kind, keyMap, RARITY_ORDER } from './data.js';

const TIER_W = { high: 3, medium: 2 };
const RANK_W = [1, 0.7, 0.5, 0.35, 0.25, 0.18];
const RARITY_BASE = { Common: 0.92, Uncommon: 0.72, Rare: 0.48, Epic: 0.27, Legendary: 0.12 };

export const tierLabel = (t) => (t === 'high' ? 'Valeur élevée' : t === 'medium' ? 'Valeur moyenne' : 'Zone standard');

const junkRank = (it) => (!it ? 9 : ['Recyclable', 'Trinket', 'Nature'].includes(it.t) ? 0 : ['Basic Material', 'Refined Material', 'Topside Material'].includes(it.t) ? 1 : it.wpn ? 3 : 2);

// ----------------------------------------------------------------- fouille par type de butin
export function poiScore(p, cats) {
  if (!p.tags || !p.tags.length) return 0;
  const match = p.tags.filter((t) => cats.includes(t));
  if (!match.length) return 0;
  const tw = TIER_W[p.tier] || 1;
  const spec = 1 / Math.sqrt(p.tags.length);
  return tw * (0.75 + 0.25 * match.length) * spec * (p.x == null ? 0.92 : 1);
}

export function rankMapsForCats(cats, opts = {}) {
  const out = [];
  for (const m of D.db.maps) {
    const pois = m.pois
      .map((p) => ({ p, s: poiScore(p, cats), match: (p.tags || []).filter((t) => cats.includes(t)) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    let raw = pois.reduce((acc, x, i) => acc + x.s * (RANK_W[i] || 0.12), 0);
    if (opts.arcBots) raw += arcMapBonus(m, opts.arcBots);
    raw *= 1.08 - 0.04 * (m.diff || 3);
    if (raw > 0) out.push({ map: m, raw, pois });
  }
  out.sort((a, b) => b.raw - a.raw);
  const top = out[0]?.raw || 1;
  for (const r of out) r.pct = Math.round((r.raw / top) * 100);
  return out;
}

function arcMapBonus(m, bots) {
  return bots.filter((b) => D.B[b].maps.includes(m.id)).reduce((a, b) => a + 2.2 / Math.sqrt(D.B[b].lvl), 0);
}

// itinéraire : meilleures zones positionnées, ordonnées au plus proche voisin
export function buildRoute(pois, max = 4) {
  const pts = pois.filter((x) => x.p.x != null).slice(0, max);
  if (pts.length < 2) return pts;
  const route = [pts.shift()];
  while (pts.length) {
    const last = route[route.length - 1].p;
    let bi = 0, bd = Infinity;
    pts.forEach((x, i) => { const d = (x.p.x - last.x) ** 2 + (x.p.y - last.y) ** 2; if (d < bd) { bd = d; bi = i; } });
    route.push(pts.splice(bi, 1)[0]);
  }
  return route;
}

export function chanceFrom(v) {
  const levels = [
    [0.66, 'Très élevée', 5, '#6bd66b'], [0.46, 'Élevée', 4, '#a5dd4a'], [0.28, 'Moyenne', 3, '#ffc23d'],
    [0.15, 'Faible', 2, '#ff8a3d'], [0, 'Très faible', 1, '#ff4b3e'],
  ];
  const l = levels.find(([t]) => v >= t);
  return { v, label: l[1], bars: l[2], color: l[3] };
}

// ----------------------------------------------------------------- schémas : signalements
export function blueprintIntel(id) {
  const r = D.db.bpr[id];
  if (!r) return null;
  const base = D.bpBase;
  const maps = Object.entries(r.maps).map(([m, c]) => {
    const share = c / Math.max(1, r.n);
    const baseShare = (base.maps[m] || 1) / base.total;
    // affinité lissée : ce schéma sort-il plus souvent ici que la moyenne des schémas ?
    const aff = ((c + 3 * baseShare) / (r.n + 3)) / baseShare;
    return { map: D.M[m], c, share, aff };
  }).filter((x) => x.map).sort((a, b) => b.c - a.c || b.aff - a.aff);
  const nCond = Object.values(r.cond).reduce((a, b) => a + b, 0);
  const night = nCond ? (r.cond.night || 0) / nCond : 0;
  const baseNight = (base.cond.night || 0) / Math.max(1, Object.values(base.cond).reduce((a, b) => a + b, 0));
  const storm = nCond ? ((r.cond.storm || 0) + (r.cond.bunker || 0)) / nCond : 0;
  const nRoom = Object.values(r.room).reduce((a, b) => a + b, 0);
  const special = nRoom ? ((r.room.key || 0) + (r.room.breach || 0)) / nRoom : 0;
  return { ...r, mapsRanked: maps, night, baseNight, storm, special, nCond, nRoom };
}

// ----------------------------------------------------------------- analyse complète d'un objet
export function analyze(id) {
  const it = D.I[id];
  const k = kind(it);
  const a = {
    it, kind: k, primary: null, maps: [], route: [], chance: null, cats: [],
    arcBots: (D.dropBy[id] || []).slice().sort((x, y) => D.B[x].lvl - D.B[y].lvl),
    // sources de recyclage : d'abord les objets « à recycler » (pas les armes ni l'équipement fabriqué)
    recycle: (D.recycleFrom[id] || []).slice().sort((x, y) => junkRank(D.I[x.id]) - junkRank(D.I[y.id]) || y.q - x.q || RARITY_ORDER.indexOf(D.I[x.id].r) - RARITY_ORDER.indexOf(D.I[y.id].r)),
    salvage: D.salvageFrom[id] || [],
    quests: D.questReward[id] || [], grants: D.questGrant[id] || [], projects: D.projectReward[id] || [],
    vendors: it.vd || [], craft: it.rc ? { rc: it.rc, b: it.b, lv: it.lv, cq: it.cq || 1, bp: it.bp } : null,
    upgrade: D.upgradeFrom[id] ? { from: D.upgradeFrom[id], cost: it.up || {} } : null,
    bp: k === 'blueprint' ? blueprintIntel(id) : null,
  };

  // ARC raisonnables à abattre « en passant » (hors machines critiques et boss)
  a.arcEasy = a.arcBots.filter((b) => D.B[b].lvl <= 3);
  let cats = it.f ? it.f.slice() : [];
  if (k === 'key') cats = ['Security'];
  a.cats = cats;

  if (k === 'blueprint') {
    a.primary = a.quests.length ? 'quest' : a.projects.length ? 'project' : 'reports';
    const bi = a.bp;
    if (bi && bi.mapsRanked.length) {
      const top = bi.mapsRanked[0].c;
      a.maps = bi.mapsRanked.map((x) => ({ map: x.map, raw: x.c, pct: Math.round((x.c / top) * 100), share: x.share, aff: x.aff, pois: poisFromReports(bi, x.map.id) }));
    } else if (bi && bi.only) {
      a.maps = [{ map: D.M[bi.only], raw: 1, pct: 100, pois: [] }];
    }
    const n = bi ? bi.n : 0;
    a.chance = chanceFrom(a.primary === 'quest' ? 0.95 : n >= 90 ? 0.5 : n >= 45 ? 0.36 : n >= 18 ? 0.24 : n >= 6 ? 0.16 : 0.08);
  } else if (cats.length || a.arcBots.length) {
    const ranked = rankMapsForCats(cats, { arcBots: a.arcBots });
    if (k === 'key' && keyMap(id)) {
      a.maps = ranked.filter((r) => r.map.id === keyMap(id));
      if (!a.maps.length) a.maps = [{ map: D.M[keyMap(id)], raw: 1, pct: 100, pois: [] }];
    } else a.maps = ranked;
    a.primary = !cats.length || (a.arcBots.length && cats.every((c) => c === 'ARC')) ? 'arc' : 'loot';
    const best = a.maps[0];
    const cover = best ? Math.min(1, 0.45 + best.raw / 9) : 0.4;
    a.chance = chanceFrom((RARITY_BASE[it.r] || 0.5) * cover + (a.arcBots.length ? 0.08 : 0));
  } else if (a.craft || a.upgrade) {
    a.primary = 'craft';
  } else if (a.vendors.length) {
    a.primary = 'buy';
  } else if (a.quests.length || a.grants.length) {
    a.primary = 'quest';
  } else if (a.recycle.length) {
    a.primary = 'recycle';
  } else {
    a.primary = 'random';
    a.chance = chanceFrom((RARITY_BASE[it.r] || 0.5) * 0.6);
  }
  if (k === 'weapon') a.primary = a.craft || a.upgrade ? 'craft' : a.vendors.length ? 'buy' : a.primary;

  if (a.maps.length && a.maps[0].pois) a.route = buildRoute(a.maps[0].pois);
  return a;
}

function poisFromReports(bi, mapId) {
  const m = D.M[mapId];
  return bi.poi.filter(([mid]) => mid === mapId).map(([, en, c]) => {
    const p = m.pois.find((x) => x.en === en);
    return p ? { p, s: c, match: [], reports: c } : null;
  }).filter(Boolean);
}

// ----------------------------------------------------------------- fabrication
export function familyOf(id) {
  return D.families.find((f) => f.tiers.includes(id));
}

// coût cumulé pour obtenir une arme au palier choisi (fabrication du I + améliorations)
export function weaponCost(fam, tierIdx) {
  const total = {};
  const add = (o) => { for (const [k, q] of Object.entries(o || {})) total[k] = (total[k] || 0) + q; };
  add(D.I[fam.tiers[0]].rc);
  for (let i = 1; i <= tierIdx; i++) add(D.I[fam.tiers[i]].up);
  return total;
}

export function directCost(id, qty = 1) {
  const it = D.I[id];
  const fam = it.wpn ? familyOf(id) : null;
  if (fam) {
    const c = weaponCost(fam, fam.tiers.indexOf(id));
    return Object.fromEntries(Object.entries(c).map(([k, q]) => [k, q * qty]));
  }
  if (!it.rc) return {};
  const runs = Math.ceil(qty / (it.cq || 1));
  return Object.fromEntries(Object.entries(it.rc).map(([k, q]) => [k, q * runs]));
}

// décompose les matériaux raffinés en matières premières
const EXPANDABLE = (it) => it && it.rc && ['Refined Material'].includes(it.t);
export function expandCost(cost, depth = 0) {
  if (depth > 4) return cost;
  const out = {};
  let changed = false;
  for (const [k, q] of Object.entries(cost)) {
    const it = D.I[k];
    if (EXPANDABLE(it)) {
      changed = true;
      const runs = Math.ceil(q / (it.cq || 1));
      for (const [k2, q2] of Object.entries(it.rc)) out[k2] = (out[k2] || 0) + q2 * runs;
    } else out[k] = (out[k] || 0) + q;
  }
  return changed ? expandCost(out, depth + 1) : out;
}

// ----------------------------------------------------------------- plan de raids multi-objets
export function sourceProfile(id) {
  const a = analyze(id);
  const scores = {};
  for (const m of a.maps) scores[m.map.id] = m.pct / 100;
  return { a, scores };
}

export function farmPlan(needs) {
  const pending = [];
  const other = [];
  for (const n of needs) {
    if (n.q <= 0) continue;
    const prof = sourceProfile(n.id);
    if (Object.keys(prof.scores).length && prof.a.primary !== 'craft' && prof.a.primary !== 'buy') pending.push({ ...n, ...prof });
    else other.push({ ...n, ...prof });
  }
  const raids = [];
  let guard = 0;
  while (pending.length && guard++ < 6) {
    let best = null, bestV = -1;
    for (const m of D.db.maps) {
      const v = pending.reduce((acc, n) => acc + (n.scores[m.id] || 0) * (1 + RARITY_ORDER.indexOf(D.I[n.id].r) * 0.15), 0);
      if (v > bestV) { bestV = v; best = m; }
    }
    if (!best || bestV <= 0) break;
    const take = [];
    for (let i = pending.length - 1; i >= 0; i--) {
      const n = pending[i];
      const mx = Math.max(...Object.values(n.scores));
      if ((n.scores[best.id] || 0) >= 0.72 * mx) take.push(pending.splice(i, 1)[0]);
    }
    if (!take.length) break;
    const cats = [...new Set(take.flatMap((n) => n.a.cats))];
    const pois = cats.length ? best.pois.map((p) => ({ p, s: poiScore(p, cats), match: (p.tags || []).filter((t) => cats.includes(t)) })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s) : [];
    const bots = [...new Set(take.flatMap((n) => (n.a.primary === 'arc' ? n.a.arcBots.slice(0, 1) : n.a.arcEasy).filter((b) => D.B[b].maps.includes(best.id))))];
    raids.push({ map: best, items: take.reverse(), pois: pois.slice(0, 5), route: buildRoute(pois), bots });
  }
  return { raids, other: other.concat(pending) };
}
