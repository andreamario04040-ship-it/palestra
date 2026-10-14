/* =========================================================================
   Stato applicazione + persistenza 100% locale.
   - sorgente primaria: localStorage (sincrono, immediato)
   - copia di sicurezza: IndexedDB (ripristino automatico se localStorage si svuota)
   Nessun dato lascia il dispositivo.
   ========================================================================= */

import { uid, dayKey } from './dom.js';

const KEY = 'palestra.state.v1';
const IDB_NAME = 'palestra-backup';

export const DEFAULTS = {
  v: 1,
  profile: { name: '', bodyWeight: null, height: null, birth: null, goal: 'ipertrofia' },
  settings: {
    restDefault: 90,
    autoRest: true,
    autoAdvance: true,
    sound: true,
    vibrate: true,
    wakeLock: true,
    theme: 'dark',
    barWeight: 20,
    plates: [25, 20, 15, 10, 5, 2.5, 1.25],
    suggest: true,
    warmup: true,
    rpe: false,
    weeklyGoal: 4,
    unit: 'kg',
  },
  routines: [],
  activeRoutineId: null,
  sessions: [],       // allenamenti completati (più recente in coda)
  measures: [],       // peso corporeo e circonferenze
  customEx: [],       // esercizi creati dall'utente
  current: null,      // allenamento in corso
  meta: { installSeen: false, created: null, lastBackup: null, seeded: false, warmupsFilled: false },
};

export const S = structuredClone(DEFAULTS);

/* ------------------------------------------------------------ persistenza */

let saveTimer = null;
const listeners = new Set();

