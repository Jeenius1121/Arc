// Fiche « Mission de récupération » d'un objet
import { D, CAT_FR, RARITY_FR, TYPE_FR, CONTAINERS, CONT_FR, CURRENCY, TRADERS, kind, name, keyMap } from '../data.js';
import { analyze, tierLabel, familyOf, directCost } from '../engine.js';
import { ICONS, icon } from '../icons.js';
import { esc, fmt, thumb, itemRow, catChip, tierChip, sectionTitle, gauge, costLine, stepper, mapName, $, $$, toast } from '../ui.js';
import { mapBox } from '../mapsvg.js';
import { store } from '../store.js';

const pct = (x) => Math.round(x * 100) + ' %';
const link = (id, q) => `<a href="#/item/${id}"><b>${esc(name(id))}</b></a>${q ? ` ×${fmt(q)}` : ''}`;
const benchName = (b) => D.db.benches[b] || b;

export function renderItem(el, id) {
  const it = D.I[id];
  if (!it) { el.innerHTML = '<div class="wrap empty">Objet introuvable.</div>'; return; }
  store.addRecent(id);
  const a = analyze(id);
  const k = a.kind;
  const best = a.maps[0];

  el.innerHTML = `<div class="wrap fade-in">
    ${hero(a)}
    ${verdict(a)}
    ${actions(a)}
    ${k === 'blueprint' ? blueprintBlock(a) : ''}
    ${k === 'weapon' ? weaponBlock(a) : ''}
    ${best ? `<section class="section">${sectionTitle(k === 'blueprint' ? 'Où il a été trouvé' : 'Carte conseillée', '01')}
      <div id="mapzone">${mapBox(best.map, { focus: focusSet(best), route: a.route, labels: 'focus' })}</div>
      <div class="maprank stagger" style="margin-top:10px">${a.maps.slice(0, 6).map((m, i) => mapRankRow(a, m, i)).join('')}</div>
      ${k === 'blueprint' ? `<p class="note">Répartition de ${fmt(a.bp.n)} signalements de joueurs. Les cartes les plus jouées (Barrage, Ville Enfouie) en cumulent naturellement plus.</p>`
        : '<p class="note">Indice Tracker : densité de zones du bon type de butin, pondérée par leur valeur (rouge > jaune) et la difficulté de la carte. Touchez une carte pour voir ses zones.</p>'}
    </section>` : ''}
    ${best && best.pois.length ? `<section class="section">${sectionTitle('Zones conseillées', '02')}<div id="poilist" class="stack stagger">${poiList(a, best)}</div></section>` : ''}
    <section class="section">${sectionTitle('Étapes à suivre', best ? '03' : '01')}<div class="card hud steps">${steps(a).map(stepHTML).join('')}</div></section>
    ${otherMethods(a)}
    ${uses(a)}
    <p class="foot">Estimations Tracker basées sur les données de jeu et les signalements communautaires.<br/>Le butin reste aléatoire — bonne chance, Raider.</p>
  </div>`;

  // interactions
  $$('.mr[data-map]', el).forEach((row) => row.addEventListener('click', () => {
    const m = a.maps.find((x) => x.map.id === row.dataset.map);
    $$('.mr', el).forEach((r) => r.classList.toggle('best', r === row));
    $('#mapzone', el).innerHTML = mapBox(m.map, { focus: focusSet(m), route: m === a.maps[0] ? a.route : routeFor(m), labels: 'focus' });
    const pl = $('#poilist', el);
    if (pl) pl.innerHTML = poiList(a, m);
  }));
  const addBtn = $('#add-list', el);
  if (addBtn) addBtn.addEventListener('click', () => {
    if (store.inList(id)) { store.removeFromList(id); toast(`Retiré de <b>Ma liste</b>`); } else { store.addToList(id, 1); toast(`<b>${esc(it.n)}</b> ajouté à Ma liste — le plan de raids s'adapte.`); }
    addBtn.classList.toggle('primary', !store.inList(id));
    addBtn.innerHTML = store.inList(id) ? `${ICONS.check} Dans ma liste` : `${ICONS.plus} Ajouter à ma liste`;
  });
  bindSteppers(el);
}

function routeFor(m) {
  return m.pois.filter((x) => x.p.x != null).slice(0, 4);
}
const focusSet = (m) => new Set(m.pois.slice(0, 6).map((x) => x.p.en));

