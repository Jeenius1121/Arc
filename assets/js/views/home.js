// Accueil + recherche + navigation par catégorie
import { D, KIND_FR, TYPE_FR, RARITY_FR, CAT_FR, kind, search, plain, RARITY_ORDER } from '../data.js';
import { ICONS, icon } from '../icons.js';
import { esc, itemRow, sectionTitle, $, $$ } from '../ui.js';
import { store } from '../store.js';
import { nextRaidCard } from './list.js';

const KEY_MATERIALS = ['mechanical_components', 'advanced_mechanical_components', 'electrical_components', 'advanced_electrical_components', 'steel_spring', 'simple_gun_parts', 'medium_gun_parts', 'heavy_gun_parts', 'light_gun_parts', 'complex_gun_parts', 'magnetic_accelerator', 'arc_alloy'];

export function renderHome(el) {
  const recent = store.get().recent.map((id) => D.I[id]).filter(Boolean).slice(0, 5);
  el.innerHTML = `<div class="wrap">
    <div class="hero fade-in">
      <div class="kicker">Compagnon de pillage · Speranza</div>
      <h1>Dis-moi ce qu'il te manque.<br/><em>Je te dis où aller.</em></h1>
      <p>Un matériau, un schéma, une arme à fabriquer : Tracker trouve la meilleure carte, les bonnes zones et l'itinéraire.</p>
    </div>
    <div class="searchbox"><span class="s-ico">${ICONS.search}</span>
      <input id="q" type="search" placeholder="Ex. : ressort, Bettina, schéma…" autocomplete="off" enterkeyhint="search" aria-label="Rechercher un objet"/>
      <button class="s-clear hidden" id="qx" aria-label="Effacer">${ICONS.close}</button></div>
    <div id="results" class="list" style="margin-top:12px"></div>
    <div id="home-main">
      <div class="intents stagger">
        <a class="intent" href="#/craft"><span class="i-ico">${ICONS.weapon}</span><b>Fabriquer une arme</b><span>Matériaux, paliers et plan de raids</span></a>
        <a class="intent" href="#/browse/material"><span class="i-ico">${ICONS.material}</span><b>Trouver un matériau</b><span>Meilleure carte, zones, conteneurs</span></a>
        <a class="intent" href="#/browse/blueprint"><span class="i-ico">${ICONS.blueprint}</span><b>Chercher un schéma</b><span>D'après ${D.db.meta.bpReports.toLocaleString('fr-FR')} trouvailles</span></a>
        <a class="intent" href="#/browse/arc"><span class="i-ico">${ICONS.ARC}</span><b>Pièces ARC</b><span>Quel ARC abattre et où</span></a>
        <a class="intent teal" href="#/stations"><span class="i-ico">${ICONS.station}</span><b>Améliorer l'atelier</b><span>Ce qu'il faut pour chaque niveau</span></a>
        <a class="intent teal" href="#/browse/recyclable"><span class="i-ico">${ICONS.recycle}</span><b>Garder ou recycler ?</b><span>Le verdict pour chaque objet</span></a>
        <a class="intent wide" href="#/maps"><span class="i-ico">${ICONS.map}</span><div><b>Cartes & zones de butin</b><br/><span>${D.db.maps.length} cartes, ${D.db.maps.reduce((a, m) => a + m.pois.length, 0)} zones classées par type de butin</span></div></a>
      </div>
      ${nextRaidCard()}
      ${recent.length ? `<section class="section">${sectionTitle('Consultés récemment')}<div class="list">${recent.map((it) => itemRow(it)).join('')}</div></section>` : ''}
      <section class="section">${sectionTitle('Matériaux les plus demandés')}<div class="chips">${KEY_MATERIALS.filter((id) => D.I[id]).map((id) => `<a class="chip" style="padding:7px 10px;font-size:12.5px" href="#/item/${id}">${icon(kindIcon(D.I[id]))}${esc(D.I[id].n)}</a>`).join('')}</div></section>
      <p class="foot">Tracker est une application de fans, non officielle.<br/>Données de jeu : ${esc(D.db.meta.dataDate)} · <a href="#/about">Sources & crédits</a></p>
    </div>
  </div>`;

  const q = $('#q', el), res = $('#results', el), main = $('#home-main', el), qx = $('#qx', el);
  const run = () => {
    const v = q.value.trim();
    qx.classList.toggle('hidden', !v);
    main.classList.toggle('hidden', !!v);
    if (!v) { res.innerHTML = ''; return; }
    const found = search(v, 30);
    res.innerHTML = found.length ? found.map((it) => itemRow(it)).join('') : `<div class="empty">${ICONS.search}<p>Aucun objet ne correspond à « ${esc(v)} ».</p></div>`;
  };
  q.addEventListener('input', run);
  qx.addEventListener('click', () => { q.value = ''; run(); q.focus(); });
}

const kindIcon = (it) => (it.f && it.f[0]) || 'material';

const BROWSE = {
  material: { t: 'Matériaux', k: ['material'], d: 'Composants, pièces d’armes et matières premières.' },
  blueprint: { t: 'Schémas', k: ['blueprint'], d: 'Où les joueurs les trouvent, quand, et dans quels conteneurs.' },
  arc: { t: 'Pièces ARC', k: ['arc'], d: 'Ce que lâchent les machines — et lesquelles chasser.' },
  recyclable: { t: 'Garder ou recycler ?', k: ['recyclable', 'trinket', 'nature'], d: 'Chaque fiche indique : à garder, à recycler ou à vendre.' },
  weapon: { t: 'Armes', k: ['weapon'], d: '' },
  gear: { t: 'Équipement', k: ['mod', 'augment', 'shield', 'consumable', 'ammo'], d: 'Accessoires, augmentations, boucliers, gadgets.' },
  key: { t: 'Clés', k: ['key'], d: 'Clés de salles fermées, par carte.' },
};

export function renderBrowse(el, k, filter = '') {
  const def = BROWSE[k] || BROWSE.material;
  const all = D.db.items.filter((it) => def.k.includes(kind(it)) && !(kind(it) === 'weapon' && /\s(II|III|IV)$/.test(it.n)));
  const sort = (a, b) => RARITY_ORDER.indexOf(a.r) - RARITY_ORDER.indexOf(b.r) || a.n.localeCompare(b.n, 'fr');
  el.innerHTML = `<div class="wrap fade-in">
    <div class="page-head"><div class="eyebrow">${esc(def.t)}</div><h1>${esc(def.t)}</h1>${def.d ? `<p>${esc(def.d)}</p>` : ''}</div>
    <div class="hscroll">${Object.entries(BROWSE).map(([key, v]) => `<a class="pill ${key === k ? 'on' : ''}" href="#/browse/${key}">${esc(v.t)}</a>`).join('')}</div>
    <div class="searchbox" style="margin-top:10px"><span class="s-ico">${ICONS.search}</span><input id="bq" placeholder="Filtrer…" value="${esc(filter)}" autocomplete="off"/></div>
    <div id="bl" class="list" style="margin-top:10px"></div>
  </div>`;
  const bl = $('#bl', el), bq = $('#bq', el);
  const draw = () => {
    const p = plain(bq.value);
    const items = all.filter((it) => !p || plain(it.n + ' ' + it.en).includes(p)).sort(sort);
    bl.innerHTML = items.map((it) => itemRow(it, k === 'blueprint' ? { end: D.db.bpr[it.id]?.n ? `${D.db.bpr[it.id].n}<small>TROUVÉS</small>` : '<small>RARE</small>' } : {})).join('') || '<div class="empty">Aucun résultat</div>';
  };
  bq.addEventListener('input', draw);
  draw();
}
