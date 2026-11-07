// Stockage local (inventaire, liste de suivi, préférences). Toujours protégé : l'app marche sans.
const KEY = 'tracker.v1';
let state = { inv: {}, list: [], recent: [], prefs: { expand: false }, seen: null };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) state = { ...state, ...JSON.parse(raw) };
} catch (e) { /* stockage indisponible */ }

const listeners = new Set();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  listeners.forEach((f) => f());
}
export const onStore = (f) => listeners.add(f);

export const store = {
  get: () => state,
  have: (id) => state.inv[id] || 0,
  setHave(id, n) { n = Math.max(0, Math.min(9999, Math.round(+n || 0))); if (n) state.inv[id] = n; else delete state.inv[id]; save(); },
  inList: (id) => state.list.find((x) => x.id === id),
  addToList(id, q = 1) { const e = state.list.find((x) => x.id === id); if (e) e.q = q; else state.list.unshift({ id, q, at: Date.now() }); save(); },
  removeFromList(id) { state.list = state.list.filter((x) => x.id !== id); save(); },
  clearList() { state.list = []; save(); },
  addRecent(id) { state.recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, 8); save(); },
  pref: (k) => state.prefs[k],
  setPref(k, v) { state.prefs[k] = v; save(); },
  seen: () => state.seen,
  setSeen(v) { state.seen = v; save(); },
};
