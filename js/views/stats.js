/* Statistiche: volume, frequenza, equilibrio muscolare, record, misure. */

import { S, save, addMeasure, sessionsSince, sessionVolume, sessionSets, idx, prOf, historyOf, isWork } from '../lib/store.js';
import { getEx, MUSCLES } from '../data/exercises.js';
import { setsByMuscle, weeklyVolume, e1rmSeries } from '../lib/coach.js';
import {
  esc, $, $$, on, fmtVolume, fmtWeight, fmtDurShort, fmtDate, openSheet, closeSheet, toast, plur,
} from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { lineChart, barChart, barRows, bodyMap } from '../lib/charts.js';
import { exerciseSheet } from './exercises.js';
import { render } from '../app.js';

let period = 28; // giorni

export function measureSheet() {
  const last = S.measures[S.measures.length - 1] || {};
  const F = [
    ['weight', 'Peso', 'kg'], ['bodyfat', 'Massa grassa', '%'], ['chest', 'Petto', 'cm'],
    ['waist', 'Vita', 'cm'], ['hips', 'Fianchi', 'cm'], ['arm', 'Braccio', 'cm'],
    ['thigh', 'Coscia', 'cm'], ['calf', 'Polpaccio', 'cm'],
  ];
  openSheet({
    title: 'Peso e misure',
    body: `<p class="fs13 muted" style="margin-bottom:14px">Compila solo i campi che ti interessano.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${F.map(([k, lab, u]) => `<div class="field" style="margin:0">
          <label>${lab} (${u})</label>
          <input class="input" type="text" inputmode="decimal" data-num="dec" data-k="${k}"
            autocomplete="off" placeholder="${last[k] != null ? String(last[k]).replace('.', ',') : '—'}">
        </div>`).join('')}
      </div>`,
    foot: `<button class="btn ghost" data-sheet-close>Annulla</button><button class="btn primary" data-save>Salva</button>`,
    onMount: (el) => {
      $('[data-save]', el).onclick = () => {
        const m = {};
        for (const i of $$('[data-k]', el)) {
          const v = Number(String(i.value).replace(',', '.'));
          if (i.value !== '' && isFinite(v)) m[i.dataset.k] = v;
        }
        if (!Object.keys(m).length) { toast('Inserisci almeno un valore', 'err'); return; }
        addMeasure(m);
        closeSheet();
        toast('Misure salvate');
        render();
      };
    },
  });
}

