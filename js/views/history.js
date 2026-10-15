/* Diario: calendario, elenco allenamenti e dettaglio sessione. */

import { S, save, deleteSession, sessionVolume, sessionSets, idx, isWork, SET_TYPES } from '../lib/store.js';
import { getEx } from '../data/exercises.js';
import {
  esc, $, on, fmtDate, fmtTime, fmtDurShort, fmtVolume, fmtVol, fmtWeight, openSheet, closeSheet,
  confirmSheet, promptSheet, toast, MONTHS, plur,
} from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { monthCal } from '../lib/charts.js';
import { render } from '../app.js';

let cursor = new Date();

export function sessionSheet(id) {
  const s = S.sessions.find((x) => x.id === id);
  if (!s) return;
  const vol = sessionVolume(s);
  openSheet({
    title: s.name || 'Allenamento',
    body: `
      <div class="fs13 muted" style="margin-bottom:12px">${esc(fmtDate(s.date, { full: true }))} · ${fmtTime(s.date)}</div>
      <div class="stat-row">
        <div class="stat"><div class="v">${fmtDurShort(s.duration || 0)}</div><div class="k">Durata</div></div>
        <div class="stat"><div class="v">${fmtVolume(vol)}<span class="u">${vol >= 10000 ? '' : 'kg'}</span></div><div class="k">Volume</div></div>
        <div class="stat"><div class="v">${sessionSets(s)}</div><div class="k">Serie</div></div>
      </div>
      ${s.note ? `<div class="coach" style="margin:14px 0 0">${icon('note', 17)}<div>${esc(s.note)}</div></div>` : ''}
      <div class="section-title">Esercizi</div>
      ${s.exercises.map((e) => `
        <div class="card" style="padding:12px 14px">
          <div class="fw7 fs15" style="letter-spacing:-.02em">${esc(getEx(e.exId).n)}</div>
          <div class="flex wrap gap6 mt6">
            ${(() => { let n = 0; return e.sets.map((x) => {
              if (isWork(x)) n++;                       // il riscaldamento non entra nel conto
              const lab = SET_TYPES[x.type || 'n']?.lab || n;
              return `<span class="pill ${isWork(x) ? 'acc' : ''}">${lab}· ${x.weight != null ? fmtWeight(x.weight) + '×' : ''}${x.reps}${x.rpe ? ` <small style="opacity:.7">@${x.rpe}</small>` : ''}</span>`;
            }).join(''); })()}
          </div>
          ${e.note ? `<div class="fs12 muted mt6">${esc(e.note)}</div>` : ''}
        </div>`).join('')}`,
    foot: `<button class="btn ghost" data-note>${icon('note', 17)} Nota</button><button class="btn danger" data-del>${icon('trash', 17)} Elimina</button>`,
    onMount: (el) => {
      $('[data-del]', el).onclick = async () => {
        const ok = await confirmSheet('Eliminare?', 'L’allenamento verrà rimosso dallo storico e dalle statistiche.', 'Elimina');
        if (!ok) return;
        deleteSession(s.id);
        closeSheet();
        render();
        toast('Allenamento eliminato');
      };
      $('[data-note]', el).onclick = async () => {
        const v = await promptSheet('Nota', { value: s.note || '', multiline: true });
        if (v !== null) { s.note = v; save(); closeSheet(); render(); }
      };
    },
  });
}

export default {
  render(params = {}) {
    const days = idx().days;
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const list = [...S.sessions].reverse();

    const groups = {};
    for (const s of list) {
      const d = new Date(s.date);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      (groups[k] ||= []).push(s);
    }

    return `
      <div class="topbar">
        <div><h1>Diario</h1><div class="sub">${plur(S.sessions.length, 'allenamento registrato', 'allenamenti registrati')}</div></div>
      </div>

      <div class="card">
        <div class="flex between center" style="margin-bottom:12px">
          <button class="icon-btn ghost" data-mv="-1">${icon('chevL', 18)}</button>
          <div class="fw7" style="font-size:15px;letter-spacing:-.02em">${MONTHS[m][0].toUpperCase() + MONTHS[m].slice(1)} ${y}</div>
          <button class="icon-btn ghost" data-mv="1">${icon('chevR', 18)}</button>
        </div>
        ${monthCal(y, m, days)}
      </div>

      ${list.length ? Object.entries(groups).map(([k, ss]) => {
        const [yy, mm] = k.split('-').map(Number);
        const vol = ss.reduce((a, s) => a + sessionVolume(s), 0);
        return `<div class="section-title">${MONTHS[mm]} ${yy} <span style="color:var(--txt-3);font-weight:600">${ss.length} · ${fmtVol(vol)}</span></div>
        <div class="card flush"><div class="rows">
          ${ss.map((s) => `<button class="row" data-s="${s.id}">
            <span class="avatar acc">${icon('dumbbell', 19)}</span>
            <span class="grow"><span class="t">${esc(s.name || 'Allenamento')}</span>
            <span class="s">${esc(fmtDate(s.date))} · ${fmtDurShort(s.duration || 0)} · ${sessionSets(s)} serie · ${fmtVol(sessionVolume(s))}</span></span>
            ${icon('chevR', 18)}</button>`).join('')}
        </div></div>`;
      }).join('')
      : `<div class="empty"><div class="ico">${icon('calendar', 28)}</div><h3>Ancora nessun allenamento</h3>
         <p>Appena completi la prima sessione la trovi qui, con tutti i dettagli.</p></div>`}`;
  },

  mount(root, params = {}) {
    on(root, 'click', '[data-mv]', (e, t) => {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + Number(t.dataset.mv), 1);
      render();
    });
    on(root, 'click', '[data-s]', (e, t) => sessionSheet(t.dataset.s));
    if (params.open) setTimeout(() => sessionSheet(params.open), 120);
  },
};
