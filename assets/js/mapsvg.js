// Plan tactique schématique (dessin original) : courbes de niveau procédurales + zones aux positions relatives
import { esc } from './ui.js';

function rng(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

function contours(seed) {
  const r = rng(seed);
  let out = '';
  const centers = 4 + Math.floor(r() * 3);
  for (let c = 0; c < centers; c++) {
    const cx = 120 + r() * 760, cy = 120 + r() * 760;
    const base = 120 + r() * 220;
    const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
    const levels = 5 + Math.floor(r() * 4);
    for (let l = 0; l < levels; l++) {
      const rad = base * (1 - l / (levels + 0.6));
      let d = '';
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const k = 1 + 0.16 * Math.sin(a * 3 + ph[0] + l * 0.3) + 0.09 * Math.sin(a * 5 + ph[1]) + 0.05 * Math.sin(a * 7 + ph[2]);
        d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rad * k).toFixed(1) + ' ' + (cy + Math.sin(a) * rad * k).toFixed(1);
      }
      out += `<path d="${d}Z" fill="none" stroke="rgba(239,231,214,${(0.035 + l * 0.008).toFixed(3)})" stroke-width="${l === 0 ? 1.6 : 1.1}"/>`;
    }
  }
  return out;
}

const TIER_FILL = { high: '#ff4b3e', medium: '#ffc23d' };

// placement des étiquettes sans chevauchement (glouton, par priorité)
function placeLabels(pos, { focus, routeIdx, labels, X, Y, sizeOf }) {
  const want = pos.filter((p) => labels === 'all' || (labels === 'tagged' && p.tags?.length) || (labels === 'focus' && focus && focus.has(p.en)) || routeIdx.has(p.en));
  const prio = (p) => (routeIdx.has(p.en) ? 100 - routeIdx.get(p.en) : 0) + (focus && focus.has(p.en) ? 20 : 0) + (p.tier === 'high' ? 8 : p.tier === 'medium' ? 4 : 0) + (p.tags?.length || 0);
  want.sort((a, b) => prio(b) - prio(a));
  const boxes = pos.map((p) => { const s = sizeOf(p) + 4; return [X(p) - s, Y(p) - s, X(p) + s, Y(p) + s]; });
  for (const p of pos) if (routeIdx.has(p.en)) { const s = sizeOf(p); boxes.push([X(p) - 19, Y(p) - s - 43, X(p) + 19, Y(p) - s - 5]); }
  const out = new Map();
  const hit = (b) => boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
  for (const p of want) {
    const big = (focus && focus.has(p.en)) || routeIdx.has(p.en);
    const fs = big ? 25 : 21;
    const w = p.n.length * fs * 0.66 + 6;
    const s = sizeOf(p);
    const x = X(p), y = Y(p);
    const tries = [[1, 0], [-1, 0], [1, -30], [1, 30], [-1, -30], [-1, 30], [1, -56], [-1, 56]];
    for (const [side, dy] of tries) {
      const anchor = side > 0 ? 'start' : 'end';
      const tx = x + side * (s + 9);
      const ty = y + 8 + dy;
      const b = side > 0 ? [tx, ty - fs * 0.8, tx + w, ty + 4] : [tx - w, ty - fs * 0.8, tx, ty + 4];
      if (b[0] < 4 || b[2] > 996 || b[1] < 30 || b[3] > 996) continue;
      if (hit(b)) continue;
      boxes.push(b);
      out.set(p.en, { x: tx, y: ty, anchor, fs });
      break;
    }
  }
  return out;
}

/**
 * @param map    carte (db.maps[])
 * @param opts.focus   Set de noms (en) mis en avant
 * @param opts.route   [{p}] itinéraire numéroté
 * @param opts.labels  'focus' | 'tagged' | 'all'
 */
