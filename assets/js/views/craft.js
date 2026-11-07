// Planificateur de fabrication : arme/objet → matériaux → plan de raids
import { D, TYPE_FR, RARITY_FR, name, plain } from '../data.js';
import { familyOf, directCost, expandCost, farmPlan } from '../engine.js';
import { ICONS } from '../icons.js';
import { esc, fmt, thumb, itemRow, sectionTitle, stepper, costLine, $, $$, toast } from '../ui.js';
import { store } from '../store.js';
import { bindSteppers } from './item.js';
import { raidCards } from './list.js';

const benchName = (b) => D.db.benches[b] || b;

export function renderCraftHome(el, typeFilter = 'all') {
  const types = [...new Set(D.families.map((f) => f.t))];
  const fams = D.families.filter((f) => typeFilter === 'all' || f.t === typeFilter);
  el.innerHTML = `<div class="wrap fade-in">
    <div class="page-head"><div class="eyebrow">Fabrication</div><h1>Quelle arme veux-tu construire ?</h1>
      <p>Choisis l'arme et le palier : Tracker calcule les matériaux, ce qu'il te manque et où aller les chercher.</p></div>
    <div class="hscroll" style="margin-top:6px">
      <button class="pill ${typeFilter === 'all' ? 'on' : ''}" data-t="all">Toutes</button>
      ${types.map((t) => `<button class="pill ${typeFilter === t ? 'on' : ''}" data-t="${esc(t)}">${esc(TYPE_FR[t] || t)}</button>`).join('')}
    </div>
    <div class="list stagger" style="margin-top:10px">
      ${fams.map((f) => {
        const it = D.I[f.tiers[0]];
        return itemRow(it, { href: '#/craft/' + it.id, sub: `${esc(TYPE_FR[f.t] || f.t)} · ${f.tiers.length} palier${f.tiers.length > 1 ? 's' : ''} · ${it.bp ? 'schéma requis' : 'sans schéma'}`, end: `<span class="rar r-${it.r}">${RARITY_FR[it.r]}</span>` }).replace(esc(it.n), esc(f.base));
      }).join('')}
    </div>
    <section class="section">${sectionTitle('Autres fabrications')}
      <div class="searchbox" style="margin-top:0"><span class="s-ico">${ICONS.search}</span><input id="craft-q" placeholder="Accessoire, gadget, munitions…" autocomplete="off"/></div>
      <div id="craft-res" class="list" style="margin-top:10px"></div>
    </section>
  </div>`;
  $$('.pill[data-t]', el).forEach((p) => p.addEventListener('click', () => renderCraftHome(el, p.dataset.t)));
  const q = $('#craft-q', el), res = $('#craft-res', el);
  const craftables = D.db.items.filter((it) => it.rc && !it.wpn);
  q.addEventListener('input', () => {
    const p = plain(q.value);
    res.innerHTML = p ? craftables.filter((it) => plain(it.n + ' ' + it.en).includes(p)).slice(0, 20).map((it) => itemRow(it, { href: '#/craft/' + it.id, sub: `${esc(TYPE_FR[it.t] || it.t)} · ${(it.b || []).map(benchName).join(', ')}` })).join('') || '<div class="empty">Aucun résultat</div>' : '';
  });
}

