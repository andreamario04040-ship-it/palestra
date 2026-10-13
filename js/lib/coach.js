/* =========================================================================
   "Coach": suggerisce carico e ripetizioni serie per serie, calcola i dischi
   da caricare, propone il riscaldamento e sceglie il prossimo giorno di scheda.
   Obiettivo: durante l'allenamento l'utente deve solo confermare.
   ========================================================================= */

import { S, historyOf, lastPerf, prOf, e1rm, sessionVolume, isWork } from './store.js';
import { getEx, stepFor, MUSCLES } from '../data/exercises.js';
import { fmtWeight } from './dom.js';

/** '8-12' -> {min:8,max:12}; '10' -> {min:10,max:10}; '30 s' -> {timed:true,sec:30} */
export function parseReps(r) {
  const s = String(r ?? '').trim().toLowerCase();
  const timed = /s(ec)?\b|min|'|"/.test(s);
  const nums = s.match(/\d+/g)?.map(Number) || [];
  if (!nums.length) return { min: 8, max: 12, timed: false };
  if (timed) return { min: nums[0], max: nums[1] ?? nums[0], timed: true };
  return { min: nums[0], max: nums[1] ?? nums[0], timed: false };
}

/**
 * Arrotonda a un carico davvero componibile: per il bilanciere il peso deve
 * essere bilanciere + 2 × (dischi per lato), quindi a multipli del doppio del
 * disco più piccolo disponibile.
 */
export function roundLoad(w, ex) {
  if (w == null || !isFinite(w)) return null;
  if (ex?.eq === 'bilanciere' || ex?.eq === 'smith') {
    const bar = S.settings.barWeight || 20;
    const q = Math.min(...(S.settings.plates?.length ? S.settings.plates : [1.25])) * 2;
    return Math.max(bar, bar + Math.round((w - bar) / q) * q);
  }
  const st = stepFor(ex);
  const q = ex?.eq === 'manubri' ? 1 : st / 2;
  return Math.round(w / q) * q;
}

/**
 * Suggerimento per la serie `i` di una riga di scheda.
 * @returns {{weight:number|null, reps:number, why:string, tone:'up'|'same'|'down'|'new'}}
 */
export function suggest(exId, i, row) {
  const ex = getEx(exId);
  const rr = parseReps(row?.reps ?? ex.rr);
  const hist = historyOf(exId);
  const lp = hist[0];

  if (!S.settings.suggest || !lp || !lp.sets.length) {
    return { weight: null, reps: rr.min, why: 'Primo allenamento: scegli un carico che ti lasci 2 ripetizioni di margine.', tone: 'new' };
  }

  const sets = lp.sets;
  const ref = sets[Math.min(i, sets.length - 1)];
  const base = Number(ref.weight) || 0;
  const step = stepFor(ex);

  const allTop = sets.every((s) => (Number(s.reps) || 0) >= rr.max);
  const allMin = sets.every((s) => (Number(s.reps) || 0) >= rr.min);
  const recap = sets.map((s) => s.reps).join(',');
  const prev = `Ultima volta ${fmtWeight(base)} kg × ${recap}`;

  // stallo: 3 sessioni senza progresso di e1RM
  if (hist.length >= 3) {
    const best = hist.slice(0, 3).map((h) => Math.max(...h.sets.map((s) => e1rm(Number(s.weight) || 0, Number(s.reps) || 0))));
    if (best[0] <= best[1] && best[1] <= best[2] && best[0] > 0 && !allTop) {
      return {
        weight: roundLoad(base * 0.9, ex), reps: rr.max,
        why: `${prev}. Tre sedute in stallo: scarica del 10% e ricostruisci.`, tone: 'down',
      };
    }
  }

  if (allTop) {
    return {
      weight: roundLoad(base + step, ex), reps: rr.min,
      why: `${prev}. Hai chiuso tutte le serie in alto: +${fmtWeight(step)} kg.`, tone: 'up',
    };
  }
  if (allMin) {
    const target = Math.min(rr.max, (Number(ref.reps) || rr.min) + 1);
    return {
      weight: base, reps: target,
      why: `${prev}. Stesso carico: punta a ${target} ripetizioni.`, tone: 'same',
    };
  }
  return {
    weight: base, reps: rr.min,
    why: `${prev}. Serie incomplete: consolida questo carico.`, tone: 'same',
  };
}

/**
 * La serie corrispondente dell'ultimo allenamento, per il confronto a colpo
 * d'occhio accanto a ogni riga ("Precedente").
 */
export function prevSet(exId, workIndex) {
  const lp = historyOf(exId)[0];
  if (!lp || !lp.sets.length) return null;
  return lp.sets[Math.min(workIndex, lp.sets.length - 1)] || null;
}

/** Serie di riscaldamento proposte per un carico di lavoro. */
export function warmupSets(work, ex) {
  if (!work || work < 25) return [];
  const bar = ex?.eq === 'bilanciere' || ex?.eq === 'smith' ? S.settings.barWeight : 0;
  const out = [];
  const f = [[0.5, 8], [0.7, 5], [0.85, 3]];
  for (const [p, r] of f) {
    const w = Math.max(bar, roundLoad(work * p, ex));
    if (!out.some((o) => o.weight === w)) out.push({ weight: w, reps: r, type: 'w' });
  }
  return out;
}

