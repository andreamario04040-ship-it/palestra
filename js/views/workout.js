/* =========================================================================
   Allenamento in corso.
   Principio guida: il carico e le ripetizioni sono già proposti, all'utente
   basta premere "Completa serie". Tutto il resto (recupero, avanzamento,
   record) succede da solo.
   ========================================================================= */

import {
  S, save, addSession, idx, prOf, historyOf, sessionVolume, sessionSets, getRoutine,
} from '../lib/store.js';
import { getEx, stepFor, MUSCLES } from '../data/exercises.js';
import { suggest, parseReps, warmupSets, plateBreakdown, detectPRs, tipFor } from '../lib/coach.js';
import {
  esc, uid, $, $$, on, fmtDur, fmtDurShort, fmtWeight, fmtVolume, toast, sparkle,
  openSheet, closeSheet, confirmSheet, promptSheet, beep, chime, vibrate, centerInScroller, clamp,
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

/* -------------------------------------------------------------- avvio ---- */

function buildExercise(row) {
  const ex = getEx(row.exId);
  const n = Math.max(1, row.sets || 3);
  const sets = [];
  for (let i = 0; i < n; i++) {
    const sg = suggest(row.exId, i, row);
    sets.push({ id: uid(), weight: sg.weight, reps: sg.reps, done: false, warm: false });
  }
  return {
    exId: row.exId, rowId: row.id || uid(), targetReps: row.reps || ex.rr,
    rest: row.rest || ex.rest || S.settings.restDefault, note: row.note || '', sets,
  };
}

export function startWorkout(routine, day) {
  if (S.current && !confirmLeave()) return;
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
  openSheet({
    title: 'Inizia allenamento',
    body: `<div class="card flush"><div class="rows">
      ${S.routines.map((r) => r.days.map((d) => `
        <button class="row" data-r="${r.id}" data-d="${d.id}">
          <span class="avatar ${r.id === rt?.id ? 'acc' : ''}">${icon('dumbbell', 19)}</span>
          <span class="grow"><span class="t">${esc(d.name)}</span><span class="s">${esc(r.name)} · ${d.exercises.length} esercizi</span></span>
          ${icon('chevR', 18)}</button>`).join('')).join('')}
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
      $('[data-free]', el).onclick = () => { closeSheet(); startWorkout(null, { id: null, name: 'Allenamento libero', exercises: [] }); };
    },
  });
}

function confirmLeave() { return true; }

/* ------------------------------------------------------ banner "riprendi" */

export function resumeBanner() {
  if (!S.current) return '';
  const w = S.current;
  const done = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  return `<button class="card tappable flex center gap12" style="width:100%;text-align:left;border-color:var(--acc);background:var(--acc-soft);margin-bottom:14px" data-act="resume">
    <span class="avatar acc">${icon('play', 20)}</span>
    <span class="grow"><span class="t fw7">Allenamento in corso</span>
    <span class="s">${esc(w.name)} · ${done} serie completate</span></span>
    ${icon('chevR', 18)}</button>`;
}

/* ------------------------------------------------------------- rendering */

export function renderWorkout() {
  return `<div class="wk">
    <div class="wk-head">
      <button class="icon-btn ghost" data-act="minimize" aria-label="Riduci">${icon('chevD', 22)}</button>
      <div class="t"><div class="n">${esc(W().name)}</div><div class="m" id="wkClock">0:00</div></div>
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
  const sg = suggest(e.exId, i, { reps: e.targetReps, sets: e.sets.length });
  const allDone = e.sets.every((s) => s.done);
  const pr = prOf(e.exId);
  const isTimed = rr.timed || ex.timed;

  return `
    <div class="ex-hero">
      <div class="anim-wrap">
        <div class="tgt">
          <span class="pill acc">${e.sets.length} × ${esc(String(e.targetReps))}</span>
          ${pr ? `<span class="pill">${icon('trophy', 12)} ${fmtWeight(pr.weight)} kg</span>` : ''}
        </div>
        <button class="info-fab" data-act="exinfo" aria-label="Tecnica">${icon('info', 18)}</button>
        <div id="wkFig"></div>
      </div>
      <div class="meta">
        <h2>${esc(ex.n)}</h2>
        <div class="sub">${(ex.m || []).map((m) => MUSCLES[m]?.n || m).join(' · ')}${e.note ? ' · ' + esc(e.note) : ''}</div>
      </div>

      <div class="set-head">
        <div class="big">${allDone ? 'Esercizio completato' : `Serie ${i + 1} di ${e.sets.length}${set.warm ? ' · riscaldamento' : ''}`}</div>
        ${!allDone && sg.tone !== 'new' ? `<div class="hint">${sg.tone === 'up' ? '↑ progressione' : sg.tone === 'down' ? '↓ scarico' : 'mantieni'}</div>` : ''}
      </div>

      <div class="inputs">
        <div class="stepper">
          <button data-act="w-" aria-label="Meno">−</button>
          <label class="val"><input type="number" inputmode="decimal" step="0.5" data-f="weight" value="${set.weight ?? ''}" placeholder="—"><small>kg</small></label>
          <button data-act="w+" aria-label="Più">+</button>
        </div>
        <div class="stepper">
          <button data-act="r-" aria-label="Meno">−</button>
          <label class="val"><input type="number" inputmode="numeric" step="1" data-f="reps" value="${set.reps ?? ''}" placeholder="—"><small>${isTimed ? 'secondi' : 'ripetizioni'}</small></label>
          <button data-act="r+" aria-label="Più">+</button>
        </div>
      </div>

      ${!allDone && sg.why ? `<div class="coach">${icon('bulb', 17)}<div>${esc(sg.why)}</div></div>` : ''}

      <div class="cta-wrap">
        ${allDone
          ? `<button class="btn ghost lg" data-act="addset">${icon('plus', 18)}</button>
             <button class="btn primary lg" style="flex:1" data-act="next">Prossimo esercizio ${icon('chevR', 18)}</button>`
          : `<button class="btn ghost lg" data-act="plates" aria-label="Dischi">${icon('layers', 18)}</button>
             <button class="btn primary lg" data-act="done">${icon('check', 20)} Completa serie</button>`}
      </div>
    </div>

    <div class="sets-log">
      ${e.sets.map((s, k) => `
        <div class="set-line ${s.done ? 'done' : ''} ${!s.done && k === i ? 'cur' : ''}" data-set="${k}">
          <span class="idx">${s.warm ? 'W' : k + 1}</span>
          <span class="v">${s.weight != null && s.weight !== '' ? fmtWeight(s.weight) + ' kg' : '—'}</span>
          <span class="sep">×</span>
          <span class="v">${s.reps ?? '—'}</span>
          <span class="grow"></span>
          ${s.done ? `<button class="icon-btn ghost" style="width:30px;height:30px" data-act="undo" data-k="${k}">${icon('refresh', 16)}</button>` : ''}
          <button class="icon-btn ghost" style="width:30px;height:30px" data-act="delset" data-k="${k}">${icon('x', 16)}</button>
        </div>`).join('')}
      <div class="flex gap8 mt10">
        <button class="btn ghost sm" data-act="addset">${icon('plus', 16)} Serie</button>
        ${S.settings.warmup && !e.sets.some((s) => s.warm) ? `<button class="btn ghost sm" data-act="warm">${icon('flame', 16)} Riscaldamento</button>` : ''}
        <button class="btn ghost sm" data-act="exnote">${icon('note', 16)} Nota</button>
        <button class="btn ghost sm" data-act="swap">${icon('swap', 16)} Sostituisci</button>
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
    return `<button class="rail-item ${k === w.cursor.ex ? 'on' : ''} ${full ? 'ok' : ''}" data-act="jump" data-k="${k}">
      <div class="n">${esc(getEx(e.exId).n)}</div>
      <div class="p">${full ? '✓ completato' : `${done}/${e.sets.length} serie`}</div>
    </button>`;
  }).join('') + `<button class="rail-item" data-act="addex" style="min-width:52px;display:grid;place-items:center">${icon('plus', 20)}</button>`;
}

/* ------------------------------------------------------------- aggiorna -- */

function refresh({ figure = true } = {}) {
  const body = $('#wkBody'), rail = $('#wkRail');
  if (!body) return;
  body.innerHTML = bodyHTML();
  rail.innerHTML = railHTML();
  const p = progress();
  $('#wkProg').style.width = (p.pct * 100).toFixed(1) + '%';

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
    $('[data-f="weight"]').value = s.weight;
  } else {
    s.reps = Math.max(0, (Number(s.reps) || 0) + dir);
    $('[data-f="reps"]').value = s.reps;
  }
  vibrate(8);
  save();
}

function completeSet() {
  const w = W();
  const e = curEx();
  if (!e) return;
  readInputs();
  const i = clamp(w.cursor.set, 0, e.sets.length - 1);
  const s = e.sets[i];
  if (s.reps == null || s.reps === '' || Number(s.reps) <= 0) { toast('Inserisci le ripetizioni', 'err'); return; }
  s.done = true;
  s.ts = new Date().toISOString();
  vibrate(18);

  // record personale immediato
  if (!s.warm) checkInstantPR(e.exId, Number(s.weight) || 0, Number(s.reps) || 0);

  // prossima serie o prossimo esercizio
  const nextSet = e.sets.findIndex((x, k) => k > i && !x.done);
  let restSec = e.rest || S.settings.restDefault;
  let advanced = false;
  if (nextSet >= 0) w.cursor.set = nextSet;
  else if (S.settings.autoAdvance) {
    const nextEx = w.exercises.findIndex((x, k) => k > w.cursor.ex && x.sets.some((y) => !y.done));
    if (nextEx >= 0) { w.cursor.ex = nextEx; w.cursor.set = w.exercises[nextEx].sets.findIndex((x) => !x.done); advanced = true; }
  }
  const p = progress();
  refresh({ figure: advanced });

  if (p.done === p.tot) { setTimeout(() => finishSheet(), 350); return; }
  if (S.settings.autoRest && !s.warm) startRest(restSec);
  else if (s.warm) startRest(Math.min(60, restSec));
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
  const tip = e ? tipFor(e.exId, (w.exercises[w.cursor.ex]?.sets.filter((s) => s.done).length) || 0) : null;

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
    W().rest.duration += Number(v);
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

function summaryOf(w) {
  const sess = toSession(w);
  return {
    sess,
    volume: sessionVolume(sess),
    sets: sessionSets(sess),
    duration: sess.duration,
  };
}

function toSession(w) {
  const end = Date.now();
  return {
    id: w.id,
    date: w.startedAt,
    routineId: w.routineId,
    dayId: w.dayId,
    name: w.name,
    duration: Math.round((end - new Date(w.startedAt).getTime()) / 1000),
    note: w.note || '',
    exercises: w.exercises
      .map((e) => ({ exId: e.exId, note: e.note, sets: e.sets.filter((s) => s.done).map((s) => ({ weight: s.weight, reps: s.reps, warm: !!s.warm, done: true, ts: s.ts })) }))
      .filter((e) => e.sets.length),
  };
}

function finishSheet() {
  const w = W();
  if (!w) return;
  const { sess, volume, sets, duration } = summaryOf(w);
  if (!sess.exercises.length) {
    confirmSheet('Nessuna serie registrata', 'Vuoi annullare questo allenamento?', 'Annulla allenamento').then((ok) => {
      if (ok) { S.current = null; save(); import('../app.js').then((m) => m.render()); }
    });
    return;
  }
  const prs = detectPRs(sess, w.prBefore);

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
      <div class="field mt14"><label>Come è andata?</label>
        <textarea class="input" data-note placeholder="Note su energia, dolori, sensazioni…">${esc(w.note || '')}</textarea></div>`,
    foot: `<button class="btn ghost" data-cont>Continua</button><button class="btn primary" data-save>${icon('check', 18)} Salva</button>`,
    onMount: (el) => {
      $('[data-cont]', el).onclick = () => closeSheet();
      $('[data-save]', el).onclick = () => {
        w.note = $('[data-note]', el).value.trim();
        const final = toSession(w);
        final.note = w.note;
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

/* ---------------------------------------------------------- wake lock --- */

async function requestWakeLock() {
  if (!S.settings.wakeLock || !('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
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
  h('[data-act="w+"]', () => bump('weight', 1));
  h('[data-act="w-"]', () => bump('weight', -1));
  h('[data-act="r+"]', () => bump('reps', 1));
  h('[data-act="r-"]', () => bump('reps', -1));
  h('[data-act="exinfo"]', () => { const e = curEx(); if (e) exerciseSheet(e.exId); });
  h('[data-act="jump"]', (e, t) => {
    const k = Number(t.dataset.k);
    W().cursor.ex = k;
    W().cursor.set = Math.max(0, W().exercises[k].sets.findIndex((s) => !s.done));
    if (W().cursor.set < 0) W().cursor.set = 0;
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
    const last = e.sets[e.sets.length - 1];
    e.sets.push({ id: uid(), weight: last?.weight ?? null, reps: last?.reps ?? parseReps(e.targetReps).min, done: false, warm: false });
    if (e.sets.every((s, k) => s.done || k === e.sets.length - 1)) W().cursor.set = e.sets.length - 1;
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
  h('[data-act="warm"]', () => {
    const e = curEx(); if (!e) return;
    const work = Number(e.sets.find((s) => !s.done)?.weight) || Number(e.sets[0]?.weight) || 0;
    const ws = warmupSets(work, getEx(e.exId));
    if (!ws.length) { toast('Carico troppo basso per il riscaldamento'); return; }
    e.sets.unshift(...ws.map((s) => ({ id: uid(), ...s, done: false })));
    W().cursor.set = 0;
    refresh({ figure: false });
    toast(`${ws.length} serie di riscaldamento aggiunte`);
  });
  h('[data-act="exnote"]', async () => {
    const e = curEx(); if (!e) return;
    const v = await promptSheet('Nota esercizio', { value: e.note, multiline: true, placeholder: 'Es. presa più stretta, panca al buco 4…' });
    if (v !== null) { e.note = v; refresh({ figure: false }); }
  });
  h('[data-act="swap"]', () => {
    const e = curEx(); if (!e) return;
    pickExercise((nw) => {
      e.exId = nw.id;
      e.sets.forEach((s, i) => { if (!s.done) { const sg = suggest(nw.id, i, { reps: e.targetReps }); s.weight = sg.weight; s.reps = sg.reps; } });
      refresh({ figure: true });
      toast('Esercizio sostituito');
    }, { title: 'Sostituisci esercizio' });
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

  on(root, 'change', '[data-f]', () => { readInputs(); save(); });
  on(root, 'click', '.set-line[data-set]', (e, t) => {
    if (e.target.closest('button')) return;
    const k = Number(t.dataset.set);
    if (!curEx().sets[k].done) { W().cursor.set = k; refresh({ figure: false }); }
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
      if (m === 'finish') finishSheet();
      if (m === 'discard') {
        const ok = await confirmSheet('Annullare?', 'Perderai tutte le serie registrate in questo allenamento.', 'Annulla allenamento');
        if (ok) {
          S.current = null; save(true); endRest(); releaseWakeLock();
          fig?.destroy(); fig = null; figEx = null;
          import('../app.js').then((x) => x.go('home', {}, { reset: true }));
        }
      }
    }),
  });
}

/* banner "riprendi" nella home */
on(document, 'click', '[data-act="resume"]', () => import('../app.js').then((m) => m.render()));
