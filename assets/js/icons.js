// Jeu d'icônes original de Tracker (traits 1.8px, 24×24)
const P = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

export const ICONS = {
  search: P('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.6-4.6"/>'),
  close: P('<path d="M6 6l12 12M18 6 6 18"/>'),
  back: P('<path d="M15 5l-7 7 7 7"/>'),
  chev: P('<path d="m9 6 6 6-6 6"/>'),
  home: P('<path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>'),
  craft: P('<path d="M14.5 5.5 18.5 9.5"/><path d="M4 20l9-9"/><path d="m12 8 4-4 4 4-4 4z"/><path d="M5 15l4 4"/>'),
  map: P('<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>'),
  list: P('<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17"/>'),
  more: P('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  check: P('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  update: P('<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>'),
  download: P('<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>'),
  target: P('<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'),
  route: P('<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/>'),
  pin: P('<path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  moon: P('<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5 7.5 7.5 0 1 0 19 14.5z"/>'),
  bolt: P('<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>'),
  recycle: P('<path d="M7 19H4.5a1.5 1.5 0 0 1-1.3-2.2L5 13.5"/><path d="m8.5 4.5 1.3-2.2a1.5 1.5 0 0 1 2.6 0L14.5 6"/><path d="M17 19h2.5a1.5 1.5 0 0 0 1.3-2.2l-2-3.4"/><path d="m11 19 2-2-2-2"/><path d="m3 10 2 3.5 3.5-1"/><path d="m17.5 9 1.5 4 3-1.5"/>'),
  coin: P('<circle cx="12" cy="12" r="8"/><path d="M14.5 9.2c-.6-.8-1.5-1.2-2.5-1.2-1.4 0-2.5.8-2.5 2s1.1 1.6 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.4-2.6-1.2M12 6.5v1.5M12 16v1.5"/>'),
  quest: P('<path d="M6 3h9l3 3v15H6z"/><path d="M9 9h6M9 13h6M9 17h3"/>'),
  station: P('<path d="M3 20h18"/><path d="M5 20V10l7-5 7 5v10"/><path d="M9 20v-5h6v5"/>'),
  info: P('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  star: P('<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/>'),
  skull: P('<path d="M12 3a7.5 7.5 0 0 0-7.5 7.5c0 2.6 1.3 4.4 3 5.6V19h9v-2.9c1.7-1.2 3-3 3-5.6A7.5 7.5 0 0 0 12 3z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M10.5 19v2M13.5 19v2"/>'),
  eye: P('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  backpack: P('<path d="M7 8a5 5 0 0 1 10 0v12H7z"/><path d="M9.5 5V3.5h5V5"/><path d="M9 13h6v4H9z"/>'),
  share: P('<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4"/>'),
  trash: P('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  keep: P('<path d="M6 3h12v18l-6-4-6 4z"/>'),
  phone: P('<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>'),

  // catégories de butin
  Mechanical: P('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1"/>'),
  Industrial: P('<path d="M3 20V10l5 3V10l5 3V6h3l1 14z"/><path d="M3 20h18"/><path d="M17.5 6V3h2v17"/>'),
  Electrical: P('<path d="M13 2.5 5.5 13h5.5L10 21.5 18.5 10.5H13z"/>'),
  Medical: P('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 7.5v9M7.5 12h9"/>'),
  Technological: P('<rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v3.5M15 3v3.5M9 17.5V21M15 17.5V21M3 9h3.5M3 15h3.5M17.5 9H21M17.5 15H21"/>'),
  Security: P('<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6z"/><rect x="9.5" y="10.5" width="5" height="4.5" rx="1"/><path d="M10.5 10.5V9a1.5 1.5 0 0 1 3 0v1.5"/>'),
  Residential: P('<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><rect x="10" y="13" width="4" height="7"/>'),
  Commercial: P('<path d="M4 4h2l2.2 10.5h9.6L20 7H7"/><circle cx="9.5" cy="18.5" r="1.5"/><circle cx="16.5" cy="18.5" r="1.5"/>'),
  Exodus: P('<path d="M12 2.5c3 2.5 4.5 6 4.5 10L14 16h-4l-2.5-3.5c0-4 1.5-7.5 4.5-10z"/><circle cx="12" cy="9.5" r="1.6"/><path d="M10 16l-1 5 3-2 3 2-1-5M7.5 12.5 5 15v3l3-1.5M16.5 12.5 19 15v3l-3-1.5"/>'),
  'Old World': P('<path d="M3 20h18M4.5 20V9M19.5 20V9M9 20V9M15 20V9"/><path d="M3 9h18L12 3.5z"/>'),
  Nature: P('<path d="M5 19C5 10 11 5 20 4c0 9-5 15-13 15"/><path d="M5 19c3-4 6-7 10-9.5"/>'),
  ARC: P('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.5V7M12 17v3.5M3.5 12H7M17 12h3.5"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>'),
  Raider: P('<path d="M4 8.5C4 6 7.5 4 12 4s8 2 8 4.5c0 3-1.5 7.5-8 11.5C5.5 16 4 11.5 4 8.5z"/><path d="M7.5 10.5 10.5 12M16.5 10.5 13.5 12"/>'),

  // types d'objets
  weapon: P('<path d="M2.5 10h14.5l1.5-1.5H21v4h-6.5l-1.5 1.5H10l-1.5 4.5H5.5l1-4.5H2.5z"/><path d="M11 12.5v1.5"/>'),
  blueprint: P('<rect x="3.5" y="4" width="17" height="16" rx="1.5"/><path d="M3.5 9h17M3.5 14h17M9 4v16M14.5 4v16" opacity=".55"/><path d="M7 17l3-6 3 3 4-5"/>'),
  material: P('<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>'),
  arc: P('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.5V7M12 17v3.5M3.5 12H7M17 12h3.5"/>'),
  key: P('<circle cx="8" cy="15" r="4"/><path d="m11 12 8.5-8.5M16 7l2.5 2.5M14 9l2 2"/>'),
  ammo: P('<path d="M7 9.5c0-3 1.5-5.5 2.5-6.5 1 1 2.5 3.5 2.5 6.5V20H7z"/><path d="M12 9.5c0-3 1.5-5.5 2.5-6.5 1 1 2.5 3.5 2.5 6.5V20h-5z"/><path d="M7 16.5h5M12 16.5h5"/>'),
  mod: P('<circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
  augment: P('<path d="M12 3c-3.5 0-6 2.5-6 6 0 2.4 1.2 4 2.5 5v4h7v-4c1.3-1 2.5-2.6 2.5-5 0-3.5-2.5-6-6-6z"/><path d="M9.5 21h5M10 10l2 2 2-2"/>'),
  shield: P('<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6z"/>'),
  consumable: P('<rect x="8" y="2.5" width="8" height="4" rx="1"/><path d="M7 6.5h10l-1 14.5H8z"/><path d="M12 11v6M9 14h6"/>'),
  trinket: P('<path d="m6 3.5-3 5 9 12 9-12-3-5z"/><path d="M3 8.5h18M9.5 3.5 12 8.5l2.5-5M12 20.5l-3-12M12 20.5l3-12"/>'),
  recyclable: P('<path d="M4.5 8h15l-1 12.5h-13z"/><path d="M3.5 8h17M9 4h6v4"/><path d="m10 12.5 2-2 2 2M12 10.5v6"/>'),
};

export const icon = (name) => ICONS[name] || ICONS.material;

// Marque Tracker : réticule + balayage radar (original)
export const BRAND = `<svg class="brand-mark" viewBox="0 0 32 32" fill="none">
  <circle cx="16" cy="16" r="13" stroke="#ff5a1f" stroke-width="2"/>
  <circle cx="16" cy="16" r="7" stroke="#efe7d6" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="2 2.4"/>
  <path d="M16 16 L26.5 8.5 A13 13 0 0 1 29 16 Z" fill="#ff5a1f" fill-opacity=".45"/>
  <path d="M16 1.5v5M16 25.5v5M1.5 16h5M25.5 16h5" stroke="#efe7d6" stroke-width="2" stroke-linecap="round"/>
  <circle cx="16" cy="16" r="2.4" fill="#ff5a1f"/>
</svg>`;