/** Dischi per lato. */
export function plateBreakdown(total, bar = S.settings.barWeight, plates = S.settings.plates) {
  const perSide = (total - bar) / 2;
  if (perSide <= 0) return { ok: total === bar, perSide: [], left: perSide };
  let left = perSide;
  const out = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    let n = Math.floor((left + 1e-6) / p);
    if (n > 0) { out.push({ p, n }); left -= n * p; }
  }
  return { ok: left < 0.01, perSide: out, left: Math.round(left * 100) / 100 };
}

/** Prossimo giorno da allenare: segue la rotazione in base allo storico. */
export function nextDay(routine) {
  if (!routine?.days?.length) return null;
  const done = S.sessions
    .filter((s) => s.routineId === routine.id && s.dayId)
    .slice(-10)
    .reverse();
  if (!done.length) return routine.days[0];
  const lastIdx = routine.days.findIndex((d) => d.id === done[0].dayId);
  if (lastIdx < 0) return routine.days[0];
  return routine.days[(lastIdx + 1) % routine.days.length];
}

/** Rileva i record personali battuti in una sessione appena conclusa. */
export function detectPRs(sess, prBefore) {
  const out = [];
  for (const ex of sess.exercises || []) {
    const done = (ex.sets || []).filter((s) => s.done && isWork(s));
    if (!done.length) continue;
    const before = prBefore[ex.exId] || { weight: 0, e1rm: 0, reps: 0 };
    const maxW = Math.max(...done.map((s) => Number(s.weight) || 0));
    const maxE = Math.max(...done.map((s) => e1rm(Number(s.weight) || 0, Number(s.reps) || 0)));
    const name = getEx(ex.exId).n;
    if (maxW > (before.weight || 0) && maxW > 0) out.push({ exId: ex.exId, type: 'carico', name, value: maxW });
    else if (maxE > (before.e1rm || 0) + 0.4 && maxE > 0) out.push({ exId: ex.exId, type: 'forza stimata', name, value: Math.round(maxE) });
  }
  return out;
}

/** Serie per gruppo muscolare in un insieme di sessioni (primari = 1, secondari = 0,5). */
export function setsByMuscle(sessions) {
  const out = {};
  for (const s of sessions) {
    for (const ex of s.exercises || []) {
      const n = (ex.sets || []).filter((x) => x.done && isWork(x)).length;
      if (!n) continue;
      const def = getEx(ex.exId);
      for (const m of def.m || []) out[m] = (out[m] || 0) + n;
      for (const m of def.s || []) out[m] = (out[m] || 0) + n * 0.5;
    }
  }
  return out;
}

/** Volume settimanale: [{week:'2026-10-06', volume, sessions}] */
export function weeklyVolume(weeks = 12) {
  const out = new Map();
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i * 7);
    const k = wk(d);
    out.set(k, { week: k, volume: 0, sessions: 0, sets: 0 });
  }
  for (const s of S.sessions) {
    const k = wk(new Date(s.date));
    if (!out.has(k)) continue;
    const e = out.get(k);
    e.volume += sessionVolume(s);
    e.sessions += 1;
    e.sets += (s.exercises || []).reduce((a, x) => a + (x.sets || []).filter((y) => y.done && isWork(y)).length, 0);
  }
  return [...out.values()];
}

function wk(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

/** Serie storica dell'1RM stimato per un esercizio. */
export function e1rmSeries(exId) {
  return historyOf(exId)
    .map((h) => ({ date: h.date, v: Math.max(...h.sets.map((s) => e1rm(Number(s.weight) || 0, Number(s.reps) || 0))) }))
    .filter((p) => p.v > 0)
    .reverse();
}

/** Volume per sessione di un esercizio (per i grafici di dettaglio). */
export function volSeries(exId) {
  return historyOf(exId)
    .map((h) => ({ date: h.date, v: h.sets.reduce((a, s) => a + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0) }))
    .reverse();
}

/** Muscoli allenati poco/troppo nelle ultime 4 settimane (guida nella home). */
export function balanceHint() {
  const since = Date.now() - 28 * 864e5;
  const ss = S.sessions.filter((s) => new Date(s.date).getTime() >= since);
  if (ss.length < 4) return null;
  const by = setsByMuscle(ss);
  const main = ['petto', 'dorso', 'spalle', 'quadricipiti', 'femorali', 'glutei', 'bicipiti', 'tricipiti'];
  const perWeek = main.map((m) => ({ m, v: (by[m] || 0) / 4 }));
  perWeek.sort((a, b) => a.v - b.v);
  const low = perWeek[0];
  if (low.v >= 8) return null;
  return { muscle: low.m, label: MUSCLES[low.m]?.n || low.m, sets: Math.round(low.v * 10) / 10 };
}

/** Un consiglio tecnico pescato dall'esercizio corrente (mostrato nel recupero). */
export function tipFor(exId, seed = 0) {
  const ex = getEx(exId);
  const pool = [...(ex.c || []), ...(ex.e || []).map((e) => 'Evita: ' + e)];
  if (!pool.length) return null;
  return pool[seed % pool.length];
}

export { prOf, lastPerf };