export function mapSVG(map, opts = {}) {
  const focus = opts.focus || null;
  const route = opts.route || [];
  const labels = opts.labels || 'tagged';
  const hue = map.hue ?? 20;
  const pos = map.pois.filter((p) => p.x != null);
  const X = (p) => 40 + p.x * 920, Y = (p) => 40 + p.y * 920;

  let grid = '';
  for (let i = 1; i < 10; i++) {
    grid += `<path d="M${i * 100} 0V1000M0 ${i * 100}H1000" stroke="rgba(239,231,214,.045)" stroke-width="1"/>`;
  }
  let ticks = '';
  for (let i = 0; i < 10; i++) {
    ticks += `<text x="${i * 100 + 50}" y="26" text-anchor="middle" font-size="17" fill="rgba(239,231,214,.22)">${'ABCDEFGHIJ'[i]}</text>`;
    ticks += `<text x="18" y="${i * 100 + 56}" text-anchor="middle" font-size="17" fill="rgba(239,231,214,.22)">${i + 1}</text>`;
  }

  const routeIdx = new Map(route.map((x, i) => [x.p.en, i + 1]));
  let routePath = '';
  if (route.length > 1) {
    const d = route.map((x, i) => `${i ? 'L' : 'M'}${X(x.p).toFixed(1)} ${Y(x.p).toFixed(1)}`).join('');
    routePath = `<path d="${d}" fill="none" stroke="rgba(255,90,31,.25)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
      <path class="route" d="${d}" fill="none" stroke="#ff8a3d" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  const sizeOf = (p) => (focus && focus.has(p.en) ? 15 : p.tags?.length ? 11 : 7);
  const placed = placeLabels(pos, { focus, routeIdx, labels, X, Y, sizeOf });

  const pins = pos.map((p, i) => {
    const on = !focus || focus.has(p.en);
    const big = focus && focus.has(p.en);
    const fill = TIER_FILL[p.tier] || (p.tags?.length ? '#efe7d6' : '#7d776c');
    const s = sizeOf(p);
    const x = X(p), y = Y(p);
    const n = routeIdx.get(p.en);
    const L = placed.get(p.en);
    const lab = L ? `<text x="${L.x.toFixed(1)}" y="${L.y.toFixed(1)}" text-anchor="${L.anchor}" font-size="${L.fs}" font-weight="700"
        fill="${on ? '#efe7d6' : 'rgba(239,231,214,.35)'}" stroke="#0b0d0f" stroke-width="6" paint-order="stroke" letter-spacing="1">${esc(p.n.toUpperCase())}</text>` : '';
    return `<g class="poi-pin" data-poi="${esc(p.en)}" opacity="${on ? 1 : 0.38}">
      ${big ? `<circle class="halo" cx="${x}" cy="${y}" r="${s + 6}" fill="none" stroke="${fill}" stroke-width="3"/>` : ''}
      <g class="pin-pop" style="animation-delay:${(0.9 + i * 0.03).toFixed(2)}s">
        <rect x="${x - s}" y="${y - s}" width="${s * 2}" height="${s * 2}" rx="${s * 0.25}" transform="rotate(45 ${x} ${y})" fill="${fill}" stroke="#0b0d0f" stroke-width="3"/>
        ${n ? `<circle cx="${x}" cy="${y - s - 24}" r="16" fill="#ff5a1f" stroke="#0b0d0f" stroke-width="3"/><text x="${x}" y="${y - s - 16}" text-anchor="middle" font-size="21" font-weight="700" fill="#1a0900">${n}</text>` : ''}
      </g>
      <circle cx="${x}" cy="${y}" r="34" fill="transparent"/>
      ${lab}
    </g>`;
  }).join('');

  return `<svg class="map" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Plan schématique : ${esc(map.n)}">
    <defs>
      <radialGradient id="mg-${map.id}" cx="50%" cy="45%" r="70%">
        <stop offset="0" stop-color="hsl(${hue} 45% 14%)"/><stop offset="1" stop-color="#090a0c"/>
      </radialGradient>
    </defs>
    <rect width="1000" height="1000" fill="url(#mg-${map.id})"/>
    ${contours(map.id)}
    ${grid}${ticks}
    <g transform="translate(940 70)"><circle r="26" fill="none" stroke="rgba(239,231,214,.25)" stroke-width="2"/><path d="M0-20 7 4 0 0-7 4Z" fill="#ff5a1f"/><text y="-32" text-anchor="middle" font-size="17" fill="rgba(239,231,214,.5)">N</text></g>
    ${routePath}
    ${pins}
  </svg>`;
}

export function mapBox(map, opts = {}) {
  return `<div class="mapbox">
    ${mapSVG(map, opts)}
    ${opts.scan !== false ? '<div class="scan"></div>' : ''}
    <div class="m-title">${esc(map.n)}</div>
    <div class="m-note">PLAN SCHÉMATIQUE</div>
    <div class="m-legend"><span><i style="background:#ff4b3e"></i>Valeur élevée</span><span><i style="background:#ffc23d"></i>Moyenne</span><span><i style="background:#efe7d6"></i>Zone de butin</span></div>
  </div>`;
}
