/* =========================================================================
   Allenamento in corso.
   Principio guida: carico e ripetizioni sono già proposti, all'utente basta
   premere "Completa serie". Recupero, avanzamento, superset e record
   succedono da soli.
   ========================================================================= */

import {
  S, save, addSession, idx, prOf, historyOf, sessionVolume, sessionSets,
  getRoutine, isWork, SET_TYPES, newRow,
} from '../lib/store.js';
import { getEx, stepFor, MUSCLES } from '../data/exercises.js';
import {
  suggest, parseReps, warmupSets, plateBreakdown, detectPRs, tipFor, prevSet,
} from '../lib/coach.js';
import {
  esc, uid, $, $$, on, fmtDur, fmtDurShort, fmtWeight, fmtVol, fmtVolume, toast, sparkle,
  openSheet, closeSheet, confirmSheet, promptSheet, beep, chime, vibrate,
  centerInScroller, clamp, numField, plur,
} from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { mountFigure } from '../lib/anim.js';
import { ring } from '../lib/charts.js';
import { exerciseSheet, pickExercise } from './exercises.js';

/* ------------------------------------------------------------------ stato */

export const isWorkoutOpen = () => !!S.current;
const W = () => S.current;

let tickTimer = null;
let fig = null, figEx = null, wakeLock = null;

const SS_COLORS = ['#8b7bff', '#4cd7f6', '#ffb020', '#f06595', '#35d07f'];

/* -------------------------------------------------------------- avvio ---- */

function buildExercise(row) {
  const ex = getEx(row.exId);
  const n = Math.max(1, row.sets || 3);
  const sets = [];
  for (let i = 0; i < n; i++) {
    const sg = suggest(row.exId, i, row);
    sets.push({ id: uid(), weight: sg.weight, reps: sg.reps, rpe: null, type: 'n', done: false });
  }
  return {
    exId: row.exId,
    rowId: row.id || uid(),
    targetReps: row.reps || ex.rr,
    targetSets: n,
    rest: row.rest || ex.rest || S.settings.restDefault,
    note: row.note || '',
    superset: row.superset || null,
    sets,
  };
}

export function startWorkout(routine, day) {
  const prBefore = {};
  for (const [k, v] of Object.entries(idx().pr)) prBefore[k] = { ...v };
  S.current = {
    id: uid(),
    routineId: routine?.id || null,
    dayId: day?.id || null,
    name: day?.name || routine?.name || 'Allenamento',
    startedAt: new Date().toISOString(),
    exercises: (day?.exercises || []).map(buildExercise),
    cursor: { ex: 0, set: 0 },
    rest: null,
    note: '',
    prBefore,
  };
  save();
  requestWakeLock();
  import('../app.js').then((m) => m.render());
}

export function quickStart() {
  if (S.current) { import('../app.js').then((m) => m.render()); return; }
  const rt = S.routines.find((r) => r.id === S.activeRoutineId) || S.routines[0];
  const last = S.sessions[S.sessions.length - 1];
  openSheet({
    title: 'Inizia allenamento',
    body: `<div class="card flush"><div class="rows">
      ${S.routines.map((r) => r.days.map((d) => `
        <button class="row" data-r="${r.id}" data-d="${d.id}">
          <span class="avatar ${r.id === rt?.id ? 'acc' : ''}">${icon('dumbbell', 19)}</span>
          <span class="grow"><span class="t">${esc(d.name)}</span><span class="s">${esc(r.name)} · ${plur(d.exercises.length, 'esercizio', 'esercizi')}</span></span>
          ${icon('chevR', 18)}</button>`).join('')).join('')}
      ${last ? `<button class="row" data-repeat="${last.id}">
        <span class="avatar">${icon('refresh', 19)}</span>
        <span class="grow"><span class="t">Ripeti l’ultimo allenamento</span><span class="s">${esc(last.name || 'Allenamento')} · ${plur(last.exercises.length, 'esercizio', 'esercizi')}</span></span>
        ${icon('chevR', 18)}</button>` : ''}
      <button class="row" data-free>
        <span class="avatar">${icon('bolt', 19)}</span>
        <span class="grow"><span class="t">Allenamento libero</span><span class="s">Aggiungi gli esercizi mentre ti alleni</span></span>
        ${icon('chevR', 18)}</button>
    </div></div>`,
    onMount: (el) => {
      on(el, 'click', '[data-r]', (e, t) => {
        const r = S.routines.find((x) => x.id === t.dataset.r);
        const d = r?.days.find((x) => x.id === t.dataset.d);
        closeSheet();
        if (r && d) startWorkout(r, d);
      });
      on(el, 'click', '[data-repeat]', (e, t) => {
        const sess = S.sessions.find((x) => x.id === t.dataset.repeat);
        closeSheet();
        if (!sess) return;
        startWorkout(null, {
          id: null,
          name: sess.name || 'Allenamento',
          exercises: sess.exercises.map((x) => newRow(x.exId, {
            sets: x.sets.filter(isWork).length || 3,
            reps: getEx(x.exId).rr,
            rest: getEx(x.exId).rest,
          })),
        });
      });
      $('[data-free]', el).onclick = () => { closeSheet(); startWorkout(null, { id: null, name: 'Allenamento libero', exercises: [] }); };
    },
  });
}

/* ------------------------------------------------------ banner "riprendi" */

export function resumeBanner() {
  if (!S.current) return '';
  const w = S.current;
  const done = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  return `<button class="card tappable flex center gap12" style="width:100%;text-align:left;border-color:var(--acc);background:var(--acc-soft);margin-bottom:14px" data-act="resume">
    <span class="avatar acc">${icon('play', 20)}</span>
    <span class="grow"><span class="t fw7">Allenamento in corso</span>
    <span class="s">${esc(w.name)} · ${done === 1 ? '1 serie completata' : done + ' serie completate'}</span></span>
    ${icon('chevR', 18)}</button>`;
}

