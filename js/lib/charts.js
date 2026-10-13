/* Grafici SVG inline: linea, barre, heatmap annuale, calendario, mappa muscolare. */

import { esc, DOW, MONTHS, dayKey } from './dom.js';
import { MUSCLES } from '../data/exercises.js';

/* ---------------------------------------------------------- linea -------- */

/**
 * @param {{x?:number,v:number,date?:string}[]} pts
 */
export function lineChart(pts, { h = 150, fmt = (v) => Math.round(v), fill = true, dots = true } = {}) {
  const W = 300, H = h, padL = 6, padR = 6, padT = 16, padB = 20;
  if (!pts || pts.length === 0) {
    return `<svg class="chart" viewBox="0 0 ${W} ${H}"><text x="${W / 2}" y="${H / 2}" text-anchor="middle">Nessun dato</text></svg>`;
  }
  if (pts.length === 1) pts = [{ ...pts[0] }, { ...pts[0] }];

  const vs = pts.map((p) => p.v);
  let min = Math.min(...vs), max = Math.max(...vs);
  if (max === min) { max = min + 1; min = Math.max(0, min - 1); }
  const pad = (max - min) * 0.15;
  max += pad; min = Math.max(0, min - pad);

  const X = (i) => padL + (i * (W - padL - padR)) / (pts.length - 1);
  const Y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);

  // curva morbida (Catmull-Rom -> Bézier)
  let d = `M${X(0).toFixed(1)},${Y(pts[0].v).toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = X(i) + (X(i + 1) - X(i - 1 < 0 ? 0 : i - 1)) / 6;
    const c1y = Y(p1.v) + (Y(p2.v) - Y(p0.v)) / 6;
    const c2x = X(i + 1) - (X(Math.min(pts.length - 1, i + 2)) - X(i)) / 6;
    const c2y = Y(p2.v) - (Y(p3.v) - Y(p1.v)) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${X(i + 1).toFixed(1)},${Y(p2.v).toFixed(1)}`;
  }
  const area = `${d} L${X(pts.length - 1).toFixed(1)},${H - padB} L${padL},${H - padB} Z`;
  const gid = 'g' + Math.random().toString(36).slice(2, 7);

  const last = pts[pts.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--acc)" stop-opacity=".34"/>
      <stop offset="1" stop-color="var(--acc)" stop-opacity="0"/>
    </linearGradient></defs>
    <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="var(--line)" stroke-width="1"/>
    ${fill ? `<path d="${area}" fill="url(#${gid})"/>` : ''}
    <path d="${d}" fill="none" stroke="var(--acc)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    ${dots ? `<circle cx="${X(pts.length - 1).toFixed(1)}" cy="${Y(last.v).toFixed(1)}" r="3.4" fill="var(--acc)"/>` : ''}
    <text x="${padL}" y="11" fill="var(--txt-3)">${esc(fmt(max))}</text>
    <text x="${W - padR}" y="${H - 6}" text-anchor="end" fill="var(--txt-3)">${esc(fmt(last.v))}</text>
  </svg>`;
}

/* ---------------------------------------------------------- barre -------- */

export function barChart(items, { h = 150, fmt = (v) => Math.round(v) } = {}) {
  const W = 300, H = h, padB = 20, padT = 14;
  if (!items.length) return '<div class="empty"><p>Nessun dato</p></div>';
  const max = Math.max(...items.map((i) => i.v), 1);
  const bw = W / items.length;
  const gap = Math.min(7, bw * 0.3);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    ${items.map((it, i) => {
      const hh = Math.max(2, ((H - padT - padB) * it.v) / max);
      const x = i * bw + gap / 2;
      const y = H - padB - hh;
      const on = it.v > 0;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - gap).toFixed(1)}" height="${hh.toFixed(1)}" rx="3"
        fill="${on ? 'var(--acc)' : 'var(--surface-3)'}" opacity="${on ? (0.45 + 0.55 * (it.v / max)).toFixed(2) : 1}"/>`;
    }).join('')}
    <line x1="0" y1="${H - padB}" x2="${W}" y2="${H - padB}" stroke="var(--line)" stroke-width="1"/>
    ${items.map((it, i) => (it.lab && (items.length <= 8 || i % Math.ceil(items.length / 6) === 0)
      ? `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(it.lab)}</text>` : '')).join('')}
    <text x="2" y="10">${esc(fmt(max))}</text>
  </svg>`;
}

/* ------------------------------------------------------- bar rows -------- */

export function barRows(entries, { max = null, unit = '' } = {}) {
  if (!entries.length) return '<p class="muted fs13">Nessun dato nel periodo.</p>';
  const mx = max || Math.max(...entries.map((e) => e.v), 1);
  return entries.map((e) => `
    <div class="bar-row">
      <div class="lab nowrap">${esc(e.lab)}</div>
      <div class="track"><i style="width:${Math.max(2, (e.v / mx) * 100).toFixed(1)}%${e.color ? `;background:${e.color}` : ''}"></i></div>
      <div class="n">${Math.round(e.v * 10) / 10}${unit}</div>
    </div>`).join('');
}

/* ------------------------------------------------------- heatmap --------- */

/** Griglia stile "contributi": `days` = {'2026-10-13': n} */
export function heatGrid(days, weeks = 26) {
  const cells = [];
  const end = new Date(); end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + (7 - ((end.getDay() + 6) % 7) - 1)); // fine settimana corrente
  const start = new Date(end); start.setDate(start.getDate() - weeks * 7 + 1);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const k = dayKey(d);
    const n = days[k] || 0;
    cells.push(`<i data-l="${n ? Math.min(4, n + 1) : 0}" title="${k}"></i>`);
  }
  return `<div class="heat">${cells.join('')}</div>`;
}

/* ----------------------------------------------------- calendario -------- */

export function monthCal(year, month, daysMap) {
  const first = new Date(year, month, 1);
  const startDow = (first.getDay() + 6) % 7; // lunedì = 0
  const nDays = new Date(year, month + 1, 0).getDate();
  const todayK = dayKey();
  let html = '<div class="cal">' + ['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d) => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < startDow; i++) html += '<div class="d off"></div>';
  for (let d = 1; d <= nDays; d++) {
    const k = dayKey(new Date(year, month, d));
    const has = daysMap[k];
    html += `<div class="d${has ? ' has' : ''}${k === todayK ? ' today' : ''}">${d}</div>`;
  }
  return html + '</div>';
}

/* ---------------------------------------------------- mappa muscoli ------ */

const FRONT = {
  trapezi: 'M40,33 L50,29 L60,33 L57,40 L50,36 L43,40 Z',
  spalle: 'M30,40 q-9,2 -9,11 q0,6 4,8 q4,-11 9,-13 Z M70,40 q9,2 9,11 q0,6 -4,8 q-4,-11 -9,-13 Z',
  petto: 'M34,43 q9,-4 15,0 l0,19 q-10,2 -15,-5 Z M66,43 q-9,-4 -15,0 l0,19 q10,2 15,-5 Z',
  bicipiti: 'M24,53 q-6,6 -6,15 q0,5 3,8 q4,-13 7,-18 Z M76,53 q6,6 6,15 q0,5 -3,8 q-4,-13 -7,-18 Z',
  avambracci: 'M20,79 q-5,8 -4,18 q1,6 4,7 q2,-14 4,-22 Z M80,79 q5,8 4,18 q-1,6 -4,7 q-2,-14 -4,-22 Z',
  addome: 'M43,64 h14 v30 q-7,5 -14,0 Z',
  quadricipiti: 'M37,106 q-3,18 1,33 q6,3 9,-1 q1,-18 -1,-32 Z M63,106 q3,18 -1,33 q-6,3 -9,-1 q-1,-18 1,-32 Z',
  adduttori: 'M47,106 q-2,14 0,22 h6 q2,-8 0,-22 Z',
  abduttori: 'M34,100 q-4,4 -3,10 l5,1 q0,-6 2,-10 Z M66,100 q4,4 3,10 l-5,1 q0,-6 -2,-10 Z',
  polpacci: '',
};

const BACK = {
  trapezi: 'M38,32 L50,28 L62,32 q-2,14 -12,20 q-10,-6 -12,-20 Z',
  spalle: 'M30,40 q-9,2 -9,11 q0,6 4,8 q4,-11 9,-13 Z M70,40 q9,2 9,11 q0,6 -4,8 q-4,-11 -9,-13 Z',
  dorso: 'M36,50 q-4,16 2,28 l12,-6 l0,-24 q-8,4 -14,2 Z M64,50 q4,16 -2,28 l-12,-6 l0,-24 q8,4 14,2 Z',
  tricipiti: 'M24,53 q-6,6 -6,15 q0,5 3,8 q4,-13 7,-18 Z M76,53 q6,6 6,15 q0,5 -3,8 q-4,-13 -7,-18 Z',
  avambracci: 'M20,79 q-5,8 -4,18 q1,6 4,7 q2,-14 4,-22 Z M80,79 q5,8 4,18 q-1,6 -4,7 q-2,-14 -4,-22 Z',
  lombari: 'M42,80 h16 v14 q-8,4 -16,0 Z',
  glutei: 'M38,96 q-4,8 0,14 q6,4 11,-1 l0,-13 Z M62,96 q4,8 0,14 q-6,4 -11,-1 l0,-13 Z',
  femorali: 'M38,112 q-3,16 0,28 q6,3 9,-1 q0,-16 -1,-27 Z M62,112 q3,16 0,28 q-6,3 -9,-1 q0,-16 1,-27 Z',
  polpacci: 'M40,146 q-3,12 0,20 q4,2 6,-1 q1,-11 0,-19 Z M60,146 q3,12 0,20 q-4,2 -6,-1 q-1,-11 0,-19 Z',
};

/* figura stilizzata: blocchi morbidi, coerenti con le aree muscolari sopra */
const SILHOUETTE = `
  <circle cx="50" cy="14" r="9"/>
  <rect x="45" y="20" width="10" height="10" rx="3.5"/>
  <path d="M28,37 q22,-9 44,0 q4,15 2,29 q-2,15 -4,33 q-19,6 -40,0 q-2,-18 -4,-33 q-2,-14 2,-29 Z"/>
  <rect x="16.5" y="40" width="12" height="46" rx="6" transform="rotate(5 22.5 63)"/>
  <rect x="71.5" y="40" width="12" height="46" rx="6" transform="rotate(-5 77.5 63)"/>
  <rect x="14" y="76" width="10.5" height="34" rx="5"/>
  <rect x="75.5" y="76" width="10.5" height="34" rx="5"/>
  <rect x="35" y="93" width="14.2" height="54" rx="7"/>
  <rect x="50.8" y="93" width="14.2" height="54" rx="7"/>
  <rect x="37" y="142" width="12" height="32" rx="6"/>
  <rect x="51" y="142" width="12" height="32" rx="6"/>`;

function heatColor(v, max) {
  if (!v) return 'var(--surface-3)';
  const t = Math.min(1, v / (max || 1));
  return `color-mix(in srgb, var(--acc) ${Math.round(18 + t * 82)}%, var(--surface-3))`;
}

/** @param {Record<string,number>} data serie per muscolo */
export function bodyMap(data) {
  const max = Math.max(1, ...Object.values(data));
  const side = (defs, label) => `
    <div style="flex:1;text-align:center">
      <svg viewBox="0 0 100 180" style="width:100%;max-width:150px;height:auto">
        <g fill="var(--surface-2)" stroke="var(--line-2)" stroke-width=".7">${SILHOUETTE}</g>
        ${Object.entries(defs).filter(([, d]) => d).map(([m, d]) =>
          `<path d="${d}" fill="${heatColor(data[m] || 0, max)}" stroke="var(--bg)" stroke-width=".5">
             <title>${esc(MUSCLES[m]?.n || m)}: ${Math.round((data[m] || 0) * 10) / 10} serie</title></path>`).join('')}
      </svg>
      <div class="fs12 muted" style="margin-top:2px">${label}</div>
    </div>`;
  return `<div class="flex gap12" style="align-items:flex-start">${side(FRONT, 'Fronte')}${side(BACK, 'Retro')}</div>`;
}

/* ------------------------------------------------------------ anelli ----- */

/** Anello di progresso (usato nel timer di recupero). */
export function ring(pct, { r = 46, w = 7 } = {}) {
  const c = 2 * Math.PI * r;
  return `<circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${w}"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--acc)" stroke-width="${w}" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(2)}"
      style="transition:stroke-dashoffset .35s linear"/>`;
}

export { DOW, MONTHS };