// ------------------------------------------------------------------ en-tête
function hero(a) {
  const it = a.it;
  const cats = (it.f || []).map((c) => catChip(c)).join('');
  const isW = a.kind === 'weapon';
  const fx = Object.fromEntries(it.fx || []);
  const cells = isW
    ? [['Munitions', (fx.Munitions || '—').replace('Munitions ', '')], ['Chargeur', fx.Chargeur || '—'], ['Pén. ARC', fx['Pénétration ARC'] || '—'], ['Valeur', fmt(it.v)]]
    : [['Valeur', fmt(it.v)], ['Poids', it.w != null ? String(it.w).replace('.', ',') + ' kg' : '—'], ['Pile', it.s ? '×' + it.s : '—'], ['Possédé', fmt(store.have(it.id))]];
  return `<div class="item-hero">
      ${thumb(it, 'lg')}
      <div style="min-width:0">
        <div class="rar r-${it.r}">${RARITY_FR[it.r] || ''} · ${esc(TYPE_FR[it.t] || it.t)}</div>
        <h1>${esc(it.n)}</h1>
        <div class="en">${esc(it.en)}</div>
      </div>
    </div>
    ${cats ? `<div class="chips">${cats}</div>` : ''}
    ${it.d ? `<p class="item-desc">${esc(it.d)}</p>` : ''}
    <div class="stats-strip">${cells.map(([l, v]) => `<div><b>${esc(v)}</b><span>${l}</span></div>`).join('')}</div>`;
}

// ------------------------------------------------------------------ verdict
function verdict(a) {
  const it = a.it;
  const best = a.maps[0];
  let k = 'Meilleure méthode', t = '', s = '', grid = [];
  const ch = a.chance ? `<b style="color:${a.chance.color}">${a.chance.label}</b>${gauge(a.chance)}` : '<b>—</b>';
  switch (a.primary) {
    case 'loot': {
      const p = best?.pois[0]?.p;
      t = `Fouiller ${best ? '— ' + best.map.n : ''}`;
      s = `Butin ${a.cats.map((c) => CAT_FR[c]).join(' / ')} : direction ${p ? `<b>${esc(p.n)}</b>` : 'les zones du bon type'}${a.arcEasy.length ? ` et les ARC ${a.arcEasy.slice(0, 2).map((b) => D.B[b].n).join(', ')}` : ''}.`;
      grid = [['Carte', best ? esc(best.map.n) : '—'], ['Zone n°1', p ? esc(p.n) : '—'], ['Chance', ch]];
      break;
    }
    case 'arc': {
      const b = D.B[a.arcBots[0]];
      t = `Chasser l'ARC — ${b.n}`;
      s = `${esc(it.n)} se récupère sur les ARC détruits. Cible la plus simple : <b>${esc(b.n)}</b> (menace ${b.threat.toLowerCase()}).`;
      grid = [['Cible', esc(b.n)], ['Carte', best ? esc(best.map.n) : esc(mapName(b.maps[0]))], ['Chance', ch]];
      break;
    }
    case 'reports': {
      const bi = a.bp;
      const night = bi && bi.night > bi.baseNight + 0.1;
      t = `Fouiller — ${best ? best.map.n : 'toutes cartes'}${night ? ' de nuit' : ''}`;
      s = bi && bi.n ? `Trouvé ${fmt(bi.n)} fois par la communauté${best ? `, surtout sur <b>${esc(best.map.n)}</b> (${pct(best.share)})` : ''}.` : 'Schéma rare : peu de signalements. Fouillez les zones à valeur élevée.';
      grid = [['Carte', best ? esc(best.map.n) : 'Toutes'], ['Moment', bi && bi.nCond ? (night ? 'Nuit' : 'Jour ou nuit') : '—'], ['Chance', ch]];
      break;
    }
    case 'quest': {
      const q = D.Q[(a.quests[0] || a.grants[0]).q];
      t = `Quête — ${q.n}`;
      s = `Récompense <b>garantie</b> de la quête de ${esc(q.tr)}.`;
      grid = [['Marchand', esc(q.tr)], ['Garanti', '<b style="color:var(--green)">Oui</b>'], ['Cartes', q.maps.length ? q.maps.map(mapName).map(esc).join(', ') : '—']];
      break;
    }
    case 'project': {
      const p = a.projects[0];
      const pr = D.db.projects.find((x) => x.id === p.p);
      t = `Projet — ${pr.n}`;
      s = `Phase ${p.ph} « ${esc(p.phn)} » : livrez ${fmt(p.giveN)} × ${link(p.give)} pour l'obtenir.`;
      grid = [['Projet', esc(pr.n)], ['Phase', String(p.ph)], ['Garanti', '<b style="color:var(--green)">Oui</b>']];
      break;
    }
    case 'craft': {
      const lv = it.lv || (a.upgrade ? D.I[familyOf(it.id)?.tiers[0]]?.lv : null);
      const b = (it.b || D.I[familyOf(it.id)?.tiers[0]]?.b || [])[0];
      t = `Fabriquer${b ? ' — ' + benchName(b) : ''}`;
      s = a.upgrade ? `Améliorez ${link(a.upgrade.from)} : ${costLine(a.upgrade.cost)}.` : `Recette : ${costLine(it.rc)}.`;
      const bp = it.bp || D.I[familyOf(it.id)?.tiers[0]]?.bp;
      grid = [['Atelier', b ? `${esc(benchName(b))}${lv ? ' ' + lv : ''}` : '—'], ['Schéma', bp ? 'Requis' : 'Non requis'], ['Matériaux', String(Object.keys(directCost(it.id)).length)]];
      break;
    }
    case 'buy': {
      const v = a.vendors[0];
      t = `Acheter — ${v.trader}`;
      s = `Disponible chez <b>${esc(v.trader)}</b> pour ${costLine(v.cost)}.`;
      grid = [['Marchand', esc(v.trader)], ['Prix', esc(costLine(v.cost))], ['Limite', v.limit ? '×' + v.limit : 'Aucune']];
      break;
    }
    case 'recycle': {
      const r = a.recycle[0];
      t = `Recycler — ${D.I[r.id].n}`;
      s = `Recyclez ${link(r.id)} : il rend ${r.q} × ${esc(it.n)}.`;
      grid = [['Source', esc(D.I[r.id].n)], ['Rendement', '×' + r.q], ['Sources', String(a.recycle.length)]];
      break;
    }
    default:
      t = 'Butin aléatoire';
      s = 'Pas de lieu fixe connu : il sort dans les conteneurs aléatoires. Visez les zones à valeur élevée.';
      grid = [['Carte', 'Toutes'], ['Zones', 'Rouges'], ['Chance', ch]];
  }
  return `<div class="verdict fade-in">
    <div class="v-k">${k}</div>
    <div class="v-t">${esc(t)}</div>
    <div class="v-s">${s}</div>
    <div class="v-grid">${grid.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('')}</div>
  </div>`;
}