/* ------------------------------------------------------------- rendering */

export function renderWorkout() {
  return `<div class="wk">
    <div class="wk-head">
      <button class="icon-btn ghost" data-act="minimize" aria-label="Riduci">${icon('chevD', 22)}</button>
      <div class="t">
        <div class="n">${esc(W().name)}</div>
        <div class="m"><span id="wkClock">0:00</span> · <span id="wkStats"></span></div>
      </div>
      <button class="icon-btn ghost" data-act="wmenu" aria-label="Menu">${icon('more', 22)}</button>
    </div>
    <div class="wk-prog"><i id="wkProg" style="width:0%"></i></div>
    <div class="wk-body" id="wkBody"></div>
    <div class="rail" id="wkRail"></div>
  </div>`;
}

function curEx() { const w = W(); return w.exercises[w.cursor.ex] || null; }

function progress() {
  const w = W();
  let tot = 0, done = 0;
  for (const e of w.exercises) for (const s of e.sets) { tot++; if (s.done) done++; }
  return { tot, done, pct: tot ? done / tot : 0 };
}

/** Volume e serie di lavoro accumulati finora. */
function liveStats() {
  const w = W();
  let vol = 0, sets = 0;
  for (const e of w.exercises) {
    for (const s of e.sets) {
      if (!s.done || !isWork(s)) continue;
      sets++;
      vol += (Number(s.weight) || 0) * (Number(s.reps) || 0);
    }
  }
  return { vol, sets };
}

/** Indice della serie fra le sole serie di lavoro (per il confronto storico). */
function workOrdinal(ex, k) {
  let n = 0;
  for (let i = 0; i < k; i++) if (isWork(ex.sets[i])) n++;
  return n;
}

/** Esercizi che compongono il superset dell'esercizio corrente. */
function ssGroup(gid) {
  if (!gid) return [];
  return W().exercises.map((e, i) => ({ e, i })).filter((x) => x.e.superset === gid);
}

function ssColor(gid) {
  if (!gid) return null;
  const all = [...new Set(W().exercises.map((e) => e.superset).filter(Boolean))];
  return SS_COLORS[all.indexOf(gid) % SS_COLORS.length];
}

