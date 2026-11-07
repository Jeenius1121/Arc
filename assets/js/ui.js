// Petits utilitaires d'interface
import { ICONS, icon } from './icons.js';
import { D, CAT_FR, RARITY_FR, TYPE_FR, iconFor, name } from './data.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('fr-FR'));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function thumb(it, size = '') {
  return `<span class="thumb ${size} r-${it?.r || 'Common'}">${icon(iconFor(it))}</span>`;
}

export function itemRow(it, { sub, end, href } = {}) {
  if (!it) return '';
  const s = sub ?? `${TYPE_FR[it.t] || it.t} · <span class="rar r-${it.r}">${RARITY_FR[it.r] || ''}</span>`;
  return `<a class="row" href="${href || '#/item/' + it.id}">
    ${thumb(it)}
    <div class="r-main"><div class="r-title">${esc(it.n)}</div><div class="r-sub">${s}</div></div>
    ${end != null ? `<div class="r-end">${end}</div>` : ''}
    <span class="chev">${ICONS.chev}</span>
  </a>`;
}

export const catChip = (c, cls = '') => `<span class="chip ${cls}">${icon(c)}${esc(CAT_FR[c] || c)}</span>`;
export const tierChip = (t) => (t === 'high' ? '<span class="chip red">◆ Valeur élevée</span>' : t === 'medium' ? '<span class="chip yellow">◆ Valeur moyenne</span>' : '');

export function sectionTitle(title, num, extra = '') {
  return `<div class="section-title">${num ? `<span class="num">${esc(num)}</span>` : ''}<h2>${esc(title)}</h2><span class="line"></span>${extra}</div>`;
}

export function gauge(ch) {
  if (!ch) return '';
  return `<div class="gauge" style="--g:${ch.color}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= ch.bars ? 'on' : ''}"></i>`).join('')}</div>`;
}

export function costLine(cost) {
  return Object.entries(cost || {}).map(([k, q]) => `${fmt(q)} × ${esc(name(k))}`).join(', ');
}

export function stepper(id, value) {
  return `<span class="stepper" data-id="${id}"><button data-d="-1" aria-label="moins">−</button><input type="number" inputmode="numeric" min="0" value="${value}" aria-label="quantité possédée"/><button data-d="1" aria-label="plus">+</button></span>`;
}

let toastZone;
export function toast(html, ms = 4200) {
  toastZone = toastZone || $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = html;
  toastZone.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s, transform .3s'; el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; setTimeout(() => el.remove(), 320); }, ms);
}

export function openSheet(html) {
  closeSheet();
  const bd = document.createElement('div');
  bd.className = 'sheet-backdrop';
  const sh = document.createElement('div');
  sh.className = 'sheet';
  sh.innerHTML = `<div class="grab"></div><div class="wrap">${html}</div>`;
  document.body.append(bd, sh);
  requestAnimationFrame(() => { bd.classList.add('show'); sh.classList.add('show'); });
  bd.addEventListener('click', closeSheet);
  sh.addEventListener('click', (e) => { if (e.target.closest('a[href^="#"]')) closeSheet(); });
  return sh;
}
export function closeSheet() {
  $$('.sheet, .sheet-backdrop').forEach((el) => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); });
}

export const mapName = (id) => D.M[id]?.n || id;