const actionsBtn = (id) => store.inList(id)
  ? `<button id="add-list" class="btn block">${ICONS.check} Dans ma liste</button>`
  : `<button id="add-list" class="btn primary block">${ICONS.plus} Ajouter à ma liste</button>`;

function actions(a) {
  const id = a.it.id;
  const craftLink = (a.kind === 'weapon' || a.it.rc) ? `<a class="btn block" href="#/craft/${id}" style="margin-top:8px">${ICONS.craft} Planifier la fabrication</a>` : '';
  return `<div style="margin-top:12px">${actionsBtn(id)}${craftLink}
    <div class="row" style="margin-top:8px;min-height:54px"><div class="r-main"><div class="r-title">J'en ai déjà</div><div class="r-sub">Sert à calculer ce qu'il reste à trouver</div></div>${stepper(id, store.have(id))}</div>
  </div>`;
}

function mapRankRow(a, m, i) {
  const why = a.kind === 'blueprint'
    ? `${fmt(m.raw)} signalement${m.raw > 1 ? 's' : ''}${m.aff > 1.25 && m.raw >= 4 ? ' · plus fréquent ici qu’ailleurs' : ''}`
    : m.pois.length ? `${m.pois.length} zone${m.pois.length > 1 ? 's' : ''} du bon type · ${m.pois.filter((x) => x.p.tier === 'high').length} à valeur élevée` : 'ARC présents';
  return `<button class="mr ${i === 0 ? 'best' : ''}" data-map="${m.map.id}" style="text-align:left">
    <div class="mr-n">${esc(m.map.n)} ${i === 0 ? '<span class="tag">CONSEILLÉ</span>' : ''}</div>
    <div class="mr-p">${a.kind === 'blueprint' ? pct(m.share || 0) : m.pct + ' %'}</div>
    <div class="bar"><i style="width:${Math.max(4, m.pct)}%;animation-delay:${i * 0.07}s"></i></div>
    <div class="mr-z">${why} · difficulté ${'◆'.repeat(m.map.diff || 1)}</div>
  </button>`;
}