function bodyHTML() {
  const w = W();
  const e = curEx();
  if (!e) {
    return `<div class="empty" style="padding-top:40px">
      <div class="ico">${icon('plus', 28)}</div>
      <h3>Allenamento libero</h3><p>Aggiungi il primo esercizio per iniziare.</p>
      <button class="btn primary" data-act="addex">${icon('plus', 18)} Aggiungi esercizio</button></div>`;
  }
  const ex = getEx(e.exId);
  const i = clamp(w.cursor.set, 0, e.sets.length - 1);
  const set = e.sets[i];
  const rr = parseReps(e.targetReps);
  const sg = suggest(e.exId, workOrdinal(e, i), { reps: e.targetReps, sets: e.sets.length });
  const allDone = e.sets.every((s) => s.done);
  const pr = prOf(e.exId);
  const isTimed = rr.timed || ex.timed;
  const col = ssColor(e.superset);
  const group = ssGroup(e.superset);

  return `
    <div class="ex-hero"${col ? ` style="border-color:${col}55"` : ''}>
      ${col ? `<div class="ss-bar" style="background:${col}">
        ${icon('layers', 13)} Superset · ${group.map((x) => esc(getEx(x.e.exId).n.split(' ')[0])).join(' + ')}
      </div>` : ''}
      <div class="anim-wrap">
        <div class="tgt">
          <span class="pill acc">${e.sets.filter(isWork).length} × ${esc(String(e.targetReps))}</span>
          ${pr ? `<span class="pill">${icon('trophy', 12)} ${fmtWeight(pr.weight)} kg</span>` : ''}
        </div>
        <button class="info-fab" data-act="exinfo" aria-label="Tecnica">${icon('info', 18)}</button>
        <div id="wkFig"></div>
      </div>
      <div class="meta">
        <div class="flex center gap8">
          <h2 class="grow">${esc(ex.n)}</h2>
          <button class="icon-btn ghost" style="width:34px;height:34px;flex:none" data-act="exmenu" aria-label="Opzioni esercizio">${icon('more', 19)}</button>
        </div>
        <div class="sub">${(ex.m || []).map((m) => MUSCLES[m]?.n || m).join(' · ')} · rec ${e.rest}s</div>
        ${e.note ? `<div class="ex-note">${icon('note', 13)} ${esc(e.note)}</div>` : ''}
      </div>

      <div class="set-head">
        <div class="big">${allDone ? 'Esercizio completato' : `Serie ${i + 1} di ${e.sets.length}${set.type !== 'n' ? ' · ' + SET_TYPES[set.type].name.toLowerCase() : ''}`}</div>
        ${!allDone && sg.tone !== 'new' ? `<div class="hint">${sg.tone === 'up' ? '↑ progressione' : sg.tone === 'down' ? '↓ scarico' : 'mantieni'}</div>` : ''}
      </div>

      <div class="inputs">
        ${numField('weight', set.weight, 'kg', 'decimal')}
        ${numField('reps', set.reps, isTimed ? 'secondi' : 'ripetizioni', 'numeric')}
      </div>

      ${S.settings.rpe && !allDone ? `<div class="rpe-row">
        <span class="rpe-lab">RPE</span>
        ${[6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((v) => `<button class="rpe ${set.rpe === v ? 'on' : ''}" data-rpe="${v}">${String(v).replace('.', ',')}</button>`).join('')}
      </div>` : ''}

      ${!allDone && sg.why ? `<div class="coach">${icon('bulb', 17)}<div>${esc(sg.why)}</div></div>` : ''}

      <div class="cta-wrap">
        ${allDone
          ? `<button class="btn ghost lg" data-act="addset" aria-label="Aggiungi serie">${icon('plus', 18)}</button>
             <button class="btn primary lg" style="flex:1" data-act="next">Prossimo esercizio ${icon('chevR', 18)}</button>`
          : `<button class="btn ghost lg" data-act="plates" aria-label="Dischi">${icon('layers', 18)}</button>
             <button class="btn primary lg" data-act="done">${icon('check', 20)} Completa serie</button>`}
      </div>
    </div>

    <div class="sets-log">
      <div class="log-head">
        <span class="c-idx">Serie</span>
        <span class="c-prev">Precedente</span>
        <span class="c-val">kg × rip.</span>
        <span class="c-act"></span>
      </div>
      ${e.sets.map((s, k) => {
        const p = isWork(s) ? prevSet(e.exId, workOrdinal(e, k)) : null;
        const st = SET_TYPES[s.type] || SET_TYPES.n;
        return `
        <div class="set-line ${s.done ? 'done' : ''} ${!s.done && k === i ? 'cur' : ''}" data-set="${k}">
          <button class="idx ${st.cls}" data-act="settype" data-k="${k}" aria-label="Tipo serie">${st.lab || (workOrdinal(e, k) + 1)}</button>
          <span class="prev">${p ? `${p.weight != null ? fmtWeight(p.weight) + '×' : ''}${p.reps}` : '—'}</span>
          <span class="val">${s.weight != null && s.weight !== '' ? fmtWeight(s.weight) : '—'}<i>×</i>${s.reps ?? '—'}${s.rpe ? `<em>@${String(s.rpe).replace('.', ',')}</em>` : ''}</span>
          <span class="act">
            ${s.done
              ? `<button class="mini" data-act="undo" data-k="${k}" aria-label="Annulla">${icon('refresh', 15)}</button>`
              : `<button class="mini" data-act="quickdone" data-k="${k}" aria-label="Completa">${icon('check', 15)}</button>`}
            <button class="mini" data-act="delset" data-k="${k}" aria-label="Elimina">${icon('x', 15)}</button>
          </span>
        </div>`;
      }).join('')}
      <div class="flex gap8 mt10 wrap">
        <button class="btn ghost sm" data-act="addset">${icon('plus', 16)} Serie</button>
        ${S.settings.warmup && !e.sets.some((s) => s.type === 'w') ? `<button class="btn ghost sm" data-act="warm">${icon('flame', 16)} Riscaldamento</button>` : ''}
        <button class="btn ghost sm" data-act="exnote">${icon('note', 16)} Nota</button>
        <button class="btn ghost sm" data-act="rest">${icon('timer', 16)} ${e.rest}s</button>
      </div>
    </div>

    ${progress().done === progress().tot && progress().tot > 0
      ? `<button class="btn primary block xl mt20" data-act="finish">${icon('checkCircle', 20)} Termina allenamento</button>`
      : `<button class="btn ghost block mt20" data-act="addex">${icon('plus', 18)} Aggiungi esercizio</button>`}
    <div style="height:18px"></div>`;
}

function railHTML() {
  const w = W();
  return w.exercises.map((e, k) => {
    const done = e.sets.filter((s) => s.done).length;
    const full = done === e.sets.length && e.sets.length > 0;
    const col = ssColor(e.superset);
    return `<button class="rail-item ${k === w.cursor.ex ? 'on' : ''} ${full ? 'ok' : ''}" data-act="jump" data-k="${k}"
      ${col ? `style="border-left:3px solid ${col}"` : ''}>
      <div class="n">${esc(getEx(e.exId).n)}</div>
      <div class="p">${full ? '✓ completato' : `${done}/${e.sets.length} serie`}</div>
    </button>`;
  }).join('') + `<button class="rail-item add" data-act="addex" aria-label="Aggiungi esercizio">${icon('plus', 20)}</button>`;
}

/* ------------------------------------------------------------- aggiorna -- */

function refresh({ figure = true } = {}) {
  const body = $('#wkBody'), rail = $('#wkRail');
  if (!body) return;
  body.innerHTML = bodyHTML();
  rail.innerHTML = railHTML();
  const p = progress();
  $('#wkProg').style.width = (p.pct * 100).toFixed(1) + '%';
  const ls = liveStats();
  const st = $('#wkStats');
  if (st) st.textContent = `${ls.sets} serie · ${fmtVol(ls.vol)}`;

  const e = curEx();
  const host = $('#wkFig');
  if (host && e) {
    if (figure || figEx !== e.exId) {
      fig?.destroy();
      fig = mountFigure(host, getEx(e.exId).p, { cls: 'exfig' });
      figEx = e.exId;
    }
  }
  centerInScroller($('#wkRail .rail-item.on'));
  save();
}

/* ----------------------------------------------------------- interazioni */

function readInputs() {
  const e = curEx();
  if (!e) return;
  const s = e.sets[clamp(W().cursor.set, 0, e.sets.length - 1)];
  const wv = $('[data-f="weight"]')?.value;
  const rv = $('[data-f="reps"]')?.value;
  if (wv !== undefined) s.weight = wv === '' ? null : Number(String(wv).replace(',', '.'));
  if (rv !== undefined) s.reps = rv === '' ? null : Math.round(Number(rv));
}

function bump(field, dir) {
  const e = curEx();
  if (!e) return;
  const s = e.sets[clamp(W().cursor.set, 0, e.sets.length - 1)];
  readInputs();
  if (field === 'weight') {
    const st = stepFor(getEx(e.exId));
    s.weight = Math.max(0, Math.round(((Number(s.weight) || 0) + dir * st) * 100) / 100);
    $('[data-f="weight"]').value = String(s.weight).replace('.', ',');
  } else {
    s.reps = Math.max(0, (Number(s.reps) || 0) + dir);
    $('[data-f="reps"]').value = s.reps;
  }
  vibrate(8);
  save();
}

/** Registra la serie `k` (default: quella corrente) e decide il passo successivo. */
function completeSet(k = null) {
  const w = W();
  const e = curEx();
  if (!e) return;
  const i = k == null ? clamp(w.cursor.set, 0, e.sets.length - 1) : k;
  if (k == null) readInputs();
  const s = e.sets[i];
  if (s.reps == null || s.reps === '' || Number(s.reps) <= 0) {
    toast('Inserisci le ripetizioni', 'err');
    return;
  }
  s.done = true;
  s.ts = new Date().toISOString();
  vibrate(18);
  if (isWork(s)) checkInstantPR(e.exId, Number(s.weight) || 0, Number(s.reps) || 0);

  const p0 = progress();
  if (p0.done === p0.tot) { refresh({ figure: false }); setTimeout(() => finishSheet(), 350); return; }

  // --- superset: passa al compagno di giro invece di recuperare ---
  const group = ssGroup(e.superset);
  if (group.length > 1) {
    const pos = group.findIndex((x) => x.i === w.cursor.ex);
    const after = [...group.slice(pos + 1), ...group.slice(0, pos)];
    const nextInGroup = after.find((x) => x.e.sets.some((y) => !y.done));
    if (nextInGroup && pos < group.length - 1) {
      w.cursor.ex = nextInGroup.i;
      w.cursor.set = nextInGroup.e.sets.findIndex((y) => !y.done);
      refresh({ figure: true });
      toast(`${icon('layers', 15)} Superset: passa a ${esc(getEx(nextInGroup.e.exId).n)}`, '', 2200);
      return;
    }
    if (nextInGroup) {
      w.cursor.ex = nextInGroup.i;
      w.cursor.set = nextInGroup.e.sets.findIndex((y) => !y.done);
      refresh({ figure: true });
      startRest(e.rest || S.settings.restDefault);
      return;
    }
  }

  // --- avanzamento normale ---
  const nextSet = e.sets.findIndex((x, n) => n > i && !x.done);
  let advanced = false;
  if (nextSet >= 0) w.cursor.set = nextSet;
  else if (S.settings.autoAdvance) {
    const nextEx = w.exercises.findIndex((x, n) => n > w.cursor.ex && x.sets.some((y) => !y.done));
    if (nextEx >= 0) {
      w.cursor.ex = nextEx;
      w.cursor.set = w.exercises[nextEx].sets.findIndex((x) => !x.done);
      advanced = true;
    }
  }
  refresh({ figure: advanced });

  if (s.type === 'd') return;                               // drop set: nessun recupero
  if (s.type === 'w') { startRest(Math.min(60, e.rest)); return; }
  if (S.settings.autoRest) startRest(e.rest || S.settings.restDefault);
}

function checkInstantPR(exId, w, r) {
  const before = W().prBefore[exId];
  if (!before || !w) return;
  if (w > (before.weight || 0)) {
    before.weight = w;
    sparkle();
    toast(`${icon('trophy', 16)} Record di carico: ${fmtWeight(w)} kg`, 'pr', 3600);
    vibrate([20, 60, 20]);
  }
}

/* ----------------------------------------------------- timer di recupero */

let restTimer = null;

export function startRest(sec) {
  const w = W();
  if (!sec || sec <= 0) return;
  w.rest = { endsAt: Date.now() + sec * 1000, duration: sec };
  save();
  showRest();
}

function showRest() {
  let el = $('#restOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'restOverlay';
    el.className = 'rest';
    document.body.appendChild(el);
  }
  const w = W();
  const e = curEx();
  const ex = e ? getEx(e.exId) : null;
  const i = e ? clamp(w.cursor.set, 0, e.sets.length - 1) : 0;
  const nxt = e ? e.sets[i] : null;
  const tip = e ? tipFor(e.exId, e.sets.filter((s) => s.done).length) : null;

  el.innerHTML = `
    <div class="lab">Recupero</div>
    <div class="dial">
      <svg viewBox="0 0 100 100">${ring(1)}</svg>
      <div class="txt"><div class="num" id="restNum">0:00</div><div class="of" id="restOf"></div></div>
    </div>
    ${e ? `<div class="nextup">
      <div class="k">Prossima serie</div>
      <div class="v">${esc(ex.n)}</div>
      <div class="w">${nxt?.weight != null ? fmtWeight(nxt.weight) + ' kg × ' : ''}${nxt?.reps ?? ''} ${nxt?.reps ? 'rip.' : ''} · serie ${i + 1}/${e.sets.length}</div>
    </div>` : ''}
    ${tip ? `<div class="coach" style="margin:12px 0 0;max-width:360px">${icon('bulb', 17)}<div>${esc(tip)}</div></div>` : ''}
    <div class="ctr">
      <button class="btn ghost" data-r="-15">−15s</button>
      <button class="btn ghost" data-r="15">+15s</button>
      <button class="btn primary" data-r="skip">Salta</button>
    </div>`;

  on(el, 'click', '[data-r]', (ev, t) => {
    const v = t.dataset.r;
    if (v === 'skip') { endRest(); return; }
    W().rest.endsAt += Number(v) * 1000;
    W().rest.duration = Math.max(5, W().rest.duration + Number(v));
    save();
  });

  clearInterval(restTimer);
  let lastWhole = null;
  const tick = () => {
    const r = W()?.rest;
    if (!r) { endRest(); return; }
    const left = Math.max(0, (r.endsAt - Date.now()) / 1000);
    const num = $('#restNum', el);
    if (num) num.textContent = fmtDur(Math.ceil(left));
    const of = $('#restOf', el);
    if (of) of.textContent = `su ${fmtDur(r.duration)}`;
    const circle = el.querySelectorAll('.dial circle')[1];
    if (circle) {
      const c = 2 * Math.PI * 46;
      circle.setAttribute('stroke-dashoffset', (c * (1 - left / r.duration)).toFixed(2));
    }
    const whole = Math.ceil(left);
    if (whole !== lastWhole) {
      if (S.settings.sound && whole > 0 && whole <= 3) beep(760, 110, 0.18);
      lastWhole = whole;
    }
    if (left <= 0) {
      if (S.settings.sound) chime();
      vibrate([30, 80, 30]);
      el.classList.add('flash');
      endRest(true);
    }
  };
  tick();
  restTimer = setInterval(tick, 200);
}

function endRest(auto = false) {
  clearInterval(restTimer);
  restTimer = null;
  if (W()) { W().rest = null; save(); }
  const el = $('#restOverlay');
  if (el) {
    el.classList.add('closing');
    setTimeout(() => el.remove(), auto ? 700 : 220);
  }
}

/* ----------------------------------------------------------- conclusione */

function toSession(w) {
  return {
    id: w.id,
    date: w.startedAt,
    routineId: w.routineId,
    dayId: w.dayId,
    name: w.name,
    duration: Math.round((Date.now() - new Date(w.startedAt).getTime()) / 1000),
    note: w.note || '',
    exercises: w.exercises
      .map((e) => ({
        exId: e.exId,
        note: e.note,
        sets: e.sets.filter((s) => s.done).map((s) => ({
          weight: s.weight, reps: s.reps, rpe: s.rpe || null, type: s.type || 'n', done: true, ts: s.ts,
        })),
      }))
      .filter((e) => e.sets.length),
  };
}

/** La sessione differisce dalla scheda di partenza? (per proporre l'aggiornamento) */
function routineDiff(w) {
  const r = getRoutine(w.routineId);
  const day = r?.days.find((d) => d.id === w.dayId);
  if (!day) return null;
  const was = day.exercises.map((x) => `${x.exId}:${x.sets}`).join('|');
  const now = w.exercises.filter((e) => e.sets.some((s) => s.done))
    .map((e) => `${e.exId}:${e.sets.filter(isWork).length}`).join('|');
  return was === now ? null : { routine: r, day };
}

function finishSheet() {
  const w = W();
  if (!w) return;
  const sess = toSession(w);
  const volume = sessionVolume(sess), sets = sessionSets(sess), duration = sess.duration;

  if (!sess.exercises.length) {
    confirmSheet('Nessuna serie registrata', 'Vuoi annullare questo allenamento?', 'Annulla allenamento').then((ok) => {
      if (ok) discard();
    });
    return;
  }
  const prs = detectPRs(sess, w.prBefore);
  const diff = routineDiff(w);

  openSheet({
    title: 'Allenamento completato',
    body: `
      <div class="stat-row">
        <div class="stat"><div class="v">${fmtDurShort(duration)}</div><div class="k">Durata</div></div>
        <div class="stat"><div class="v">${fmtVolume(volume)}<span class="u">${volume >= 10000 ? '' : 'kg'}</span></div><div class="k">Volume</div></div>
        <div class="stat"><div class="v">${sets}</div><div class="k">Serie</div></div>
      </div>
      ${prs.length ? `<div class="section-title">Nuovi record</div>
        <div class="card flush"><div class="rows">${prs.map((p) => `<div class="row">
          <span class="avatar acc">${icon('trophy', 19)}</span>
          <span class="grow"><span class="t">${esc(p.name)}</span><span class="s">Nuovo record di ${esc(p.type)}</span></span>
          <span class="pill acc">${fmtWeight(p.value)} kg</span></div>`).join('')}</div></div>` : ''}
      <div class="section-title">Riepilogo</div>
      <div class="card flush"><div class="rows">
        ${sess.exercises.map((e) => `<div class="row">
          <span class="grow"><span class="t">${esc(getEx(e.exId).n)}</span>
          <span class="s">${e.sets.map((s) => `${s.weight != null ? fmtWeight(s.weight) + '×' : ''}${s.reps}`).join(' · ')}</span></span>
        </div>`).join('')}
      </div></div>
      ${diff ? `<label class="check-row mt14">
        <input type="checkbox" data-upd checked>
        <span><b>Aggiorna la scheda</b><br><span class="muted fs12">Salva le modifiche di oggi in “${esc(diff.day.name)}”</span></span>
      </label>` : ''}
      ${!w.routineId ? `<label class="check-row mt14">
        <input type="checkbox" data-asroutine>
        <span><b>Salva come scheda</b><br><span class="muted fs12">Per ripeterlo con un tap</span></span>
      </label>` : ''}
      <div class="field mt14"><label>Come è andata?</label>
        <textarea class="input" data-note placeholder="Note su energia, dolori, sensazioni…">${esc(w.note || '')}</textarea></div>`,
    foot: `<button class="btn ghost" data-cont>Continua</button><button class="btn primary" data-save>${icon('check', 18)} Salva</button>`,
    onMount: (el) => {
      $('[data-cont]', el).onclick = () => closeSheet();
      $('[data-save]', el).onclick = async () => {
        w.note = $('[data-note]', el).value.trim();
        const final = toSession(w);
        final.note = w.note;

        if (diff && $('[data-upd]', el)?.checked) applyToRoutine(w, diff);
        if (!w.routineId && $('[data-asroutine]', el)?.checked) {
          closeSheet();
          const name = await promptSheet('Nome della scheda', { value: w.name, ok: 'Crea' });
          if (name) saveAsRoutine(w, name);
        }

        addSession(final);
        S.current = null;
        save(true);
        closeSheet();
        endRest();
        releaseWakeLock();
        fig?.destroy(); fig = null; figEx = null;
        if (prs.length) sparkle(46);
        toast(`${icon('checkCircle', 16)} Allenamento salvato`, 'pr', 3000);
        import('../app.js').then((m) => m.go('home', {}, { reset: true }));
      };
    },
  });
}

function applyToRoutine(w, { routine, day }) {
  day.exercises = w.exercises
    .filter((e) => e.sets.some((s) => s.done))
    .map((e) => ({
      id: e.rowId || uid(),
      exId: e.exId,
      sets: Math.max(1, e.sets.filter(isWork).length),
      reps: e.targetReps,
      rest: e.rest,
      note: e.note || '',
      superset: e.superset || null,
    }));
  save();
  toast('Scheda aggiornata');
}

function saveAsRoutine(w, name) {
  const r = {
    id: uid(), name, note: '', created: new Date().toISOString(),
    days: [{
      id: uid(), name: w.name || 'Giorno 1',
      exercises: w.exercises.filter((e) => e.sets.some((s) => s.done)).map((e) => ({
        id: uid(), exId: e.exId, sets: Math.max(1, e.sets.filter(isWork).length),
        reps: e.targetReps, rest: e.rest, note: e.note || '', superset: e.superset || null,
      })),
    }],
  };
  S.routines.push(r);
  if (!S.activeRoutineId) S.activeRoutineId = r.id;
  save();
  toast('Scheda creata');
}

function discard() {
  S.current = null;
  save(true);
  endRest();
  releaseWakeLock();
  fig?.destroy(); fig = null; figEx = null;
  import('../app.js').then((x) => x.go('home', {}, { reset: true }));
}

/* ---------------------------------------------------------- wake lock --- */

async function requestWakeLock() {
  if (!S.settings.wakeLock || !('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener?.('release', () => { wakeLock = null; });
    document.addEventListener('visibilitychange', reacquire);
  } catch { /* non supportato */ }
}
async function reacquire() {
  if (document.visibilityState === 'visible' && S.current && !wakeLock) requestWakeLock();
}
function releaseWakeLock() {
  try { wakeLock?.release(); } catch { /* ignore */ }
  wakeLock = null;
  document.removeEventListener('visibilitychange', reacquire);
}

/* -------------------------------------------------------------- mount --- */

export function mountWorkout(root) {
  refresh({ figure: true });
  requestWakeLock();

  clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    const w = W();
    const c = $('#wkClock');
    if (!w || !c) { clearInterval(tickTimer); return; }
    c.textContent = fmtDur((Date.now() - new Date(w.startedAt).getTime()) / 1000);
  }, 1000);

  if (W().rest && W().rest.endsAt > Date.now()) showRest();
  else if (W().rest) { W().rest = null; save(); }

  const h = (sel, fn) => on(root, 'click', sel, fn);

  h('[data-act="minimize"]', () => import('../app.js').then((m) => { m.go('home', {}, { reset: true }); }));
  h('[data-act="done"]', () => completeSet());
  h('[data-act="quickdone"]', (e, t) => {
    const k = Number(t.dataset.k);
    W().cursor.set = k;
    refresh({ figure: false });
    completeSet(k);
  });
  h('[data-act="w+"]', () => bump('weight', 1));
  h('[data-act="w-"]', () => bump('weight', -1));
  h('[data-act="r+"]', () => bump('reps', 1));
  h('[data-act="r-"]', () => bump('reps', -1));
  h('[data-act="exinfo"]', () => { const e = curEx(); if (e) exerciseSheet(e.exId); });
  h('[data-rpe]', (e, t) => {
    const ex = curEx();
    const s = ex.sets[clamp(W().cursor.set, 0, ex.sets.length - 1)];
    const v = Number(t.dataset.rpe);
    s.rpe = s.rpe === v ? null : v;
    readInputs();
    refresh({ figure: false });
  });
  h('[data-act="jump"]', (e, t) => {
    const k = Number(t.dataset.k);
    readInputs();
    W().cursor.ex = k;
    const n = W().exercises[k].sets.findIndex((s) => !s.done);
    W().cursor.set = n < 0 ? 0 : n;
    refresh({ figure: true });
  });
  h('[data-act="next"]', () => {
    const w = W();
    const n = w.exercises.findIndex((x, k) => k > w.cursor.ex && x.sets.some((y) => !y.done));
    if (n >= 0) { w.cursor.ex = n; w.cursor.set = w.exercises[n].sets.findIndex((s) => !s.done); refresh({ figure: true }); }
    else finishSheet();
  });
  h('[data-act="addset"]', () => {
    const e = curEx(); if (!e) return;
    readInputs();
    const last = [...e.sets].reverse().find((s) => isWork(s)) || e.sets[e.sets.length - 1];
    e.sets.push({ id: uid(), weight: last?.weight ?? null, reps: last?.reps ?? parseReps(e.targetReps).min, rpe: null, type: 'n', done: false });
    if (e.sets.filter((s) => !s.done).length === 1) W().cursor.set = e.sets.length - 1;
    refresh({ figure: false });
  });
  h('[data-act="delset"]', (e, t) => {
    const ex = curEx(); const k = Number(t.dataset.k);
    if (ex.sets.length <= 1) { toast('Serve almeno una serie'); return; }
    ex.sets.splice(k, 1);
    W().cursor.set = clamp(W().cursor.set, 0, ex.sets.length - 1);
    refresh({ figure: false });
  });
  h('[data-act="undo"]', (e, t) => {
    const ex = curEx(); const k = Number(t.dataset.k);
    ex.sets[k].done = false;
    W().cursor.set = k;
    refresh({ figure: false });
  });
  h('[data-act="settype"]', (e, t) => setTypeSheet(Number(t.dataset.k)));
  h('[data-act="warm"]', async () => {
    const e = curEx(); if (!e) return;
    readInputs();
    let work = Number(e.sets.find((s) => !s.done)?.weight) || Number(e.sets[0]?.weight) || 0;
    if (!work) {
      const v = await promptSheet('Carico di lavoro', {
        label: 'kg della serie principale', placeholder: 'es. 60',
        ok: 'Calcola riscaldamento',
      });
      work = Number(String(v || '').replace(',', '.'));
      if (!work) return;
      for (const s of e.sets) if (!s.done && s.weight == null) s.weight = work;
    }
    const ws = warmupSets(work, getEx(e.exId));
    if (!ws.length) { toast(`Con ${fmtWeight(work)} kg il riscaldamento non serve`); return; }
    e.sets.unshift(...ws.map((s) => ({ id: uid(), weight: s.weight, reps: s.reps, rpe: null, type: 'w', done: false })));
    W().cursor.set = 0;
    refresh({ figure: false });
    toast(`${ws.length} serie di riscaldamento aggiunte`);
  });
  h('[data-act="exnote"]', async () => {
    const e = curEx(); if (!e) return;
    const v = await promptSheet('Nota esercizio', { value: e.note, multiline: true, placeholder: 'Es. presa più stretta, panca al buco 4…' });
    if (v !== null) { e.note = v; refresh({ figure: false }); }
  });
  h('[data-act="rest"]', async () => {
    const e = curEx(); if (!e) return;
    restSheet(e);
  });
  h('[data-act="addex"]', () => {
    pickExercise((list) => {
      const arr = Array.isArray(list) ? list : [list];
      for (const nw of arr) {
        W().exercises.push(buildExercise({ exId: nw.id, sets: 3, reps: nw.rr, rest: nw.rest, id: uid() }));
      }
      W().cursor.ex = W().exercises.length - arr.length;
      W().cursor.set = 0;
      refresh({ figure: true });
    }, { multi: true, title: 'Aggiungi esercizi' });
  });
  h('[data-act="plates"]', () => platesSheet());
  h('[data-act="finish"]', () => finishSheet());
  h('[data-act="wmenu"]', () => workoutMenu());
  h('[data-act="exmenu"]', () => exerciseMenu());

  on(root, 'change', '[data-f]', () => { readInputs(); save(); });
  on(root, 'click', '.set-line[data-set]', (e, t) => {
    if (e.target.closest('button')) return;
    const k = Number(t.dataset.set);
    readInputs();
    W().cursor.set = k;
    if (curEx().sets[k].done) curEx().sets[k].done = false;
    refresh({ figure: false });
  });
}

