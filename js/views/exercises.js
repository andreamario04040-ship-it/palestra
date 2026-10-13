/* Catalogo esercizi: ricerca, filtri, scheda di dettaglio, selettore. */

import { EXERCISES, MUSCLES, EQUIP, getEx, searchEx, makeCustom } from '../data/exercises.js';
import { esc, openSheet, closeSheet, $, $$, on, fmtWeight, fmtDate, toast, promptSheet, debounce } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { mountFigure } from '../lib/anim.js';
import { S, save, historyOf, prOf } from '../lib/store.js';
import { e1rmSeries, parseReps } from '../lib/coach.js';
import { lineChart } from '../lib/charts.js';

const MUSCLE_KEYS = Object.keys(MUSCLES);

/* ------------------------------------------------------- scheda dettaglio */

export function exerciseSheet(exId, { onAdd = null, foot = null } = {}) {
  const ex = getEx(exId);
  const hist = historyOf(exId);
  const pr = prOf(exId);
  const series = e1rmSeries(exId);

  const body = `
    <div id="exAnim" style="display:grid;place-items:center;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-lg);padding:6px 0;margin-bottom:14px"></div>
    <div class="flex wrap gap6" style="margin-bottom:14px">
      ${(ex.m || []).map((m) => `<span class="pill acc">${esc(MUSCLES[m]?.n || m)}</span>`).join('')}
      ${(ex.s || []).map((m) => `<span class="pill">${esc(MUSCLES[m]?.n || m)}</span>`).join('')}
      <span class="pill">${esc(EQUIP[ex.eq] || ex.eq)}</span>
      <span class="pill">${esc(ex.rr)} rip.</span>
      <span class="pill">${ex.rest}s rec.</span>
    </div>

    ${ex.c?.length ? `<div class="section-title" style="margin-top:4px">Esecuzione</div>
      <ul class="cues">${ex.c.map((c, i) => `<li><span class="n">${i + 1}</span><span>${esc(c)}</span></li>`).join('')}</ul>` : ''}

    ${ex.e?.length ? `<div class="section-title">Errori comuni</div>
      <ul class="cues warn">${ex.e.map((c) => `<li><span class="n">!</span><span>${esc(c)}</span></li>`).join('')}</ul>` : ''}

    ${pr ? `<div class="section-title">I tuoi record</div>
      <div class="stat-row">
        <div class="stat"><div class="v">${fmtWeight(pr.weight)}<span class="u">kg</span></div><div class="k">Carico max</div></div>
        <div class="stat"><div class="v">${Math.round(pr.e1rm)}<span class="u">kg</span></div><div class="k">1RM stimato</div></div>
        <div class="stat"><div class="v">${pr.reps}</div><div class="k">Rip. max</div></div>
      </div>` : ''}

    ${series.length > 1 ? `<div class="section-title">Progressione 1RM stimato</div>
      <div class="card">${lineChart(series.map((p) => ({ v: p.v })), { h: 120, fmt: (v) => Math.round(v) + ' kg' })}</div>` : ''}

    ${hist.length ? `<div class="section-title">Ultimi allenamenti</div>
      <div class="card flush"><div class="rows">
      ${hist.slice(0, 8).map((h) => `<div class="row">
        <div class="grow"><div class="t">${esc(fmtDate(h.date))}</div>
        <div class="s">${h.sets.map((s) => `${fmtWeight(s.weight)}×${s.reps}`).join(' · ')}</div></div>
      </div>`).join('')}
      </div></div>` : '<p class="muted fs13" style="margin-top:16px">Nessuno storico: fai la prima serie e inizierò a suggerirti i carichi.</p>'}
    <div style="height:8px"></div>`;

  const sheet = openSheet({
    title: ex.n,
    body,
    foot: foot || (onAdd ? `<button class="btn primary block" data-add>${icon('plus', 19)} Aggiungi alla scheda</button>` : null),
    onMount: (el) => {
      const fig = mountFigure($('#exAnim', el), ex.p, { cls: 'exfig lg' });
      el.addEventListener('sheetdestroy', () => fig.destroy());
    },
  });
  if (onAdd) sheet.querySelector('[data-add]')?.addEventListener('click', () => { closeSheet(); onAdd(ex); });
  return sheet;
}

/* --------------------------------------------------------------- picker -- */