function poiList(a, m) {
  return m.pois.slice(0, 5).map((x, i) => {
    const p = x.p;
    const why = x.reports ? `Trouvé ${x.reports} fois ici par la communauté.`
      : x.match.length ? `Zone ${x.match.map((c) => CAT_FR[c]).join(' + ')}${p.tags.length > x.match.length ? ` (aussi ${p.tags.filter((t) => !x.match.includes(t)).map((c) => CAT_FR[c]).join(', ')})` : ''}.` : '';
    return `<div class="poi ${i === 0 ? 'top' : ''}">
      <div class="p-rank">${i + 1}</div>
      <div style="min-width:0">
        <div class="p-n">${esc(p.n)}</div>
        ${p.en !== p.n ? `<div class="p-en">${esc(p.en)}</div>` : ''}
        <div class="p-why">${why}</div>
        <div class="chips">${tierChip(p.tier)}${(p.tags || []).map((c) => catChip(c, x.match.includes(c) ? 'accent' : '')).join('')}${p.x == null ? '<span class="chip">Position non relevée</span>' : ''}</div>
      </div>
    </div>`;
  }).join('');
}

// ------------------------------------------------------------------ étapes
function stepHTML(s, i) {
  return `<div class="step"><div class="s-n">${s.icon ? ICONS[s.icon] : i + 1}</div><div class="s-b"><div class="s-t">${s.t}</div><div class="s-d">${s.d}</div></div></div>`;
}