/* --------------------------------------------------------------- sheets - */

function setTypeSheet(k) {
  const e = curEx();
  const s = e.sets[k];
  openSheet({
    title: `Serie ${k + 1}`,
    body: `<div class="card flush"><div class="rows">
      ${Object.entries(SET_TYPES).map(([key, t]) => `<button class="row" data-t="${key}">
        <span class="avatar ${s.type === key ? 'acc' : ''}">${t.lab || icon('check', 18)}</span>
        <span class="grow"><span class="t">${esc(t.name)}</span><span class="s">${esc(t.desc)}</span></span>
        ${s.type === key ? icon('check', 18) : ''}</button>`).join('')}
    </div></div>`,
    onMount: (el) => on(el, 'click', '[data-t]', (ev, t) => {
      s.type = t.dataset.t;
      closeSheet();
      refresh({ figure: false });
    }),
  });
}

function restSheet(e) {
  const presets = [45, 60, 90, 120, 150, 180, 210, 240];
  openSheet({
    title: 'Recupero',
    body: `<p class="fs13 muted" style="margin-bottom:12px">Vale per questo esercizio in questo allenamento.</p>
      <div class="flex wrap gap8">
        ${presets.map((p) => `<button class="chip ${e.rest === p ? 'on' : ''}" data-p="${p}">${fmtDur(p)}</button>`).join('')}
      </div>
      <div class="field mt20"><label>Personalizzato (secondi)</label>
        <input class="input" type="number" inputmode="numeric" data-custom value="${e.rest}"></div>`,
    foot: `<button class="btn ghost" data-sheet-close>Annulla</button><button class="btn primary" data-ok>Salva</button>`,
    onMount: (el) => {
      on(el, 'click', '[data-p]', (ev, t) => { $('[data-custom]', el).value = t.dataset.p; });
      $('[data-ok]', el).onclick = () => {
        e.rest = Math.max(0, Math.min(900, Number($('[data-custom]', el).value) || 90));
        closeSheet();
        refresh({ figure: false });
      };
    },
  });
}