/** Selettore esercizi (multi o singolo) usato da scheda e allenamento. */
export function pickExercise(onPick, { multi = false, title = 'Scegli esercizio' } = {}) {
  const chosen = new Set();

  const listHTML = (q, mf) => {
    let list = q ? searchEx(q) : EXERCISES;
    if (mf) list = list.filter((e) => (e.m || []).includes(mf) || (e.s || []).includes(mf));
    if (!list.length) {
      return `<div class="empty"><div class="ico">${icon('search', 26)}</div><h3>Nessun risultato</h3>
        <p>Puoi crearlo come esercizio personalizzato.</p>
        <button class="btn sm ghost" data-new>${icon('plus', 17)} Crea "${esc(q)}"</button></div>`;
    }
    return `<div class="card flush"><div class="rows">${list.slice(0, 120).map((e) => `
      <button class="row" data-pick="${e.id}">
        <span class="avatar ${chosen.has(e.id) ? 'acc' : ''}">${chosen.has(e.id) ? icon('check', 20) : icon('dumbbell', 20)}</span>
        <span class="grow"><span class="t">${esc(e.n)}</span>
        <span class="s">${(e.m || []).map((m) => MUSCLES[m]?.n || m).join(', ')} · ${esc(EQUIP[e.eq] || '')}</span></span>
        <span class="chev" data-info="${e.id}">${icon('info', 19)}</span>
      </button>`).join('')}</div></div>`;
  };

  const sheet = openSheet({
    title,
    body: `
      <div class="field" style="margin-bottom:10px">
        <input class="input" data-q placeholder="Cerca fra ${EXERCISES.length} esercizi…" autocomplete="off">
      </div>
      <div class="chips" data-mf>
        <button class="chip on" data-m="">Tutti</button>
        ${MUSCLE_KEYS.map((m) => `<button class="chip" data-m="${m}">${esc(MUSCLES[m].n)}</button>`).join('')}
      </div>
      <div data-list style="margin-top:10px">${listHTML('', '')}</div>`,
    foot: multi ? `<button class="btn ghost" data-cancel>Annulla</button><button class="btn primary" data-done>Aggiungi <span data-n>0</span></button>` : null,
    onMount: (el) => {
      let q = '', mf = '';
      const redraw = () => { $('[data-list]', el).innerHTML = listHTML(q, mf); };
      const qIn = $('[data-q]', el);
      qIn.addEventListener('input', debounce(() => { q = qIn.value.trim(); redraw(); }, 160));
      on(el, 'click', '[data-m]', (e, t) => {
        $$('[data-mf] .chip', el).forEach((c) => c.classList.remove('on'));
        t.classList.add('on'); mf = t.dataset.m; redraw();
      });
      on(el, 'click', '[data-pick]', (e, t) => {
        const id = t.dataset.pick;
        if (e.target.closest('[data-info]')) { exerciseSheet(id); return; }
        if (multi) {
          chosen.has(id) ? chosen.delete(id) : chosen.add(id);
          $('[data-n]', el).textContent = chosen.size;
          redraw();
        } else { closeSheet(); onPick(getEx(id)); }
      });
      on(el, 'click', '[data-new]', async () => {
        const name = await promptSheet('Nuovo esercizio', { value: q, label: 'Nome', ok: 'Crea' });
        if (!name) return;
        const c = makeCustom(name);
        S.customEx = [...(S.customEx || []), c];
        const { registerCustom } = await import('../data/exercises.js');
        registerCustom(S.customEx);
        save();
        closeSheet();
        onPick(c);
      });
      $('[data-cancel]', el)?.addEventListener('click', () => closeSheet());
      $('[data-done]', el)?.addEventListener('click', () => {
        if (!chosen.size) { toast('Seleziona almeno un esercizio'); return; }
        closeSheet();
        onPick([...chosen].map((id) => getEx(id)));
      });
    },
  });
  return sheet;
}

/* ------------------------------------------------------------- vista ---- */

let vq = '', vmf = '';

export default {
  render() {
    return `
      <div class="topbar">
        <div><h1>Esercizi</h1><div class="sub">${EXERCISES.length} schede tecniche</div></div>
        <button class="icon-btn" data-act="back">${icon('chevL', 20)}</button>
      </div>
      <div class="field"><input class="input" data-q placeholder="Cerca esercizio, muscolo, attrezzo…" value="${esc(vq)}"></div>
      <div class="chips" data-mf>
        <button class="chip ${vmf ? '' : 'on'}" data-m="">Tutti</button>
        ${MUSCLE_KEYS.map((m) => `<button class="chip ${vmf === m ? 'on' : ''}" data-m="${m}">${esc(MUSCLES[m].n)}</button>`).join('')}
      </div>
      <div data-list class="mt14"></div>`;
  },
  mount(root) {
    const draw = () => {
      let list = vq ? searchEx(vq) : EXERCISES;
      if (vmf) list = list.filter((e) => (e.m || []).includes(vmf) || (e.s || []).includes(vmf));
      $('[data-list]', root).innerHTML = list.length
        ? `<div class="card flush"><div class="rows">${list.map((e) => {
            const pr = prOf(e.id);
            return `<button class="row" data-open="${e.id}">
              <span class="avatar">${icon('dumbbell', 20)}</span>
              <span class="grow"><span class="t">${esc(e.n)}</span>
              <span class="s">${(e.m || []).map((m) => MUSCLES[m]?.n || m).join(', ')} · ${esc(EQUIP[e.eq] || '')}</span></span>
              ${pr ? `<span class="pill acc">${fmtWeight(pr.weight)} kg</span>` : ''}
              <span class="chev">${icon('chevR', 18)}</span></button>`;
          }).join('')}</div></div>`
        : `<div class="empty"><div class="ico">${icon('search', 26)}</div><h3>Nessun risultato</h3><p>Prova con un altro termine.</p></div>`;
    };
    draw();
    const qIn = $('[data-q]', root);
    qIn.addEventListener('input', debounce(() => { vq = qIn.value.trim(); draw(); }, 160));
    on(root, 'click', '[data-m]', (e, t) => {
      $$('[data-mf] .chip', root).forEach((c) => c.classList.remove('on'));
      t.classList.add('on'); vmf = t.dataset.m; draw();
    });
    on(root, 'click', '[data-open]', (e, t) => exerciseSheet(t.dataset.open));
  },
};