export default {
  render() {
    const ss = period >= 3650 ? S.sessions : sessionsSince(period);
    const vol = ss.reduce((a, s) => a + sessionVolume(s), 0);
    const sets = ss.reduce((a, s) => a + sessionSets(s), 0);
    const dur = ss.reduce((a, s) => a + (s.duration || 0), 0);
    const weeks = Math.max(1, period / 7);

    // il grafico mostra la finestra scelta, non una fissa più lunga
    const wv = weeklyVolume(period >= 365 ? 52 : period >= 84 ? 12 : 4);
    const byMuscle = setsByMuscle(ss);
    const muscleRows = Object.entries(byMuscle)
      .sort((a, b) => b[1] - a[1])
      .map(([m, v]) => ({ lab: MUSCLES[m]?.n || m, v: Math.round((v / weeks) * 10) / 10 }));

    // esercizi più allenati
    const byEx = {};
    for (const s of ss) for (const e of s.exercises || []) {
      const v = (e.sets || []).filter((x) => x.done && isWork(x)).reduce((a, x) => a + (Number(x.weight) || 0) * (Number(x.reps) || 0), 0);
      byEx[e.exId] = (byEx[e.exId] || 0) + v;
    }
    const topEx = Object.entries(byEx).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const prs = Object.entries(idx().pr)
      .filter(([, p]) => p.weight > 0)
      .sort((a, b) => b[1].e1rm - a[1].e1rm)
      .slice(0, 10);

    const wSeries = S.measures.filter((m) => m.weight).map((m) => ({ v: m.weight }));

    return `
      <div class="topbar"><div><h1>Statistiche</h1><div class="sub">${plur(S.sessions.length, 'allenamento totale', 'allenamenti totali')}</div></div></div>

      <div class="seg" style="margin-bottom:16px">
        ${[[28, '4 sett.'], [84, '3 mesi'], [365, '1 anno'], [3650, 'Sempre']].map(([d, l]) =>
          `<button data-p="${d}" class="${period === d ? 'on' : ''}">${l}</button>`).join('')}
      </div>

      <div class="stat-row">
        <div class="stat"><div class="v">${ss.length}</div><div class="k">Allenamenti</div></div>
        <div class="stat"><div class="v">${fmtVolume(vol)}<span class="u">${vol >= 10000 ? '' : 'kg'}</span></div><div class="k">Volume</div></div>
        <div class="stat"><div class="v">${sets}</div><div class="k">Serie</div></div>
      </div>
      <div class="stat-row mt10">
        <div class="stat"><div class="v">${(ss.length / weeks).toFixed(1)}</div><div class="k">A settimana</div></div>
        <div class="stat"><div class="v">${ss.length ? fmtDurShort(dur / ss.length) : '—'}</div><div class="k">Durata media</div></div>
        <div class="stat"><div class="v">${ss.length ? Math.round(sets / ss.length) : 0}</div><div class="k">Serie/sessione</div></div>
      </div>

      <div class="section-title">Volume settimanale</div>
      <div class="card">${barChart(wv.map((w) => ({ v: w.volume, lab: w.week.slice(8) + '/' + w.week.slice(5, 7) })), { fmt: (v) => fmtVolume(v) + (v >= 10000 ? '' : ' kg') })}</div>

      <div class="section-title">Allenamenti per settimana</div>
      <div class="card">${barChart(wv.map((w) => ({ v: w.sessions, lab: w.week.slice(8) + '/' + w.week.slice(5, 7) })), { h: 110, fmt: (v) => v })}</div>

      <div class="section-title">Equilibrio muscolare <span style="color:var(--txt-3);font-weight:600">serie/sett.</span></div>
      <div class="card">
        ${Object.keys(byMuscle).length ? bodyMap(Object.fromEntries(Object.entries(byMuscle).map(([k, v]) => [k, v / weeks]))) : '<p class="muted fs13 tc">Nessun dato nel periodo.</p>'}
        <div class="divider"></div>
        ${barRows(muscleRows.slice(0, 10))}
        <p class="fs12 muted mt10">Riferimento comune per l’ipertrofia: 10-20 serie settimanali per gruppo muscolare.</p>
      </div>

      ${topEx.length ? `<div class="section-title">Esercizi più allenati</div>
        <div class="card">${barRows(topEx.map(([id, v]) => ({ lab: getEx(id).n, v: Math.round(v) })), { unit: '' })}</div>` : ''}

      ${prs.length ? `<div class="section-title">Record personali</div>
        <div class="card flush"><div class="rows">
          ${prs.map(([id, p]) => `<button class="row" data-ex="${id}">
            <span class="avatar acc">${icon('medal', 19)}</span>
            <span class="grow"><span class="t">${esc(getEx(id).n)}</span>
            <span class="s">1RM stimato ${Math.round(p.e1rm)} kg · max ${fmtWeight(p.weight)} kg × ${p.weightReps || '—'}</span></span>
            ${icon('chevR', 18)}</button>`).join('')}
        </div></div>` : ''}

      <div class="section-title">Peso corporeo <button data-act="measure">Aggiungi</button></div>
      <div class="card">
        ${wSeries.length > 1
          ? lineChart(wSeries, { h: 140, fmt: (v) => fmtWeight(v) + ' kg' })
          : `<div class="tc" style="padding:10px 0">
              <div style="font-size:30px;font-weight:800;letter-spacing:-.04em">${S.profile.bodyWeight ? fmtWeight(S.profile.bodyWeight) + ' kg' : '—'}</div>
              <p class="fs13 muted mt6">Registra il peso con regolarità per vedere l’andamento.</p>
              <button class="btn ghost sm mt10" data-act="measure">${icon('plus', 16)} Registra peso</button>
            </div>`}
        ${S.measures.length ? `<div class="divider"></div>
          <div class="flex between fs12 muted"><span>Ultima misura</span><span>${esc(fmtDate(S.measures[S.measures.length - 1].date))}</span></div>
          <div class="flex wrap gap6 mt6">
            ${Object.entries(S.measures[S.measures.length - 1]).filter(([k]) => !['id', 'date'].includes(k))
              .map(([k, v]) => `<span class="pill">${esc({ weight: 'Peso', bodyfat: 'BF', chest: 'Petto', waist: 'Vita', hips: 'Fianchi', arm: 'Braccio', thigh: 'Coscia', calf: 'Polpaccio' }[k] || k)} ${fmtWeight(v)}</span>`).join('')}
          </div>` : ''}
      </div>
      <div style="height:10px"></div>`;
  },

  mount(root) {
    on(root, 'click', '[data-p]', (e, t) => { period = Number(t.dataset.p); render(); });
    on(root, 'click', '[data-ex]', (e, t) => exerciseSheet(t.dataset.ex));
    on(root, 'click', '[data-act="measure"]', () => measureSheet());
  },
};