function exerciseMenu() {
  const w = W();
  const e = curEx();
  if (!e) return;
  const i = w.cursor.ex;
  openSheet({
    title: getEx(e.exId).n,
    body: `<div class="card flush"><div class="rows">
      <button class="row" data-a="info"><span class="avatar">${icon('info', 19)}</span><span class="grow"><span class="t">Tecnica ed errori comuni</span></span>${icon('chevR', 17)}</button>
      <button class="row" data-a="swap"><span class="avatar">${icon('swap', 19)}</span><span class="grow"><span class="t">Sostituisci esercizio</span></span>${icon('chevR', 17)}</button>
      <button class="row" data-a="superset"><span class="avatar">${icon('layers', 19)}</span><span class="grow"><span class="t">${e.superset ? 'Togli dal superset' : 'Crea superset'}</span><span class="s">${e.superset ? 'Torna a esercizio singolo' : 'Abbina all’esercizio successivo'}</span></span></button>
      <button class="row" data-a="up"><span class="avatar">${icon('arrowUp', 19)}</span><span class="grow"><span class="t">Sposta su</span></span></button>
      <button class="row" data-a="down"><span class="avatar">${icon('arrowDown', 19)}</span><span class="grow"><span class="t">Sposta giù</span></span></button>
      <button class="row" data-a="del"><span class="avatar" style="color:var(--err)">${icon('trash', 19)}</span><span class="grow"><span class="t" style="color:var(--err)">Rimuovi dall’allenamento</span></span></button>
    </div></div>`,
    onMount: (el) => on(el, 'click', '[data-a]', async (ev, t) => {
      const a = t.dataset.a;
      if (a === 'info') { exerciseSheet(e.exId); return; }
      if (a === 'swap') {
        closeSheet();
        pickExercise((nw) => {
          e.exId = nw.id;
          e.sets.forEach((s, n) => {
            if (!s.done) { const sg = suggest(nw.id, n, { reps: e.targetReps }); s.weight = sg.weight; s.reps = sg.reps; }
          });
          refresh({ figure: true });
          toast('Esercizio sostituito');
        }, { title: 'Sostituisci esercizio' });
        return;
      }
      if (a === 'superset') {
        if (e.superset) { e.superset = null; }
        else if (i < w.exercises.length - 1) {
          const gid = w.exercises[i + 1].superset || uid();
          e.superset = gid;
          w.exercises[i + 1].superset = gid;
          toast('Superset creato con l’esercizio successivo');
        } else toast('Serve un esercizio successivo', 'err');
      }
      if (a === 'up' && i > 0) { w.exercises.splice(i - 1, 0, w.exercises.splice(i, 1)[0]); w.cursor.ex = i - 1; }
      if (a === 'down' && i < w.exercises.length - 1) { w.exercises.splice(i + 1, 0, w.exercises.splice(i, 1)[0]); w.cursor.ex = i + 1; }
      if (a === 'del') {
        if (w.exercises.length <= 1) { toast('È l’unico esercizio', 'err'); return; }
        const ok = await confirmSheet('Rimuovere?', `${getEx(e.exId).n} verrà tolto da questo allenamento.`, 'Rimuovi');
        if (!ok) return;
        w.exercises.splice(i, 1);
        w.cursor.ex = clamp(i, 0, w.exercises.length - 1);
        w.cursor.set = 0;
      }
      closeSheet();
      refresh({ figure: true });
    }),
  });
}