function steps(a) {
  const it = a.it;
  const best = a.maps[0];
  const out = [];
  const routeTxt = (r) => r.map((x, i) => `<b>${'①②③④⑤'[i]} ${esc(x.p.n)}</b>`).join(' → ');
  const planB = () => {
    const alts = [];
    const rs = a.recycle.find((r) => !D.I[r.id].wpn);
    if (rs) alts.push(`recycler ${link(rs.id)} (×${rs.q})`);
    if (it.rc && a.primary !== 'craft') alts.push(`le fabriquer (${costLine(it.rc)})`);
    if (a.vendors.length && a.primary !== 'buy') alts.push(`l'acheter chez ${esc(a.vendors[0].trader)} (${costLine(a.vendors[0].cost)})`);
    return alts.length ? { icon: 'recycle', t: 'Plan B', d: `Pas de chance ? Vous pouvez aussi ${alts.join(', ou ')}.` } : null;
  };
  const extract = { icon: 'route', t: 'Extraire', d: 'Dès que vous l’avez, dirigez-vous vers l’extraction : un objet n’est à vous qu’une fois sorti du raid.' };

  if (a.primary === 'loot') {
    const rare = ['Rare', 'Epic', 'Legendary'].includes(it.r);
    out.push({ t: 'Préparer le raid', d: `Équipement léger (un kit gratuit suffit pour un run de fouille) et sac vide.${a.kind === 'key' ? ' Les clés sortent surtout des conteneurs de sécurité et des salles fermées.' : ''}${it.s && it.s > 1 ? ` ${esc(it.n)} se cumule par ${it.s}.` : ''}` });
    if (best) out.push({ t: `Lancer ${esc(best.map.full || best.map.n)}`, d: `C'est la carte la plus riche en butin ${a.cats.map((c) => '<b>' + CAT_FR[c] + '</b>').join(' / ')}.${rare ? ' Objet ' + RARITY_FR[it.r].toLowerCase() + ' : privilégiez un <b>Raid nocturne</b> ou une <b>Tempête électromagnétique</b>, le butin y a plus de valeur.' : ''}` });
    if (a.route.length > 1) out.push({ t: 'Suivre l’itinéraire', d: `${routeTxt(a.route)}. Le tracé est sur le plan ci-dessus.` });
    else if (best?.pois[0]) out.push({ t: 'Aller à la zone', d: `<b>${esc(best.pois[0].p.n)}</b>.` });
    const cats = a.cats.filter((c) => CONTAINERS[c]).slice(0, 3);
    if (cats.length) out.push({ t: 'Fouiller les bons conteneurs', d: cats.map((c) => `${CAT_FR[c]} → ${CONTAINERS[c]}`).join('<br/>') + (best?.pois.some((x) => x.p.tier === 'high') ? '<br/>Les zones rouges (valeur élevée) contiennent les meilleurs conteneurs.' : '') });
    if (a.arcEasy.length) out.push({ t: 'Abattre les ARC sur la route', d: a.arcEasy.slice(0, 3).map((b) => `<b>${esc(D.B[b].n)}</b> — ${esc(D.B[b].weak)}`).join('<br/>') });
    const pb = planB(); if (pb) out.push(pb);
    out.push(extract);
  } else if (a.primary === 'arc') {
    const b = D.B[a.arcBots[0]];
    const heavy = b.lvl >= 4;
    out.push({ t: 'Préparer le raid', d: heavy ? 'Cible coriace : venez à plusieurs, avec des munitions lourdes et des explosifs.' : 'Une arme légère et quelques munitions suffisent.' });
    const easy = best?.map || D.M[b.maps[0]];
    out.push({ t: `Lancer ${esc(easy.full || easy.n)}`, d: `${esc(b.n)} y est présent${easy.diff <= 2 ? ' — et c’est la carte la plus accessible' : ''}.` });
    out.push({ t: `Traquer : ${esc(b.n)}`, d: `Point faible : <b>${esc(b.weak)}</b>` });
    const others = b.drops.filter((d) => d !== it.id).slice(0, 4).map((d) => link(d)).join(', ');
    out.push({ t: 'Fouiller la carcasse', d: `Une fois détruit, fouillez l'ARC : ${esc(it.n)} fait partie de son butin${others ? `, avec ${others}` : ''}.` });
    if (a.arcBots.length > 1) out.push({ t: 'Autres ARC qui le lâchent', d: a.arcBots.slice(1).map((x) => `${esc(D.B[x].n)} (menace ${D.B[x].threat.toLowerCase()})`).join(', ') });
    const arcPois = easy.pois.filter((p) => (p.tags || []).includes('ARC'));
    if (arcPois.length) out.push({ icon: 'pin', t: 'Épaves d’ARC', d: `Les carcasses de ${arcPois.map((p) => '<b>' + esc(p.n) + '</b>').join(', ')} se démontent aussi.` });
    const pb = planB(); if (pb) out.push(pb);
    out.push(extract);
  } else if (a.primary === 'reports' || (a.kind === 'blueprint')) {
    const bi = a.bp;
    const guaranteed = [];
    a.quests.forEach((q) => guaranteed.push(`quête <a href="#/quest/${q.q}"><b>${esc(D.Q[q.q].n)}</b></a> (${esc(D.Q[q.q].tr)})`));
    a.projects.forEach((p) => guaranteed.push(`projet <b>${esc(D.db.projects.find((x) => x.id === p.p).n)}</b>, phase ${p.ph} (livrer ${fmt(p.giveN)} × ${link(p.give)})`));
    if (guaranteed.length) out.push({ icon: 'star', t: 'Source garantie', d: `Obtenu à coup sûr via : ${guaranteed.join(' ; ')}.` });
    if (bi?.trials) out.push({ icon: 'star', t: 'Épreuves hebdomadaires', d: 'Il fait partie des récompenses possibles des Épreuves (Trials) : complétez-les chaque semaine.' });
    if (best) out.push({ t: `Lancer ${esc(best.map.full || best.map.n)}`, d: bi?.n ? `${pct(best.share)} des ${fmt(bi.n)} trouvailles signalées.` : 'Carte associée à ce schéma.' });
    if (bi && bi.nCond >= 5) {
      const night = bi.night > bi.baseNight + 0.1;
      out.push({ icon: 'moon', t: night ? 'Y aller de nuit' : 'Jour ou nuit', d: `${pct(bi.night)} des trouvailles se font de nuit (moyenne de tous les schémas : ${pct(bi.baseNight)}).${night ? ' Lancez un <b>Raid nocturne</b>.' : ''}${bi.storm > 0.08 ? ' Les tempêtes et le bunker caché ressortent aussi.' : ''}` });
    }
    if (best?.pois.length) out.push({ t: 'Zones où il sort', d: best.pois.slice(0, 4).map((x) => `<b>${esc(x.p.n)}</b> (${x.reports})`).join(' · ') });
    if (bi?.cont?.length) out.push({ t: 'Conteneurs à fouiller en priorité', d: bi.cont.filter(([c]) => c !== 'autre').slice(0, 4).map(([c, n]) => `${CONT_FR[c] || c} <span class="muted">(${n})</span>`).join(' · ') });
    if (bi && bi.nRoom >= 5) out.push({ icon: 'target', t: 'Salles spéciales', d: `${pct(bi.special)} des trouvailles viennent de salles à clé ou à forcer. ${bi.special > 0.25 ? 'Emportez vos clés !' : 'La majorité sort de conteneurs ordinaires : fouillez large.'}` });
    out.push({ t: 'Multiplier les fouilles', d: 'Les schémas sont du butin aléatoire : plus vous ouvrez de conteneurs (zones rouges, caches de raiders, ARC Arpenteurs), plus vos chances montent.' });
    if (it.bpf) out.push({ icon: 'check', t: 'L’apprendre', d: `De retour à Speranza, utilisez-le pour débloquer définitivement la fabrication de ${link(it.bpf)}.` });
  } else if (a.primary === 'quest') {
    (a.quests.length ? a.quests : a.grants).slice(0, 2).forEach((qq) => {
      const q = D.Q[qq.q];
      out.push({ icon: 'quest', t: `Quête « ${esc(q.n)} »`, d: `Donnée par <b>${esc(q.tr)}</b>${q.prev.length ? ` après ${q.prev.map((p) => D.Q[p] ? `<a href="#/quest/${p}">« ${esc(D.Q[p].n)} »</a>` : '').join(', ')}` : ''}.` });
      q.obj.forEach((o, i) => out.push({ t: `Objectif ${i + 1}`, d: esc(o) }));
    });
  } else if (a.primary === 'craft') {
    const fam = familyOf(it.id);
    const root = fam ? D.I[fam.tiers[0]] : it;
    if (root.bp) out.push({ icon: 'keep', t: 'Débloquer le schéma', d: `${link(root.bp)} — <a href="#/item/${root.bp}">voir où le trouver</a>.` });
    else if (root.bl) out.push({ icon: 'keep', t: 'Schéma requis', d: 'Ce craft se débloque avec un schéma.' });
    const b = (root.b || [])[0];
    if (b) {
      const st = D.S[b];
      const lvl = root.lv || 1;
      const req = st?.levels.find((l) => l.lv === lvl);
      out.push({ icon: 'station', t: `Atelier : ${esc(benchName(b))} niveau ${lvl}`, d: req && req.req.length ? `Pour ce niveau : ${req.req.map(([k, q]) => link(k, q)).join(', ')}.` : 'Disponible dès le départ.' });
    }
    const cost = directCost(it.id);
    out.push({ icon: 'backpack', t: 'Réunir les matériaux', d: Object.entries(cost).map(([k, q]) => `${link(k)} : ${fmt(Math.min(store.have(k), q))}/${fmt(q)}`).join('<br/>') });
    out.push({ icon: 'route', t: 'Plan de raids', d: `<a href="#/craft/${it.id}"><b>Ouvrir le planificateur</b></a> : Tracker regroupe les matériaux manquants par carte.` });
    out.push({ icon: 'check', t: 'Fabriquer', d: fam && fam.tiers.indexOf(it.id) > 0 ? 'Fabriquez le palier I puis améliorez-le palier par palier chez l’Armurier.' : 'Lancez la fabrication à l’atelier.' });
  } else if (a.primary === 'buy') {
    a.vendors.forEach((v) => out.push({ icon: 'coin', t: `Chez ${esc(v.trader)}`, d: `${costLine(v.cost)}${v.limit ? ` · limite ${v.limit}` : ''}${v.refreshSeconds ? ` / ${Math.round(v.refreshSeconds / 3600)} h` : ''}${v.requiredLevel ? ` · niveau ${v.requiredLevel} requis` : ''}.` }));
    const pb = planB(); if (pb) out.push(pb);
  } else if (a.primary === 'recycle') {
    out.push({ icon: 'recycle', t: 'Recycler', d: a.recycle.slice(0, 5).map((r) => `${link(r.id)} → ×${r.q}`).join('<br/>') });
  } else {
    out.push({ t: 'Fouiller large', d: 'Aucun lieu fixe : il sort de conteneurs aléatoires. Visez les zones à valeur élevée, les caches de raiders et les ARC.' });
    const pb = planB(); if (pb) out.push(pb);
    out.push(extract);
  }
  return out;
}

