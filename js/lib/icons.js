/* Set di icone inline (stroke, 24x24, currentColor). Nessuna dipendenza esterna. */

const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  dumbbell: '<path d="M6.5 7.5v9M3.5 9.5v5M17.5 7.5v9M20.5 9.5v5M6.5 12h11"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke-linejoin="round"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M4 12.5 9.5 18 20 6.5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.2l2.8 2.8L16 9.5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>',
  chevD: '<path d="M6 9l6 6 6-6"/>',
  chevU: '<path d="M6 15l6-6 6 6"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 15a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10.5 4V3.7a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 1.9"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.8M9.5 2h5M18.8 7.2l1.3-1.3"/>',
  edit: '<path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5V20z"/><path d="M14 6.5 17.5 10"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4.6A1 1 0 0 1 10 4h4a1 1 0 0 1 1 .6V7"/>',
  download: '<path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  upload: '<path d="M12 21V9m0 0 4.5 4.5M12 9l-4.5 4.5"/><path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  flame: '<path d="M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-1.6.7-2.9 1.6-3.9C9.3 9.5 10 11 11 11c1.4 0 1.6-2.6 1-8z"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5.5H4.8A.8.8 0 0 0 4 6.3C4 8.3 5.4 10 7.3 10M17 5.5h2.2a.8.8 0 0 1 .8.8c0 2-1.4 3.7-3.3 3.7"/><path d="M12 14v3M8.5 20h7a3.5 3.5 0 0 0-3.5-3 3.5 3.5 0 0 0-3.5 3z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  more: '<circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none"/>',
  grip: '<path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" stroke-width="2.8"/>',
  skip: '<path d="M6 5l9 7-9 7z" fill="currentColor" stroke-linejoin="round"/><path d="M18 5v14"/>',
  pause: '<path d="M9 5v14M15 5v14" stroke-width="2.6"/>',
  share: '<path d="M12 15V3m0 0L8 7m4-4 4 4"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  scale: '<path d="M4 20h16M7 20V9M17 20V9"/><path d="M12 4a3 3 0 0 0-3 3v2h6V7a3 3 0 0 0-3-3z"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"/>',
  arrowUp: '<path d="M12 20V5m0 0-6 6m6-6 6 6"/>',
  arrowDown: '<path d="M12 4v15m0 0 6-6m-6 6-6-6"/>',
  refresh: '<path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.5"/><path d="M4 4.5v4h4"/><path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.5"/><path d="M20 19.5v-4h-4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" stroke-width="2.4"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6H9z"/><path d="M9 11h6M9 15h4"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5z"/>',
  swap: '<path d="M4 8h12m0 0-4-4m4 4-4 4"/><path d="M20 16H8m0 0 4 4m-4-4 4-4"/>',
  ruler: '<rect x="2.5" y="8" width="19" height="8" rx="2" transform="rotate(-45 12 12)"/><path d="M9 8.5l1.5 1.5M12 5.5 13.5 7M6 11.5 7.5 13"/>',
  heart: '<path d="M12 20s-7-4.5-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7 3.5c0 5-7 9.5-7 9.5z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  note: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5z"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>',
  plus2: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z"/>',
  /* logo dell'app: manubrio pieno, simmetrico rispetto a 12,12 */
  logo: '<g fill="currentColor" stroke="none">'
    + '<rect x="6.72" y="10.8" width="10.56" height="2.4" rx="1.2"/>'
    + '<rect x="4.27" y="7.68" width="2.45" height="8.64" rx=".72"/>'
    + '<rect x="17.28" y="7.68" width="2.45" height="8.64" rx=".72"/>'
    + '<rect x="2.28" y="9.19" width="2.06" height="5.62" rx=".6"/>'
    + '<rect x="19.66" y="9.19" width="2.06" height="5.62" rx=".6"/></g>',
  medal: '<circle cx="12" cy="15" r="5.5"/><path d="M8.5 10 6 3h12l-2.5 7"/><path d="m12 13 .8 1.6 1.7.2-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7L9.5 15l1.7-.2z"/>',
};

/**
 * @param {keyof P} name
 * @param {number} size
 * @param {string} cls
 */
export function icon(name, size = 22, cls = '') {
  const d = P[name] || P.info;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true">${d}</svg>`;
}

export const iconNames = Object.keys(P);
