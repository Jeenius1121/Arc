// Tracker — point d'entrée : coque de l'app + routeur
import { loadDB, D } from './data.js';
import { ICONS, BRAND } from './icons.js';
import { $, $$, toast } from './ui.js';
import { store, onStore } from './store.js';
import { initUpdates } from './update.js';
import { renderHome, renderBrowse } from './views/home.js';
import { renderItem } from './views/item.js';
import { renderCraftHome, renderCraft } from './views/craft.js';
import { renderMaps } from './views/maps.js';
import { renderList } from './views/list.js';
import { renderMore, renderStations, renderBots, renderEvents, renderQuests, renderQuest, renderAbout } from './views/more.js';

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });

function shell() {
  document.getElementById('app').innerHTML = `
    <header class="topbar"><div class="wrap">
      <button class="icon-btn back-btn hidden" id="back" aria-label="Retour">${ICONS.back}</button>
      <a class="brand" href="#/">${BRAND}<span>TRACKER<small>RAIDER COMPANION</small></span></a>
      <span class="spacer"></span>
      <a class="icon-btn" href="#/" id="search-btn" aria-label="Rechercher">${ICONS.search}</a>
    </div></header>
    <main id="view"></main>
    <nav class="bottomnav"><div class="wrap">
      <a href="#/" data-nav="home">${ICONS.home}Accueil</a>
      <a href="#/craft" data-nav="craft">${ICONS.craft}Fabriquer</a>
      <a href="#/maps" data-nav="maps">${ICONS.map}Cartes</a>
      <a href="#/list" data-nav="list">${ICONS.list}Ma liste<span class="badge hidden" id="list-badge"></span></a>
      <a href="#/more" data-nav="more">${ICONS.more}Plus</a>
    </div></nav>`;
  $('#back').addEventListener('click', () => (history.length > 1 ? history.back() : (location.hash = '#/')));
  $('#search-btn').addEventListener('click', () => setTimeout(() => $('#q')?.focus(), 60));
  updateBadge();
  onStore(updateBadge);
}

function updateBadge() {
  const n = store.get().list.length;
  const b = $('#list-badge');
  if (!b) return;
  b.textContent = n;
  b.classList.toggle('hidden', !n);
}

const ROOT_TABS = { '': 'home', craft: 'craft', maps: 'maps', list: 'list', more: 'more' };

function route() {
  const view = $('#view');
  const hash = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [path, arg] = [hash.split('/')[0], hash.split('/').slice(1).join('/')];
  const tab = ROOT_TABS[path] || { item: null, browse: 'home', stations: 'more', bots: 'more', events: 'more', quests: 'more', quest: 'more', about: 'more' }[path];
  $$('.bottomnav a').forEach((a) => a.classList.toggle('on', a.dataset.nav === tab));
  $('#back').classList.toggle('hidden', !arg && path in ROOT_TABS);
  window.scrollTo(0, 0);

  switch (path) {
    case '': renderHome(view); break;
    case 'item': renderItem(view, arg); break;
    case 'browse': renderBrowse(view, arg || 'material'); break;
    case 'craft': arg ? renderCraft(view, arg) : renderCraftHome(view); break;
    case 'maps': renderMaps(view, arg || D.db.maps[0].id); break;
    case 'list': renderList(view); break;
    case 'more':
      renderMore(view, !!deferredInstall);
      $('#install')?.addEventListener('click', async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; route(); });
      break;
    case 'stations': renderStations(view); break;
    case 'bots': renderBots(view); break;
    case 'events': renderEvents(view); break;
    case 'quests': renderQuests(view); break;
    case 'quest': renderQuest(view, arg); break;
    case 'about': renderAbout(view); break;
    default: renderHome(view);
  }
}

async function boot() {
  shell();
  const view = $('#view');
  view.innerHTML = `<div class="wrap empty" style="padding-top:80px">${BRAND.replace('class="brand-mark"', 'style="width:64px;height:64px;margin:0 auto 14px;animation:spin 3s linear infinite"')}<p class="mono">CHARGEMENT DES DONNÉES…</p></div>`;
  initUpdates();
  try {
    await loadDB('data/db.json');
  } catch (e) {
    view.innerHTML = '<div class="wrap empty"><p>Impossible de charger les données. Vérifiez votre connexion puis relancez l’app.</p></div>';
    return;
  }
  window.addEventListener('hashchange', route);
  route();
}

boot();