// ------------------------------------------------------------------ blocs spécifiques
function blueprintBlock(a) {
  const t = a.it.bpf && D.I[a.it.bpf];
  if (!t) return '';
  return `<section class="section">${sectionTitle('Ce schéma débloque')}
    ${itemRow(t, { sub: `${TYPE_FR[t.t] || t.t} · ${t.rc ? costLine(t.rc) : ''}` })}</section>`;
}

function weaponBlock(a) {
  const fam = familyOf(a.it.id);
  if (!fam) return '';
  return `<section class="section">${sectionTitle('Paliers de l’arme')}
    <div class="list">${fam.tiers.map((id, i) => {
      const t = D.I[id];
      const cost = i === 0 ? t.rc : t.up;
      return itemRow(t, { sub: `${i === 0 ? 'Fabrication' : 'Amélioration'} : ${cost ? costLine(cost) : '—'}`, end: id === a.it.id ? '<small>ACTUEL</small>' : '' });
    }).join('')}</div></section>`;
}

function otherMethods(a) {
  const it = a.it;
  const blocks = [];
  const det = (ico, t, s, body, open = false) => `<details class="method" ${open ? 'open' : ''}><summary><span class="m-ico">${ICONS[ico] || icon(ico)}</span><span class="m-t"><b>${t}</b><span>${s}</span></span><span class="m-chev">${ICONS.chev}</span></summary><div class="m-body">${body}</div></details>`;

  if (a.recycle.length && a.primary !== 'recycle') {
    blocks.push(det('recycle', 'Recycler', `${a.recycle.length} objet${a.recycle.length > 1 ? 's' : ''} en donnent`, `<div class="list">${a.recycle.slice(0, 8).map((r) => itemRow(D.I[r.id], { end: `×${r.q}<small>PAR OBJET</small>` })).join('')}</div>
      <p class="note">Ramassez ces objets en raid puis recyclez-les à Speranza.</p>`));
  }
  if (a.salvage.length) {
    blocks.push(det('craft', 'Démonter en raid', `${a.salvage.length} objet${a.salvage.length > 1 ? 's' : ''}`, `<div class="list">${a.salvage.slice(0, 6).map((r) => itemRow(D.I[r.id], { end: `×${r.q}` })).join('')}</div>`));
  }
  if (it.rc && a.primary !== 'craft') {
    blocks.push(det('craft', 'Fabriquer', `${(it.b || []).map(benchName).join(', ')}${it.lv ? ' · niv. ' + it.lv : ''}`, `${Object.entries(it.rc).map(([k, q]) => `<div class="ing">${thumb(D.I[k], 'sm')}<a class="ing-n" href="#/item/${k}">${esc(name(k))}</a><span class="ing-q">×${q}</span></div>`).join('')}
      ${it.cq > 1 ? `<p class="note">Produit ×${it.cq} par fabrication.</p>` : ''}`));
  }
  if (a.vendors.length && a.primary !== 'buy') {
    blocks.push(det('coin', 'Acheter', a.vendors.map((v) => v.trader).join(', '), a.vendors.map((v) => `<div class="ing"><span class="ing-n">${esc(v.trader)}<small>${esc(TRADERS[v.trader] || '')}</small></span><span class="ing-q">${esc(costLine(v.cost))}</span></div>`).join('')));
  }
  if (a.arcBots.length && a.primary !== 'arc') {
    blocks.push(det('ARC', 'Sur les ARC', a.arcBots.map((b) => D.B[b].n).join(', '), a.arcBots.map((b) => botMini(D.B[b])).join('')));
  }
  if ((a.quests.length || a.grants.length) && a.primary !== 'quest') {
    const qs = [...a.quests, ...a.grants];
    blocks.push(det('quest', 'Quêtes', `${qs.length} quête${qs.length > 1 ? 's' : ''}`, qs.map((x) => `<a class="row" href="#/quest/${x.q}"><span class="r-main"><span class="r-title">${esc(D.Q[x.q].n)}</span><span class="r-sub">${esc(D.Q[x.q].tr)} · ×${x.n}</span></span><span class="chev">${ICONS.chev}</span></a>`).join('')));
  }
  if (a.projects.length && a.primary !== 'project') {
    blocks.push(det('station', 'Projets', `${a.projects.length}`, a.projects.map((p) => `<div class="ing"><span class="ing-n">${esc(D.db.projects.find((x) => x.id === p.p).n)}<small>Phase ${p.ph} — livrer ${fmt(p.giveN)} × ${esc(name(p.give))}</small></span><span class="ing-q">×${p.n}</span></div>`).join('')));
  }
  if (!blocks.length) return '';
  return `<section class="section">${sectionTitle('Autres méthodes')}${blocks.join('')}</section>`;
}