export function sub(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function emit() { for (const f of listeners) f(); }

function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('kv')) r.result.createObjectStore('kv'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function idbPut(val) {
  try {
    const db = await idb();
    await new Promise((res, rej) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(val, 'state');
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
    db.close();
  } catch { /* backup non disponibile: non è bloccante */ }
}

async function idbGet() {
  try {
    const db = await idb();
    const v = await new Promise((res, rej) => {
      const tx = db.transaction('kv', 'readonly');
      const q = tx.objectStore('kv').get('state');
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
    db.close();
    return v || null;
  } catch { return null; }
}

/** Salvataggio immediato (localStorage) + mirror differito (IndexedDB). */
export function save(immediate = false) {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {
    console.warn('localStorage pieno o non disponibile', e);
  }
  clearTimeout(saveTimer);
  if (immediate) idbPut(structuredClone(S));
  else saveTimer = setTimeout(() => idbPut(structuredClone(S)), 1500);
  emit();
}

function hydrate(raw) {
  if (!raw || typeof raw !== 'object') return false;
  // merge difensivo: nuove chiavi dei DEFAULTS sempre presenti
  Object.assign(S, structuredClone(DEFAULTS), raw);
  S.settings = { ...DEFAULTS.settings, ...(raw.settings || {}) };
  S.profile = { ...DEFAULTS.profile, ...(raw.profile || {}) };
  S.meta = { ...DEFAULTS.meta, ...(raw.meta || {}) };
  if (!Array.isArray(S.sessions)) S.sessions = [];
  if (!Array.isArray(S.routines)) S.routines = [];
  if (!Array.isArray(S.measures)) S.measures = [];
  if (!Array.isArray(S.customEx)) S.customEx = [];
  migrate();
  return true;
}

/** Allinea i dati salvati con lo schema corrente. */
function migrate() {
  const fixSets = (sets) => {
    for (const s of sets || []) {
      if (!s.type) s.type = s.warm ? 'w' : 'n';
      delete s.warm;
    }
  };
  for (const sess of S.sessions) for (const ex of sess.exercises || []) fixSets(ex.sets);
  if (S.current) for (const ex of S.current.exercises || []) fixSets(ex.sets);
  for (const r of S.routines) for (const d of r.days || []) for (const row of d.exercises || []) {
    if (row.superset === undefined) row.superset = null;
    if (row.warm === undefined) row.warm = false;
    if (row.warmSets === undefined) row.warmSets = 0;
  }
}

export async function load() {
  let ok = false;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) ok = hydrate(JSON.parse(raw));
  } catch (e) { console.warn('stato locale illeggibile', e); }

  if (!ok) {
    const backup = await idbGet();
    if (backup) {
      ok = hydrate(backup);
      if (ok) { console.info('stato ripristinato dal backup IndexedDB'); save(); }
    }
  }
  if (!S.meta.created) { S.meta.created = new Date().toISOString(); save(); }

  // storage persistente: evita l'eviction automatica del browser
  try { navigator.storage?.persist?.(); } catch { /* ignore */ }

  buildIndex();
  return ok;
}

/* ----------------------------------------------------------------- indici */

let IDX = { byEx: {}, pr: {}, days: {} };

const e1rm = (w, r) => (r <= 1 ? w : w * (1 + r / 30));
export { e1rm };

/* Tipi di serie (come nelle app di riferimento):
   w = riscaldamento · n = normale · d = drop set · m = myo-reps · f = a cedimento */
export const SET_TYPES = {
  w: { lab: 'W', name: 'Riscaldamento', desc: 'Non conta nel volume né nei record', cls: 'warm' },
  n: { lab: '', name: 'Normale', desc: 'Serie di lavoro', cls: '' },
  d: { lab: 'D', name: 'Drop set', desc: 'Scarico immediato senza recupero', cls: 'drop' },
  m: { lab: 'M', name: 'Myo-reps', desc: 'Serie di attivazione, poi mini-serie da 3-5 con un respiro di recupero', cls: 'myo' },
  f: { lab: 'F', name: 'A cedimento', desc: 'Portata al limite', cls: 'fail' },
};

/** Recupero fra le mini-serie delle myo-reps: il tempo di 3-5 respiri. */
export const MYO_REST = 20;

/** Serie "di lavoro": esclude il riscaldamento (retrocompatibile con `warm`). */
export const isWork = (s) => !!s && s.type !== 'w' && s.warm !== true;

export function sessionVolume(sess) {
  let v = 0;
  for (const ex of sess.exercises || []) {
    for (const s of ex.sets || []) {
      if (s.done && isWork(s)) v += (Number(s.weight) || 0) * (Number(s.reps) || 0);
    }
  }
  return v;
}

export function sessionSets(sess) {
  let n = 0;
  for (const ex of sess.exercises || []) n += (ex.sets || []).filter((s) => s.done && isWork(s)).length;
  return n;
}

export function buildIndex() {
  const byEx = {}, pr = {}, days = {};
  for (const sess of S.sessions) {
    days[dayKey(new Date(sess.date))] = (days[dayKey(new Date(sess.date))] || 0) + 1;
    for (const ex of sess.exercises || []) {
      const done = (ex.sets || []).filter((s) => s.done && isWork(s));
      if (!done.length) continue;
      (byEx[ex.exId] ||= []).push({ date: sess.date, sessionId: sess.id, sets: done });
      const p = (pr[ex.exId] ||= { weight: 0, reps: 0, e1rm: 0, volume: 0, date: null });
      let vol = 0;
      for (const s of done) {
        const w = Number(s.weight) || 0, r = Number(s.reps) || 0;
        vol += w * r;
        if (w > p.weight) { p.weight = w; p.weightReps = r; p.weightDate = sess.date; }
        if (r > p.reps) { p.reps = r; p.repsWeight = w; }
        const e = e1rm(w, r);
        if (e > p.e1rm) { p.e1rm = e; p.e1rmDate = sess.date; }
      }
      if (vol > p.volume) { p.volume = vol; p.volumeDate = sess.date; }
      p.date = sess.date;
    }
  }
  for (const k of Object.keys(byEx)) byEx[k].sort((a, b) => new Date(b.date) - new Date(a.date));
  IDX = { byEx, pr, days };
  return IDX;
}

export const idx = () => IDX;
export const historyOf = (exId) => IDX.byEx[exId] || [];
export const prOf = (exId) => IDX.pr[exId] || null;
export const lastPerf = (exId) => (IDX.byEx[exId] || [])[0] || null;

/* --------------------------------------------------------------- routine */

export function getRoutine(id) { return S.routines.find((r) => r.id === id) || null; }
export function activeRoutine() { return getRoutine(S.activeRoutineId) || S.routines[0] || null; }

export function newRoutine(name = 'Nuova scheda') {
  const r = { id: uid(), name, note: '', days: [], created: new Date().toISOString() };
  S.routines.push(r);
  if (!S.activeRoutineId) S.activeRoutineId = r.id;
  save();
  return r;
}

export function newDay(routine, name) {
  const d = { id: uid(), name: name || `Giorno ${routine.days.length + 1}`, exercises: [] };
  routine.days.push(d);
  save();
  return d;
}

/** Riga esercizio dentro un giorno di scheda. */
export function newRow(exId, { sets = 3, reps = '8-12', rest = 90, note = '', superset = null, warm = false, warmSets = 0 } = {}) {
  return { id: uid(), exId, sets, reps, rest, note, superset, warm, warmSets };
}

export function deleteRoutine(id) {
  S.routines = S.routines.filter((r) => r.id !== id);
  if (S.activeRoutineId === id) S.activeRoutineId = S.routines[0]?.id || null;
  save();
}

/* ------------------------------------------------------------- sessioni -- */

export function addSession(sess) {
  S.sessions.push(sess);
  S.sessions.sort((a, b) => new Date(a.date) - new Date(b.date));
  buildIndex();
  save(true);
}

export function deleteSession(id) {
  S.sessions = S.sessions.filter((s) => s.id !== id);
  buildIndex();
  save(true);
}

/** Sessioni negli ultimi `days` giorni. */
export function sessionsSince(days) {
  const t = Date.now() - days * 864e5;
  return S.sessions.filter((s) => new Date(s.date).getTime() >= t);
}

/** Giorni consecutivi con almeno un allenamento (tolleranza: settimana corrente). */
export function streakWeeks() {
  if (!S.sessions.length) return 0;
  const weeks = new Set(S.sessions.map((s) => weekKey(new Date(s.date))));
  let n = 0;
  const d = new Date();
  for (;;) {
    const k = weekKey(d);
    if (weeks.has(k)) { n++; d.setDate(d.getDate() - 7); }
    else if (n === 0 && weeks.has(weekKey(new Date(d.getTime() - 7 * 864e5)))) { d.setDate(d.getDate() - 7); }
    else break;
    if (n > 520) break;
  }
  return n;
}

export function weekKey(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // lunedì
  return dayKey(x);
}

/* ------------------------------------------------------------- misure --- */

export function addMeasure(m) {
  S.measures.push({ id: uid(), date: new Date().toISOString(), ...m });
  S.measures.sort((a, b) => new Date(a.date) - new Date(b.date));
  if (m.weight) S.profile.bodyWeight = m.weight;
  save(true);
}

/* ------------------------------------------------------- import / export */

export function exportJSON() {
  return JSON.stringify({ ...S, current: null, _exported: new Date().toISOString() }, null, 1);
}

export function importJSON(text, { merge = false } = {}) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object') throw new Error('File non valido');
  if (merge) {
    const have = new Set(S.sessions.map((s) => s.id));
    for (const s of data.sessions || []) if (!have.has(s.id)) S.sessions.push(s);
    const haveR = new Set(S.routines.map((r) => r.id));
    for (const r of data.routines || []) if (!haveR.has(r.id)) S.routines.push(r);
    const haveM = new Set(S.measures.map((m) => m.id));
    for (const m of data.measures || []) if (!haveM.has(m.id)) S.measures.push(m);
    S.sessions.sort((a, b) => new Date(a.date) - new Date(b.date));
  } else {
    hydrate(data);
  }
  S.current = null;
  S.meta.lastBackup = new Date().toISOString();
  buildIndex();
  save(true);
}

export function resetAll() {
  Object.assign(S, structuredClone(DEFAULTS));
  S.meta.created = new Date().toISOString();
  buildIndex();
  save(true);
}
