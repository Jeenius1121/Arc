// Ma liste : objectifs suivis + plan de raids combiné
import { D, kind, name, TYPE_FR, CAT_FR } from '../data.js';
import { directCost, farmPlan, analyze } from '../engine.js';
import { ICONS } from '../icons.js';
import { esc, fmt, thumb, sectionTitle, stepper, $, $$ } from '../ui.js';
import { store } from '../store.js';
import { bindSteppers } from './item.js';

const CRAFT_KINDS = new Set(['weapon', 'mod', 'augment', 'shield', 'consumable', 'ammo']);

// besoins agrégés de la liste (les armes/équipements sont décomposés en matériaux)
export function listNeeds() {
  const need = {};
  for (const e of store.get().list) {
    const it = D.I[e.id];
    if (!it) continue;
    const k = kind(it);
    if (CRAFT_KINDS.has(k) && (it.rc || it.up) && store.have(e.id) < e.q) {
      for (const [m, q] of Object.entries(directCost(e.id, e.q - store.have(e.id)))) need[m] = (need[m] || 0) + q;
    } else need[e.id] = (need[e.id] || 0) + e.q;
  }
  return Object.entries(need).map(([id, q]) => ({ id, total: q, q: Math.max(0, q - store.have(id)) }));
}

export function raidCards(plan, { compact = false } = {}) {
  if (!plan.raids.length && !plan.other.length) return '<div class="empty">Rien à chercher.</div>';
  const raids = plan.raids.map((r, i) => `<div class="raid fade-in" style="--h:${r.map.hue}">
    <div class="raid-h"><span class="thumb sm" style="--rc:hsl(${r.map.hue} 80% 60%)">${ICONS.map}</span>
      <div style="flex:1;min-width:0"><div class="raid-n">RAID ${i + 1}</div><div class="raid-m">${esc(r.map.n)}</div></div>
      <a class="btn small" href="#/maps/${r.map.id}">Plan</a></div>
    <div class="raid-b">
      ${r.items.map((n) => `<a class="ing" href="#/item/${n.id}">${thumb(D.I[n.id], 'sm')}<span class="ing-n">${esc(name(n.id))}<small>${n.a.primary === 'arc' ? 'Sur les ARC' : n.a.kind === 'blueprint' ? 'Schéma — fouille large' : (n.a.cats || []).map((c) => CAT_FR[c]).join(' / ')}</small></span><span class="ing-q">×${fmt(n.q)}</span></a>`).join('')}
      ${!compact && r.route.length ? `<p class="note" style="margin-top:10px"><b>Itinéraire :</b> ${r.route.map((x, j) => `${'①②③④⑤'[j]} ${esc(x.p.n)}`).join(' → ')}</p>` : ''}
      ${!compact && r.bots.length ? `<p class="note"><b>ARC à abattre :</b> ${r.bots.map((b) => esc(D.B[b].n)).join(', ')}</p>` : ''}
    </div></div>`).join('');
  const other = plan.other.length ? `<div class="raid" style="--h:170"><div class="raid-h"><span class="thumb sm" style="--rc:var(--teal)">${ICONS.craft}</span><div style="flex:1"><div class="raid-n">À SPERANZA</div><div class="raid-m">Fabriquer / acheter</div></div></div>
    <div class="raid-b">${plan.other.map((n) => `<a class="ing" href="#/item/${n.id}">${thumb(D.I[n.id], 'sm')}<span class="ing-n">${esc(name(n.id))}<small>${n.a.primary === 'craft' ? 'Fabrication' : n.a.primary === 'buy' ? 'Marchand : ' + esc(n.a.vendors[0].trader) : n.a.primary === 'quest' ? 'Quête' : 'Voir la fiche'}</small></span><span class="ing-q">×${fmt(n.q)}</span></a>`).join('')}</div></div>` : '';
  return raids + other;
}