export function botMini(b) {
  return `<div class="bot"><span class="thumb sm r-${b.lvl >= 4 ? 'Epic' : b.lvl >= 3 ? 'Rare' : 'Uncommon'}">${ICONS.ARC}</span>
    <div style="flex:1;min-width:0"><div class="r-title" style="font-family:var(--head);font-weight:700">${esc(b.n)} <span class="muted" style="font-weight:500">· ${esc(b.type)}</span></div>
    <div class="r-sub" style="white-space:normal">${esc(b.weak)}</div>
    <div class="chips" style="margin-top:6px">${b.maps.map((m) => `<span class="chip">${esc(mapName(m))}</span>`).join('')}</div></div>
    <div class="threat" title="Menace ${esc(b.threat)}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= b.lvl ? 'on' : ''}"></i>`).join('')}</div></div>`;
}

function uses(a) {
  const id = a.it.id;
  const crafts = D.usedIn[id] || [];
  const st = D.stationNeed[id] || [];
  const qn = D.questNeed[id] || [];
  const pn = D.projectNeed[id] || [];
  const rows = [];
  st.forEach((s) => rows.push(`<div class="ing"><span class="m-ico" style="width:30px;height:30px">${ICONS.station}</span><span class="ing-n">${esc(D.S[s.s].n)} niveau ${s.lv}<small>Amélioration de l'atelier</small></span><span class="ing-q">×${s.n}</span></div>`));
  qn.forEach((q) => rows.push(`<a class="ing" href="#/quest/${q.q}"><span class="m-ico" style="width:30px;height:30px">${ICONS.quest}</span><span class="ing-n">${esc(D.Q[q.q].n)}<small>Quête · ${esc(D.Q[q.q].tr)}</small></span><span class="ing-q">×${q.n}</span></a>`));
  pn.forEach((p) => rows.push(`<div class="ing"><span class="m-ico" style="width:30px;height:30px">${ICONS.star}</span><span class="ing-n">${esc(D.db.projects.find((x) => x.id === p.p).n)}<small>Projet · phase ${p.ph}</small></span><span class="ing-q">×${p.n}</span></div>`));
  const craftRows = crafts.slice(0, 12).map((c) => `<a class="ing" href="#/item/${c.id}">${thumb(D.I[c.id], 'sm')}<span class="ing-n">${esc(D.I[c.id].n)}<small>${c.via === 'upgrade' ? 'Amélioration' : 'Fabrication'}</small></span><span class="ing-q">×${c.q}</span></a>`);
  const keep = st.length || qn.length || pn.length || crafts.length;
  const verdictTxt = a.kind === 'blueprint' ? ['keep', 'À APPRENDRE', 'teal', a.it.bpf ? `Débloque définitivement la fabrication de ${esc(name(a.it.bpf))}.` : 'Débloque une fabrication.']
    : keep ? ['keep', 'À GARDER', 'teal', 'Nécessaire pour vos améliorations, quêtes ou fabrications.']
    : a.it.ry ? ['recycle', 'À RECYCLER', 'accent', `Rend : ${costLine(a.it.ry)}.`]
      : ['coin', 'À VENDRE', 'yellow', `Valeur : ${fmt(a.it.v)}.`];
  return `<section class="section">${sectionTitle('À quoi ça sert ?')}
    <div class="card"><div style="display:flex;align-items:center;gap:10px"><span class="chip ${verdictTxt[2]}" style="font-size:13px;padding:7px 10px">${ICONS[verdictTxt[0]]} ${verdictTxt[1]}</span><span class="muted" style="font-size:13px">${verdictTxt[3]}</span></div>
    ${rows.length || craftRows.length ? `<div style="margin-top:8px">${rows.join('')}${craftRows.join('')}</div>` : ''}
    ${crafts.length > 12 ? `<p class="note">… et ${crafts.length - 12} autres fabrications.</p>` : ''}</div></section>`;
}

export function bindSteppers(root) {
  $$('.stepper', root).forEach((sp) => {
    const id = sp.dataset.id;
    const inp = sp.querySelector('input');
    const set = (v) => { store.setHave(id, v); inp.value = store.have(id); sp.dispatchEvent(new CustomEvent('changed', { bubbles: true, detail: { id } })); };
    sp.querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); set((+inp.value || 0) + +b.dataset.d); }));
    inp.addEventListener('change', () => set(inp.value));
  });
}