function platesSheet() {
  const e = curEx(); if (!e) return;
  readInputs();
  const target = Number(e.sets[clamp(W().cursor.set, 0, e.sets.length - 1)].weight) || 0;
  const bar = S.settings.barWeight;
  const b = plateBreakdown(target, bar);
  openSheet({
    title: 'Dischi per lato',
    body: `
      <div class="tc" style="margin-bottom:12px">
        <div style="font-size:40px;font-weight:820;letter-spacing:-.05em">${fmtWeight(target)} <span style="font-size:20px;color:var(--txt-3)">kg</span></div>
        <div class="fs13 muted">bilanciere ${fmtWeight(bar)} kg</div>
      </div>
      ${b.perSide.length ? `<div class="flex wrap gap8" style="justify-content:center">
        ${b.perSide.flatMap(({ p, n }) => Array.from({ length: n }, () => `
          <div style="min-width:54px;padding:12px 8px;border-radius:12px;background:var(--acc-soft);border:1px solid color-mix(in srgb,var(--acc) 30%,transparent);text-align:center">
            <div style="font-weight:800;font-size:17px;letter-spacing:-.03em">${fmtWeight(p)}</div><div class="fs12 muted">kg</div></div>`)).join('')}
      </div>` : '<p class="muted tc">Solo bilanciere.</p>'}
      ${!b.ok ? `<p class="fs13" style="color:var(--warn);margin-top:14px;text-align:center">Non componibile esattamente: restano ${fmtWeight(b.left)} kg per lato.</p>` : ''}
      <p class="fs12 muted tc mt14">Puoi cambiare bilanciere e dischi disponibili nelle impostazioni.</p>`,
  });
}

