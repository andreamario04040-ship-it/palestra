/* Catalogo esercizi: ricerca con suggerimenti, filtri, dettaglio, selettore. */

import {
  EXERCISES, MUSCLES, EQUIP, getEx, searchEx, makeCustom, norm, registerCustom,
} from '../data/exercises.js';
import {
  esc, openSheet, closeSheet, $, $$, on, fmtWeight, fmtDate, toast, promptSheet, debounce, plur,
} from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { mountFigure } from '../lib/anim.js';
import { S, save, historyOf, prOf } from '../lib/store.js';
import { e1rmSeries, setsByMuscle } from '../lib/coach.js';
import { lineChart } from '../lib/charts.js';

const MUSCLE_KEYS = Object.keys(MUSCLES);
const EQUIP_KEYS = Object.keys(EQUIP);

/* ------------------------------------------------------------ suggerimenti */

/** Esercizi usati di recente, dal più recente. */
export function recentExercises(n = 8) {
  const seen = new Set();
  const out = [];
  for (let i = S.sessions.length - 1; i >= 0 && out.length < n; i--) {
    for (const e of S.sessions[i].exercises || []) {
      if (seen.has(e.exId)) continue;
      seen.add(e.exId);
      out.push(e.exId);
      if (out.length >= n) break;
    }
  }
  return out;
}

/** Esercizi più frequenti nello storico. */
export function frequentExercises(n = 8) {
  const c = {};
  for (const s of S.sessions) for (const e of s.exercises || []) c[e.exId] = (c[e.exId] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => id);
}

/**
 * Esercizi consigliati: coprono i gruppi muscolari meno allenati nelle ultime
 * 4 settimane, evitando quelli già presenti nell'allenamento in corso.
 */
export function suggestedExercises(n = 6) {
  const since = Date.now() - 28 * 864e5;
  const by = setsByMuscle(S.sessions.filter((s) => new Date(s.date).getTime() >= since));
  const main = ['petto', 'dorso', 'spalle', 'quadricipiti', 'femorali', 'glutei', 'bicipiti', 'tricipiti', 'addome', 'polpacci'];
  const weak = main.map((m) => ({ m, v: by[m] || 0 })).sort((a, b) => a.v - b.v).slice(0, 3).map((x) => x.m);
  const inWorkout = new Set((S.current?.exercises || []).map((e) => e.exId));
  const freq = new Set(frequentExercises(20));
  const pool = EXERCISES.filter((e) => (e.m || []).some((m) => weak.includes(m)) && !inWorkout.has(e.id));
  // prima quelli che l'utente conosce già, poi i fondamentali
  pool.sort((a, b) => (freq.has(b.id) ? 1 : 0) - (freq.has(a.id) ? 1 : 0));
  const out = [];
  const used = {};
  for (const e of pool) {
    const m = e.m[0];
    if ((used[m] || 0) >= 2) continue;
    used[m] = (used[m] || 0) + 1;
    out.push(e.id);
    if (out.length >= n) break;
  }
  return out;
}

/** Ricerca tollerante ai refusi: usa un prefisso della query. */
function looseSearch(q, exclude = new Set()) {
  const nq = norm(q);
  if (nq.length < 3) return [];
  const base = nq.slice(0, Math.max(3, Math.ceil(nq.length * 0.62)));
  return EXERCISES
    .filter((e) => !exclude.has(e.id) && norm([e.n, ...(e.a || [])].join(' ')).includes(base))
    .slice(0, 6);
}

/**
 * Normalizza mantenendo la corrispondenza con gli indici della stringa
 * originale, così l'evidenziazione resta allineata anche con accenti.
 */
function normMap(str) {
  let out = '';
  const map = [];
  let lastSpace = true;
  for (let i = 0; i < str.length; i++) {
    let c = str[i].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!/^[a-z0-9]$/.test(c)) c = ' ';
    if (c === ' ') { if (lastSpace) continue; lastSpace = true; } else lastSpace = false;
    out += c;
    map.push(i);
  }
  while (out.endsWith(' ')) { out = out.slice(0, -1); map.pop(); }
  return { out, map };
}

/** Evidenzia nel nome la parte che corrisponde alla ricerca. */
function highlight(name, q) {
  const nq = norm(q);
  if (!nq) return esc(name);
  const { out, map } = normMap(name);
  const i = out.indexOf(nq);
  if (i < 0) return esc(name);
  const a = map[i];
  const b = (map[i + nq.length - 1] ?? map[map.length - 1]) + 1;
  return `${esc(name.slice(0, a))}<mark>${esc(name.slice(a, b))}</mark>${esc(name.slice(b))}`;
}

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
    foot: foot || (onAdd ? `<button class="btn primary block" data-add>${icon('plus', 19)} Aggiungi</button>` : null),
    onMount: (el) => {
      const fig = mountFigure($('#exAnim', el), ex.p, { cls: 'exfig lg' });
      el.addEventListener('sheetdestroy', () => fig.destroy());
    },
  });
  if (onAdd) sheet.querySelector('[data-add]')?.addEventListener('click', () => { closeSheet(); onAdd(ex); });
  return sheet;
}