export function renderList(el) {
  const list = store.get().list;
  if (!list.length) {
    el.innerHTML = `<div class="wrap fade-in"><div class="page-head"><div class="eyebrow">Ma liste</div><h1>Rien à traquer… pour l'instant</h1></div>
      <div class="card hud empty">${ICONS.list}<p>Ajoutez une arme, un matériau ou un schéma avec <b>« Ajouter à ma liste »</b>.<br/>Tracker fusionne tout en un seul plan de raids.</p>
      <a class="btn primary" href="#/">Chercher un objet</a></div></div>`;
    return;
  }
  const needs = listNeeds();
  const plan = farmPlan(needs);
  const total = needs.reduce((a, n) => a + n.total, 0);
  const have = needs.reduce((a, n) => a + Math.min(n.total, store.have(n.id)), 0);
  el.innerHTML = `<div class="wrap fade-in">
    <div class="page-head"><div class="eyebrow">Ma liste</div><h1>${list.length} objectif${list.length > 1 ? 's' : ''} en cours</h1>
      <p>Tout est fusionné : Tracker calcule les raids qui couvrent le plus de besoins à la fois.</p></div>
    <div class="card"><div style="display:flex;justify-content:space-between"><b class="mono" style="font-size:13px">PROGRESSION GLOBALE</b><b class="mono" style="color:var(--teal)">${total ? Math.round((have / total) * 100) : 100} %</b></div>
      <div class="progress" style="margin-top:8px"><i style="width:${total ? (have / total) * 100 : 100}%"></i></div></div>

    <section class="section">${sectionTitle('Objectifs', '01')}
      <div class="list">${list.map((e) => {
        const it = D.I[e.id];
        if (!it) return '';
        return `<div class="row">${thumb(it)}<a class="r-main" href="#/item/${it.id}"><div class="r-title">${esc(it.n)}</div><div class="r-sub">${esc(TYPE_FR[it.t] || it.t)} · objectif ×${e.q}</div></a>
          <button class="icon-btn" data-del="${it.id}" aria-label="Retirer">${ICONS.trash}</button></div>`;
      }).join('')}</div>
    </section>

    <section class="section">${sectionTitle('À récupérer', '02')}
      <div class="card">${needs.sort((a, b) => b.q - a.q).map((n) => `<div class="ing">${thumb(D.I[n.id], 'sm')}<a class="ing-n" href="#/item/${n.id}">${esc(name(n.id))}<small>${n.q ? `Il manque ${fmt(n.q)}` : 'Complet ✓'}</small></a>${stepper(n.id, store.have(n.id))}<span class="need ${n.q ? '' : 'done'}">/ ${fmt(n.total)}</span></div>`).join('')}</div>
    </section>

    <section class="section">${sectionTitle('Plan de raids', '03')}${needs.every((n) => !n.q) ? '<div class="card hud empty"><b style="color:var(--green)">Tout est réuni !</b><p>Direction l’atelier.</p></div>' : raidCards(plan)}</section>
    <button id="clear" class="btn ghost block" style="margin-top:18px">${ICONS.trash} Vider la liste</button>
  </div>`;
  $$('[data-del]', el).forEach((b) => b.addEventListener('click', () => { store.removeFromList(b.dataset.del); renderList(el); }));
  $('#clear', el).addEventListener('click', () => { if (confirm('Vider toute la liste ?')) { store.clearList(); renderList(el); } });
  bindSteppers(el);
  el.firstElementChild.addEventListener('changed', () => { const y = window.scrollY; renderList(el); window.scrollTo(0, y); });
}

// carte « Prochain raid » pour l'accueil
export function nextRaidCard() {
  if (!store.get().list.length) return '';
  const plan = farmPlan(listNeeds());
  const r = plan.raids[0];
  if (!r) return '';
  return `<section class="section">${sectionTitle('Ton prochain raid', null, '<a href="#/list">Ma liste</a>')}${raidCards({ raids: [r], other: [] }, { compact: false })}</section>`;
}