function workoutMenu() {
  openSheet({
    title: 'Allenamento',
    body: `<div class="card flush"><div class="rows">
      <button class="row" data-m="rest"><span class="avatar">${icon('timer', 19)}</span><span class="grow"><span class="t">Avvia recupero</span><span class="s">Timer manuale</span></span></button>
      <button class="row" data-m="rename"><span class="avatar">${icon('edit', 19)}</span><span class="grow"><span class="t">Rinomina allenamento</span></span></button>
      <button class="row" data-m="note"><span class="avatar">${icon('note', 19)}</span><span class="grow"><span class="t">Nota dell’allenamento</span></span></button>
      <button class="row" data-m="finish"><span class="avatar acc">${icon('checkCircle', 19)}</span><span class="grow"><span class="t">Termina e salva</span></span></button>
      <button class="row" data-m="discard"><span class="avatar" style="color:var(--err)">${icon('trash', 19)}</span><span class="grow"><span class="t" style="color:var(--err)">Annulla allenamento</span></span></button>
    </div></div>`,
    onMount: (el) => on(el, 'click', '[data-m]', async (e, t) => {
      const m = t.dataset.m;
      closeSheet();
      if (m === 'rest') startRest(curEx()?.rest || S.settings.restDefault);
      if (m === 'rename') {
        const v = await promptSheet('Nome allenamento', { value: W().name });
        if (v) { W().name = v; save(); import('../app.js').then((x) => x.render()); }
      }
      if (m === 'note') {
        const v = await promptSheet('Nota', { value: W().note || '', multiline: true });
        if (v !== null) { W().note = v; save(); }
      }
      if (m === 'finish') finishSheet();
      if (m === 'discard') {
        const ok = await confirmSheet('Annullare?', 'Perderai tutte le serie registrate in questo allenamento.', 'Annulla allenamento');
        if (ok) discard();
      }
    }),
  });
}

/* banner "riprendi" nella home */
on(document, 'click', '[data-act="resume"]', () => import('../app.js').then((m) => m.render()));