/* --------------------------------------------------------------- picker -- */

function exRow(e, { chosen, q = '' } = {}) {
  const pr = prOf(e.id);
  const on_ = chosen?.has(e.id);
  return `<button class="row" data-pick="${e.id}">
    <span class="avatar ${on_ ? 'acc' : ''}">${on_ ? icon('check', 20) : icon('dumbbell', 20)}</span>
    <span class="grow"><span class="t">${highlight(e.n, q)}</span>
    <span class="s">${(e.m || []).map((m) => MUSCLES[m]?.n || m).join(', ')} · ${esc(EQUIP[e.eq] || '')}${pr ? ` · max ${fmtWeight(pr.weight)} kg` : ''}</span></span>
    <span class="chev" data-info="${e.id}">${icon('info', 19)}</span>
  </button>`;
}

function group(title, ids, opts) {
  const list = ids.map(getEx).filter((e) => e && e.n);
  if (!list.length) return '';
  return `<div class="section-title" style="margin-top:16px">${esc(title)}</div>
    <div class="card flush"><div class="rows">${list.map((e) => exRow(e, opts)).join('')}</div></div>`;
}

/** Selettore esercizi (singolo o multiplo) con suggerimenti. */
export function pickExercise(onPick, { multi = false, title = 'Scegli esercizio' } = {}) {
  const chosen = new Set();
  let q = '', mf = '', ef = '';

  const listHTML = () => {
    const opts = { chosen, q };

    // --- nessuna ricerca: mostro i suggerimenti ---
    if (!q && !mf && !ef) {
      const recent = recentExercises(6);
      const today = (S.current?.exercises || []).map((e) => e.exId);
      const freq = frequentExercises(6).filter((id) => !recent.includes(id));
      const sugg = suggestedExercises(5).filter((id) => !recent.includes(id) && !freq.includes(id));
      const blocks = [
        group('Nel tuo allenamento', today, opts),
        group('Usati di recente', recent, opts),
        group('I tuoi preferiti', freq, opts),
        group('Ti consiglio', sugg, opts),
      ].filter(Boolean).join('');
      const all = `<div class="section-title" style="margin-top:16px">Tutti gli esercizi</div>
        <div class="card flush"><div class="rows">${EXERCISES.slice(0, 40).map((e) => exRow(e, opts)).join('')}</div></div>
        <p class="fs12 muted tc mt14">Cerca per nome, muscolo o attrezzo per vedere tutti i ${EXERCISES.length}.</p>`;
      return (blocks || '') + all;
    }

    // --- ricerca / filtri ---
    let list = q ? searchEx(q) : EXERCISES;
    if (mf) list = list.filter((e) => (e.m || []).includes(mf) || (e.s || []).includes(mf));
    if (ef) list = list.filter((e) => e.eq === ef);

    const found = list.length
      ? `<div class="card flush" style="margin-top:12px"><div class="rows">${list.slice(0, 80).map((e) => exRow(e, opts)).join('')}</div></div>`
      : '';

    const loose = list.length < 3 && q ? looseSearch(q, new Set(list.map((e) => e.id))) : [];
    const didYouMean = loose.length
      ? `<div class="section-title" style="margin-top:18px">Forse cercavi</div>
         <div class="card flush"><div class="rows">${loose.map((e) => exRow(e, opts)).join('')}</div></div>`
      : '';

    const create = q && q.length >= 2
      ? `<button class="btn ghost block mt20" data-new>${icon('plus', 17)} Crea “${esc(q)}”</button>` : '';

    if (!found && !didYouMean) {
      return `<div class="empty"><div class="ico">${icon('search', 26)}</div><h3>Nessun risultato</h3>
        <p>Prova con un altro termine o crealo come esercizio personalizzato.</p></div>${create}`;
    }
    return found + didYouMean + create;
  };

  const sheet = openSheet({
    title,
    body: `
      <div class="field" style="margin-bottom:10px">
        <input class="input" data-q placeholder="Cerca fra ${EXERCISES.length} esercizi…" autocomplete="off"
          autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search">
      </div>
      <div class="chips" data-mf>
        <button class="chip on" data-m="">Tutti</button>
        ${MUSCLE_KEYS.map((m) => `<button class="chip" data-m="${m}">${esc(MUSCLES[m].n)}</button>`).join('')}
      </div>
      <div class="chips" data-ef style="margin-top:6px">
        <button class="chip on" data-e="">Ogni attrezzo</button>
        ${EQUIP_KEYS.map((k) => `<button class="chip" data-e="${k}">${esc(EQUIP[k])}</button>`).join('')}
      </div>
      <div data-list>${listHTML()}</div>`,
    foot: multi ? `<button class="btn ghost" data-cancel>Annulla</button><button class="btn primary" data-done>Aggiungi <span data-n>0</span></button>` : null,
    onMount: (el) => {
      const redraw = () => { $('[data-list]', el).innerHTML = listHTML(); };
      const qIn = $('[data-q]', el);
      qIn.addEventListener('input', debounce(() => { q = qIn.value.trim(); redraw(); }, 140));
      on(el, 'click', '[data-m]', (e, t) => {
        $$('[data-mf] .chip', el).forEach((c) => c.classList.remove('on'));
        t.classList.add('on'); mf = t.dataset.m; redraw();
      });
      on(el, 'click', '[data-e]', (e, t) => {
        $$('[data-ef] .chip', el).forEach((c) => c.classList.remove('on'));
        t.classList.add('on'); ef = t.dataset.e; redraw();
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
        registerCustom(S.customEx);
        save();
        closeSheet();
        onPick(multi ? [c] : c);
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

let vq = '', vmf = '', vef = '';

export default {
  render() {
    return `
      <div class="topbar">
        <button class="icon-btn" data-act="back">${icon('chevL', 20)}</button>
        <div class="grow" style="text-align:center;min-width:0">
          <div class="fw7" style="font-size:17px;letter-spacing:-.02em">Esercizi</div>
          <div class="sub">${plur(EXERCISES.length, 'scheda tecnica', 'schede tecniche')}</div>
        </div>
        <div style="width:40px"></div>
      </div>
      <div class="field"><input class="input" data-q placeholder="Cerca esercizio, muscolo, attrezzo…" value="${esc(vq)}"
        autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search"></div>
      <div class="chips" data-mf>
        <button class="chip ${vmf ? '' : 'on'}" data-m="">Tutti</button>
        ${MUSCLE_KEYS.map((m) => `<button class="chip ${vmf === m ? 'on' : ''}" data-m="${m}">${esc(MUSCLES[m].n)}</button>`).join('')}
      </div>
      <div class="chips" data-ef style="margin-top:6px">
        <button class="chip ${vef ? '' : 'on'}" data-e="">Ogni attrezzo</button>
        ${EQUIP_KEYS.map((k) => `<button class="chip ${vef === k ? 'on' : ''}" data-e="${k}">${esc(EQUIP[k])}</button>`).join('')}
      </div>
      <div data-list class="mt14"></div>`;
  },

  mount(root) {
    const draw = () => {
      let list = vq ? searchEx(vq) : EXERCISES;
      if (vmf) list = list.filter((e) => (e.m || []).includes(vmf) || (e.s || []).includes(vmf));
      if (vef) list = list.filter((e) => e.eq === vef);
      const recent = !vq && !vmf && !vef ? recentExercises(5) : [];
      $('[data-list]', root).innerHTML = (recent.length
        ? `<div class="section-title" style="margin-top:0">Usati di recente</div>
           <div class="card flush"><div class="rows">${recent.map((id) => {
             const e = getEx(id);
             return `<button class="row" data-open="${e.id}"><span class="avatar acc">${icon('refresh', 19)}</span>
               <span class="grow"><span class="t">${esc(e.n)}</span><span class="s">${(e.m || []).map((m) => MUSCLES[m]?.n || m).join(', ')}</span></span>
               ${icon('chevR', 18)}</button>`;
           }).join('')}</div></div><div class="section-title">Tutti</div>` : '')
        + (list.length
          ? `<div class="card flush"><div class="rows">${list.map((e) => {
              const pr = prOf(e.id);
              return `<button class="row" data-open="${e.id}">
                <span class="avatar">${icon('dumbbell', 20)}</span>
                <span class="grow"><span class="t">${highlight(e.n, vq)}</span>
                <span class="s">${(e.m || []).map((m) => MUSCLES[m]?.n || m).join(', ')} · ${esc(EQUIP[e.eq] || '')}</span></span>
                ${pr ? `<span class="pill acc">${fmtWeight(pr.weight)} kg</span>` : ''}
                <span class="chev">${icon('chevR', 18)}</span></button>`;
            }).join('')}</div></div>`
          : `<div class="empty"><div class="ico">${icon('search', 26)}</div><h3>Nessun risultato</h3><p>Prova con un altro termine.</p></div>`);
    };
    draw();
    const qIn = $('[data-q]', root);
    qIn.addEventListener('input', debounce(() => { vq = qIn.value.trim(); draw(); }, 140));
    on(root, 'click', '[data-m]', (e, t) => {
      $$('[data-mf] .chip', root).forEach((c) => c.classList.remove('on'));
      t.classList.add('on'); vmf = t.dataset.m; draw();
    });
    on(root, 'click', '[data-e]', (e, t) => {
      $$('[data-ef] .chip', root).forEach((c) => c.classList.remove('on'));
      t.classList.add('on'); vef = t.dataset.e; draw();
    });
    on(root, 'click', '[data-open]', (e, t) => exerciseSheet(t.dataset.open));
  },
};
