// Cartes : plan schématique, filtres par type de butin, fiche de zone
import { D, CAT_FR, CATS, RARITY_ORDER, kind } from '../data.js';
import { tierLabel } from '../engine.js';
import { ICONS, icon } from '../icons.js';
import { esc, fmt, itemRow, catChip, tierChip, sectionTitle, openSheet, $, $$ } from '../ui.js';
import { mapBox } from '../mapsvg.js';
import { botMini } from './item.js';

export function renderMaps(el, mapId, cat = null) {
  const map = D.M[mapId] || D.db.maps[0];
  const cats = CATS.filter((c) => map.pois.some((p) => (p.tags || []).includes(c)));
  const focus = cat ? new Set(map.pois.filter((p) => (p.tags || []).includes(cat)).map((p) => p.en)) : null;
  const pois = map.pois.slice().sort((a, b) => (b.tier === 'high') - (a.tier === 'high') || (b.tier === 'medium') - (a.tier === 'medium') || (b.tags?.length || 0) - (a.tags?.length || 0));
  const shown = cat ? pois.filter((p) => (p.tags || []).includes(cat)) : pois.filter((p) => p.tags?.length);
  const unplaced = map.pois.filter((p) => p.x == null);

  el.innerHTML = `<div class="wrap fade-in">
    <div class="page-head"><div class="eyebrow">Cartes</div><h1>${esc(map.full)}</h1></div>
    <div class="hscroll">${D.db.maps.map((m) => `<a class="pill ${m.id === map.id ? 'on' : ''}" href="#/maps/${m.id}">${esc(m.n)}</a>`).join('')}</div>
    <div class="card" style="margin-top:10px">
      <p style="margin:0;color:var(--text-2)">${esc(map.desc)}</p>
      <div class="chips" style="margin-top:10px"><span class="chip accent">Difficulté ${'◆'.repeat(map.diff || 1)}${'◇'.repeat(5 - (map.diff || 1))}</span><span class="chip">${esc(map.len || '30 min')}</span>${map.str.map((s) => `<span class="chip teal">${esc(s)}</span>`).join('')}</div>
    </div>
    <div class="hscroll" style="margin-top:12px">
      <button class="pill ${!cat ? 'on' : ''}" data-cat="">Toutes les zones</button>
      ${cats.map((c) => `<button class="pill ${cat === c ? 'on' : ''}" data-cat="${esc(c)}">${icon(c)}${esc(CAT_FR[c])}</button>`).join('')}
    </div>
    <div style="margin-top:10px">${mapBox(map, { focus, labels: focus ? 'focus' : 'tagged' })}</div>
    <p class="note">Touchez un losange pour voir la zone. Positions relatives relevées par la communauté — plan non officiel, non à l'échelle.</p>

    <section class="section">${sectionTitle(cat ? 'Zones ' + CAT_FR[cat] : 'Zones de butin', String(shown.length).padStart(2, '0'))}
      <div class="list">${shown.map((p) => poiRow(p)).join('') || '<div class="empty">Aucune zone de ce type sur cette carte.</div>'}</div>
      ${!cat && unplaced.length ? `<p class="note">${unplaced.length} zone(s) sans position relevée (niveau supérieur ou relevé incomplet) : ${unplaced.map((p) => esc(p.n)).join(', ')}.</p>` : ''}
    </section>

    ${map.events.length ? `<section class="section">${sectionTitle('Conditions & événements')}<div class="stack">${map.events.map((e) => D.E[e] ? `<div class="card"><b class="mono">${esc(D.E[e].n)}</b><p style="margin:6px 0 0;color:var(--text-2);font-size:14px">${esc(D.E[e].desc)}</p></div>` : '').join('')}</div></section>` : ''}
    ${map.bots.length ? `<section class="section">${sectionTitle('ARC présents', String(map.bots.length).padStart(2, '0'))}${map.bots.map((b) => D.B[b]).sort((a, b) => a.lvl - b.lvl).map(botMini).join('')}</section>` : ''}
  </div>`;

  $$('[data-cat]', el).forEach((b) => b.addEventListener('click', () => renderMaps(el, map.id, b.dataset.cat || null)));
  $$('.poi-pin', el).forEach((g) => g.addEventListener('click', () => poiSheet(map, g.dataset.poi)));
  $$('[data-poirow]', el).forEach((r) => r.addEventListener('click', () => poiSheet(map, r.dataset.poirow)));
}

function poiRow(p) {
  return `<button class="row" data-poirow="${esc(p.en)}" style="text-align:left;width:100%">
    <span class="thumb sm" style="--rc:${p.tier === 'high' ? 'var(--red)' : p.tier === 'medium' ? 'var(--yellow)' : 'var(--text-2)'}">${ICONS.pin}</span>
    <span class="r-main"><span class="r-title" style="display:block">${esc(p.n)}</span><span class="r-sub" style="display:block">${(p.tags || []).map((t) => CAT_FR[t]).join(' · ') || 'Lieu-dit'} · ${tierLabel(p.tier)}</span></span>
    <span class="chev">${ICONS.chev}</span></button>`;
}

function poiSheet(map, en) {
  const p = map.pois.find((x) => x.en === en);
  if (!p) return;
  const tags = p.tags || [];
  // objets typiques : butin des bons types, du plus rare au plus commun
  const typical = tags.length ? D.db.items.filter((it) => (it.f || []).some((c) => tags.includes(c)) && !['trinket'].includes(kind(it)))
    .sort((a, b) => RARITY_ORDER.indexOf(b.r) - RARITY_ORDER.indexOf(a.r) || (b.v || 0) - (a.v || 0)).slice(0, 8) : [];
  const bps = Object.entries(D.db.bpr).map(([id, r]) => ({ id, n: (r.poi.find(([m, z]) => m === map.id && z === p.en) || [])[2] || 0 }))
    .filter((x) => x.n).sort((a, b) => b.n - a.n).slice(0, 8);
  openSheet(`<div class="eyebrow">${esc(map.n)}</div>
    <h2 style="font-size:22px;margin-top:8px">${esc(p.n)}</h2>${p.en !== p.n ? `<div class="muted" style="font-size:13px">${esc(p.en)}</div>` : ''}
    <div class="chips" style="margin-top:10px">${tierChip(p.tier)}${tags.map((t) => catChip(t)).join('') || '<span class="chip">Pas de type de butin affiché</span>'}</div>
    ${typical.length ? `<div class="section">${sectionTitle('Butin typique ici')}<div class="list">${typical.map((it) => itemRow(it)).join('')}</div></div>` : ''}
    ${bps.length ? `<div class="section">${sectionTitle('Schémas signalés ici')}<div class="list">${bps.map((b) => itemRow(D.I[b.id], { end: `${b.n}<small>FOIS</small>` })).join('')}</div></div>` : ''}
  `);
}
