// Plus : atelier, bestiaire ARC, événements, quêtes, à propos / mises à jour / installation
import { D, name, TRADERS } from '../data.js';
import { ICONS } from '../icons.js';
import { esc, fmt, thumb, sectionTitle, mapName, $, toast } from '../ui.js';
import { store } from '../store.js';
import { botMini } from './item.js';
import { APP_VERSION } from '../version.js';
import { check, cmpVer } from '../update.js';

export function renderMore(el, installAvailable) {
  const L = (href, ico, t, s) => `<a class="row" href="${href}"><span class="thumb sm" style="--rc:var(--accent)">${ICONS[ico]}</span><div class="r-main"><div class="r-title">${t}</div><div class="r-sub">${s}</div></div><span class="chev">${ICONS.chev}</span></a>`;
  el.innerHTML = `<div class="wrap fade-in">
    <div class="page-head"><div class="eyebrow">Plus</div><h1>Base de Speranza</h1></div>
    <div class="list stagger">
      ${L('#/stations', 'station', 'Atelier', 'Ce qu’il faut pour chaque niveau d’établi')}
      ${L('#/bots', 'ARC', 'Bestiaire ARC', `${D.db.bots.length} machines, points faibles et butin`)}
      ${L('#/events', 'bolt', 'Conditions de carte', 'Nuit, tempête, bunker, portail verrouillé…')}
      ${L('#/quests', 'quest', 'Quêtes', `${D.db.quests.length} quêtes et leurs récompenses`)}
      ${L('#/browse/key', 'key', 'Clés', 'Clés de salles fermées')}
      ${L('#/browse/gear', 'backpack', 'Équipement', 'Accessoires, augmentations, boucliers, gadgets')}
      ${L('#/about', 'info', 'À propos & mises à jour', `Version ${APP_VERSION} · sources et crédits`)}
    </div>
    ${installAvailable ? `<button id="install" class="btn primary block" style="margin-top:16px">${ICONS.phone} Installer l'application</button>` : ''}
  </div>`;
}

export function renderStations(el) {
  el.innerHTML = `<div class="wrap fade-in">
    <div class="page-head"><div class="eyebrow">Atelier</div><h1>Améliorer l'atelier</h1><p>Touchez un niveau pour suivre tous ses matériaux dans Ma liste.</p></div>
    ${D.db.stations.map((s) => `<section class="section">${sectionTitle(s.n)}
      <div class="stack">${s.levels.filter((l) => l.req.length).map((l) => `<div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><b class="mono">NIVEAU ${l.lv}</b>
        <button class="btn small" data-add='${esc(JSON.stringify(l.req))}'>${ICONS.plus} Suivre</button></div>
        <div style="margin-top:6px">${l.req.map(([k, q]) => `<a class="ing" href="#/item/${k}">${thumb(D.I[k], 'sm')}<span class="ing-n">${esc(name(k))}<small>${store.have(k) >= q ? 'Complet ✓' : `Possédé : ${fmt(store.have(k))}`}</small></span><span class="ing-q">×${q}</span></a>`).join('')}</div>
      </div>`).join('')}</div></section>`).join('')}
  </div>`;
  el.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
    JSON.parse(b.dataset.add).forEach(([k, q]) => { const e = store.inList(k); store.addToList(k, Math.max(q, e ? e.q : 0)); });
    toast('Matériaux ajoutés à <b>Ma liste</b>.');
  }));
}

export function renderBots(el) {
  el.innerHTML = `<div class="wrap fade-in"><div class="page-head"><div class="eyebrow">Bestiaire</div><h1>Les ARC</h1><p>Points faibles, cartes et butin de chaque machine.</p></div>
    ${D.db.bots.slice().sort((a, b) => a.lvl - b.lvl).map((b) => `${botMini(b)}<div class="chips" style="margin:6px 0 14px 4px">${b.drops.map((d) => `<a class="chip" href="#/item/${d}">${esc(name(d))}</a>`).join('')}</div>`).join('')}
  </div>`;
}

export function renderEvents(el) {
  const maps = (id) => D.db.maps.filter((m) => m.events.includes(id)).map((m) => m.n);
  el.innerHTML = `<div class="wrap fade-in"><div class="page-head"><div class="eyebrow">Conditions</div><h1>Conditions de carte</h1><p>Elles changent le butin et le danger : choisissez-les en fonction de ce que vous cherchez.</p></div>
    <div class="stack">${D.db.events.filter((e) => !e.off).map((e) => `<div class="card ${e.major ? 'hud' : ''}"><div style="display:flex;justify-content:space-between;gap:8px"><b class="mono">${esc(e.n)}</b>${e.major ? '<span class="chip accent">Majeure</span>' : '<span class="chip">Mineure</span>'}</div>
      <p style="margin:6px 0 0;color:var(--text-2);font-size:14px">${esc(e.desc)}</p>${maps(e.id).length ? `<div class="chips" style="margin-top:8px">${maps(e.id).map((m) => `<span class="chip teal">${esc(m)}</span>`).join('')}</div>` : ''}</div>`).join('')}</div>
    <p class="note">Les conditions désactivées dans les données du jeu ne sont pas affichées.</p>
  </div>`;
}

export function renderQuests(el) {
  const byTrader = {};
  D.db.quests.forEach((q) => (byTrader[q.tr] = byTrader[q.tr] || []).push(q));
  el.innerHTML = `<div class="wrap fade-in"><div class="page-head"><div class="eyebrow">Quêtes</div><h1>Quêtes</h1></div>
    ${Object.entries(byTrader).map(([t, qs]) => `<section class="section">${sectionTitle(t, String(qs.length).padStart(2, '0'))}<div class="list">${qs.map((q) => `<a class="row" href="#/quest/${q.id}"><div class="r-main"><div class="r-title">${esc(q.n)}</div><div class="r-sub">${q.maps.map(mapName).map(esc).join(', ') || 'Toutes cartes'} · ${q.rew.length} récompense(s)</div></div><span class="chev">${ICONS.chev}</span></a>`).join('')}</div></section>`).join('')}
  </div>`;
}

export function renderQuest(el, id) {
  const q = D.Q[id];
  if (!q) { el.innerHTML = '<div class="wrap empty">Quête introuvable.</div>'; return; }
  const rows = (arr) => arr.map(([k, n]) => `<a class="ing" href="#/item/${k}">${thumb(D.I[k], 'sm')}<span class="ing-n">${esc(name(k))}</span><span class="ing-q">×${n}</span></a>`).join('');
  el.innerHTML = `<div class="wrap fade-in"><div class="page-head"><div class="eyebrow">Quête · ${esc(q.tr)}</div><h1>${esc(q.n)}</h1>
    <p>${esc(TRADERS[q.tr] || '')}</p></div>
    ${q.maps.length ? `<div class="chips">${q.maps.map((m) => `<a class="chip teal" href="#/maps/${m}">${esc(mapName(m))}</a>`).join('')}</div>` : ''}
    <section class="section">${sectionTitle('Objectifs', String(q.obj.length).padStart(2, '0'))}<div class="card hud steps">${q.obj.map((o, i) => `<div class="step"><div class="s-n">${i + 1}</div><div class="s-b"><div class="s-d" style="margin-top:2px">${esc(o)}</div></div></div>`).join('')}</div></section>
    ${q.req.length ? `<section class="section">${sectionTitle('Objets à livrer')}<div class="card">${rows(q.req)}</div></section>` : ''}
    ${q.grant.length ? `<section class="section">${sectionTitle('Objets fournis')}<div class="card">${rows(q.grant)}</div></section>` : ''}
    ${q.rew.length ? `<section class="section">${sectionTitle('Récompenses')}<div class="card">${rows(q.rew)}</div></section>` : ''}
    ${q.prev.length ? `<section class="section">${sectionTitle('Débloquée après')}<div class="list">${q.prev.filter((p) => D.Q[p]).map((p) => `<a class="row" href="#/quest/${p}"><div class="r-main"><div class="r-title">${esc(D.Q[p].n)}</div></div><span class="chev">${ICONS.chev}</span></a>`).join('')}</div></section>` : ''}
  </div>`;
}

export function renderAbout(el) {
  el.innerHTML = `<div class="wrap fade-in">
    <div class="page-head"><div class="eyebrow">À propos</div><h1>Tracker</h1><p>Le compagnon de pillage qui transforme « il me manque ça » en itinéraire.</p></div>
    <div class="card hud">
      <dl class="kv"><dt>Version de l'app</dt><dd>${APP_VERSION}</dd><dt>Données de jeu</dt><dd>${esc(D.db.meta.dataDate)}</dd><dt>Base générée le</dt><dd>${esc(D.db.meta.built)}</dd><dt>Objets</dt><dd>${D.db.items.length}</dd><dt>Signalements de schémas</dt><dd>${fmt(D.db.meta.bpReports)}</dd></dl>
      <button id="chk" class="btn block" style="margin-top:14px">${ICONS.update} Vérifier les mises à jour</button>
      <p id="chk-r" class="note hidden"></p>
    </div>
    <section class="section">${sectionTitle('Comment ça marche')}
      <div class="card"><p style="margin:0;color:var(--text-2);font-size:14.5px">Pour chaque objet, Tracker croise : les types de butin où il apparaît, les zones de chaque carte et leur valeur (rouge/jaune), les ARC qui le lâchent, les recettes, le recyclage, les marchands, les quêtes et les signalements de la communauté. Il en déduit la meilleure méthode, la carte, l'itinéraire et un indice de chance. Le butin du jeu reste aléatoire : l'indice est une estimation, pas une garantie.</p></div>
    </section>
    <section class="section">${sectionTitle('Installer sur mon téléphone')}
      <div class="card"><p style="margin:0;color:var(--text-2);font-size:14.5px"><b>Android (Chrome)</b> : menu ⋮ → « Installer l'application ».<br/><b>iPhone (Safari)</b> : bouton Partager → « Sur l'écran d'accueil ».<br/>L'app fonctionne ensuite hors-ligne et se met à jour via le bandeau en haut de l'écran.</p></div>
    </section>
    <section class="section">${sectionTitle('Sources & crédits')}
      <div class="card"><p style="margin:0;color:var(--text-2);font-size:14px">
        Données d'objets, recettes, ARC, quêtes et atelier : <a href="https://github.com/RaidTheory/arcraiders-data">RaidTheory/arcraiders-data</a> (licence MIT) — <a href="https://arctracker.io">arctracker.io</a>.<br/>
        Zones et types de butin : relevés communautaires de la carte du jeu. Signalements de schémas : agrégés à partir de relevés communautaires.<br/>
        Polices : Chakra Petch et Barlow (SIL Open Font License). Icônes et plans schématiques : créations originales.<br/><br/>
        ARC Raiders est une marque d'Embark Studios AB. Tracker est un projet de fans, non affilié à Embark Studios et non approuvé par eux. Tous les contenus du jeu (noms, objets) appartiennent à leurs propriétaires.</p></div>
    </section>
  </div>`;
  $('#chk', el).addEventListener('click', async () => {
    const r = $('#chk-r', el);
    r.classList.remove('hidden');
    r.textContent = 'Vérification…';
    const v = await check();
    r.textContent = !v ? 'Impossible de joindre le serveur (hors-ligne ?).' : cmpVer(v.version, APP_VERSION) > 0 ? `Version ${v.version} disponible : touchez le bandeau en haut de l'écran.` : 'Vous avez la dernière version ✓';
  });
}