export function renderCraft(el, id, tierIdx = null, qty = 1) {
  const it0 = D.I[id];
  if (!it0) { el.innerHTML = '<div class="wrap empty">Objet introuvable.</div>'; return; }
  const fam = it0.wpn ? familyOf(id) : null;
  const tIdx = fam ? (tierIdx ?? fam.tiers.indexOf(id)) : 0;
  const target = fam ? D.I[fam.tiers[tIdx]] : it0;
  const root = fam ? D.I[fam.tiers[0]] : it0;
  const expand = !!store.pref('expand');
  let cost = directCost(target.id, fam ? 1 : qty);
  if (expand) cost = expandCost(cost);
  const entries = Object.entries(cost).sort((a, b) => b[1] - a[1]);
  const needs = entries.map(([k, q]) => ({ id: k, q: Math.max(0, q - store.have(k)) }));
  const totalNeed = entries.reduce((a, [, q]) => a + q, 0);
  const totalHave = entries.reduce((a, [k, q]) => a + Math.min(q, store.have(k)), 0);
  const done = totalNeed ? totalHave / totalNeed : 1;
  const bench = (root.b || [])[0];
  const stLv = root.lv || 1;
  const st = D.S[bench];
  const req = st?.levels.find((l) => l.lv === stLv);
  const plan = farmPlan(needs);

  el.innerHTML = `<div class="wrap fade-in">
    <div class="item-hero">${thumb(target, 'lg')}<div style="min-width:0"><div class="eyebrow">Mission de fabrication</div><h1>${esc(fam ? fam.base : target.n)}</h1><div class="en">${esc(TYPE_FR[target.t] || target.t)} · <span class="rar r-${target.r}">${RARITY_FR[target.r]}</span></div></div></div>
    ${fam ? `<div class="tier-row" style="margin-top:6px">${fam.tiers.map((t, i) => `<button data-tier="${i}" class="${i === tIdx ? 'on' : ''}">${['I', 'II', 'III', 'IV', 'V'][i]}</button>`).join('')}</div>
      <p class="note">Palier ${['I', 'II', 'III', 'IV', 'V'][tIdx]} : ${tIdx ? 'fabrication du palier I + améliorations successives (coût cumulé).' : 'fabrication directe.'}</p>`
      : `<div class="row" style="margin-top:8px"><div class="r-main"><div class="r-title">Quantité à fabriquer</div><div class="r-sub">${target.cq > 1 ? `×${target.cq} par fabrication` : 'unités'}</div></div><span class="stepper" id="qty"><button data-d="-1">−</button><input type="number" value="${qty}" min="1"/><button data-d="1">+</button></span></div>`}

    <section class="section">${sectionTitle('Prérequis', '01')}
      <div class="stack">
        ${root.bp ? `<a class="row" href="#/item/${root.bp}">${thumb(D.I[root.bp])}<div class="r-main"><div class="r-title">${esc(D.I[root.bp].n)}</div><div class="r-sub">${store.have(root.bp) ? '<span style="color:var(--green)">✓ Possédé / appris</span>' : 'À trouver — touchez pour voir où'}</div></div><span class="chev">${ICONS.chev}</span></a>`
          : `<div class="row"><span class="thumb">${ICONS.check}</span><div class="r-main"><div class="r-title">Aucun schéma requis</div><div class="r-sub">Fabrication disponible directement</div></div></div>`}
        ${bench ? `<a class="row" href="#/stations">${'<span class="thumb">' + ICONS.station + '</span>'}<div class="r-main"><div class="r-title">${esc(benchName(bench))} — niveau ${stLv}</div><div class="r-sub">${req && req.req.length ? 'Pour ce niveau : ' + esc(costLine(Object.fromEntries(req.req))) : 'Disponible dès le départ'}</div></div><span class="chev">${ICONS.chev}</span></a>` : ''}
      </div>
    </section>

    <section class="section">${sectionTitle('Matériaux', '02', `<button id="expand">${expand ? 'Vue directe' : 'Décomposer'}</button>`)}
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"><b class="mono" style="font-size:13px">PROGRESSION</b><b class="mono" style="color:var(--teal)">${Math.round(done * 100)} %</b></div>
        <div class="progress"><i style="width:${done * 100}%"></i></div>
        <div style="margin-top:8px">${entries.map(([k, q]) => {
          const h = store.have(k);
          return `<div class="ing">${thumb(D.I[k], 'sm')}<a class="ing-n" href="#/item/${k}">${esc(name(k))}<small>${h >= q ? 'Complet' : `Il manque ${fmt(q - h)}`}</small></a>${stepper(k, h)}<span class="need ${h >= q ? 'done' : ''}">/ ${fmt(q)}</span></div>`;
        }).join('')}</div>
        ${expand ? '<p class="note">Les matériaux raffinés sont décomposés en matières premières (fabriquez-les au Raffineur).</p>' : ''}
      </div>
    </section>

    <section class="section">${sectionTitle('Plan de raids', '03')}
      ${needs.every((n) => n.q <= 0) ? `<div class="card hud" style="text-align:center"><b class="mono" style="color:var(--green)">TOUT EST PRÊT</b><p class="muted" style="margin:6px 0 0">Direction l'atelier : vous pouvez fabriquer ${esc(target.n)}.</p></div>`
        : raidCards(plan)}
    </section>

    <div style="margin-top:16px"><button id="add" class="btn ${store.inList(target.id) ? '' : 'primary'} block">${store.inList(target.id) ? ICONS.check + ' Dans ma liste' : ICONS.plus + ' Suivre dans ma liste'}</button>
    <a class="btn ghost block" style="margin-top:8px" href="#/item/${target.id}">Voir la fiche complète</a></div>
  </div>`;

  $$('[data-tier]', el).forEach((b) => b.addEventListener('click', () => renderCraft(el, id, +b.dataset.tier)));
  const qtyEl = $('#qty', el);
  if (qtyEl) {
    const inp = qtyEl.querySelector('input');
    qtyEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => renderCraft(el, id, null, Math.max(1, (+inp.value || 1) + +b.dataset.d))));
    inp.addEventListener('change', () => renderCraft(el, id, null, Math.max(1, +inp.value || 1)));
  }
  $('#expand', el).addEventListener('click', () => { store.setPref('expand', !expand); renderCraft(el, id, tIdx, qty); });
  $('#add', el).addEventListener('click', () => {
    if (store.inList(target.id)) store.removeFromList(target.id);
    else { store.addToList(target.id, fam ? 1 : qty); toast(`<b>${esc(target.n)}</b> suivi dans Ma liste.`); }
    renderCraft(el, id, tIdx, qty);
  });
  bindSteppers(el);
  el.firstElementChild.addEventListener('changed', () => { const y = window.scrollY; renderCraft(el, id, tIdx, qty); window.scrollTo(0, y); });
}
