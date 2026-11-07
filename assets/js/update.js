// Système de mise à jour intégré
// 1. L'app compare sa version (version.js) à version.json publié sur le serveur
//    (au démarrage, toutes les 5 min et à chaque retour au premier plan).
// 2. Si une version plus récente existe : bandeau en haut de l'écran.
// 3. Toucher le bandeau installe la nouvelle version (service worker) et recharge l'app.
import { APP_VERSION } from './version.js';
import { ICONS } from './icons.js';
import { store } from './store.js';
import { toast, esc } from './ui.js';

const CHECK_EVERY = 5 * 60 * 1000;
let reg = null;
let remote = null;
let dismissed = null;
let banner = null;

export function cmpVer(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

export async function initUpdates() {
  banner = document.getElementById('update-banner');
  banner.querySelector('.ub-main').addEventListener('click', applyUpdate);
  banner.querySelector('.ub-x').addEventListener('click', () => { dismissed = remote?.version; hideBanner(); });

  if ('serviceWorker' in navigator) {
    try {
      reg = await navigator.serviceWorker.register('sw.js');
      // un nouveau service worker est prêt mais en attente → on vérifie version.json
      reg.addEventListener('updatefound', () => setTimeout(check, 1500));
    } catch (e) { /* hors-ligne ou non supporté */ }
  }
  announceInstalled();
  check();
  setInterval(check, CHECK_EVERY);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  window.addEventListener('online', check);
}

export async function check() {
  try {
    const res = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return null;
    remote = await res.json();
    if (cmpVer(remote.version, APP_VERSION) > 0 && dismissed !== remote.version) showBanner(remote);
    return remote;
  } catch (e) { return null; }
}

function showBanner(v) {
  banner.querySelector('.ub-txt').innerHTML = `<b>Mise à jour disponible</b><span>v${esc(v.version)} · touchez pour installer</span>`;
  banner.classList.add('show');
  document.documentElement.style.setProperty('--banner-h', banner.offsetHeight + 'px');
}
function hideBanner() {
  banner.classList.remove('show');
  document.documentElement.style.setProperty('--banner-h', '0px');
}

async function applyUpdate() {
  if (banner.classList.contains('busy')) return;
  banner.classList.add('busy');
  banner.querySelector('.ub-ico').innerHTML = ICONS.update;
  banner.querySelector('.ub-txt').innerHTML = '<b>Installation…</b><span>Téléchargement de la nouvelle version</span>';
  try { sessionStorage.setItem('tracker.updating', remote?.version || ''); } catch (e) { /* ignore */ }
  try {
    if (reg) {
      await reg.update();
      const sw = reg.waiting || (await waitFor(() => reg.waiting, 10000));
      if (sw) {
        const changed = new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
        sw.postMessage({ type: 'SKIP_WAITING' });
        await Promise.race([changed, sleep(4000)]);
      }
    }
  } catch (e) { /* on passe au plan B */ }
  // plan B : on vide les anciens caches pour forcer le téléchargement des nouveaux fichiers
  try {
    const keys = await caches.keys();
    const active = await activeCacheName();
    await Promise.all(keys.filter((k) => k.startsWith('tracker-') && k !== active).map((k) => caches.delete(k)));
    if (!active && reg) await reg.unregister();
  } catch (e) { /* ignore */ }
  location.reload();
}

async function activeCacheName() {
  try {
    const want = 'tracker-' + (remote?.version || '');
    return (await caches.keys()).includes(want) ? want : null;
  } catch (e) { return null; }
}

function announceInstalled() {
  const prev = store.seen();
  if (prev && cmpVer(APP_VERSION, prev) > 0) {
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => r.json()).then((v) => {
      const notes = v.version === APP_VERSION && v.notes?.length ? `<ul>${v.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
      toast(`<b>✓ Tracker mis à jour — v${esc(APP_VERSION)}</b>${notes}`, 8000);
    }).catch(() => toast(`<b>✓ Tracker mis à jour — v${esc(APP_VERSION)}</b>`));
  }
  store.setSeen(APP_VERSION);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(250); }
  return null;
}
