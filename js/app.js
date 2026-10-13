/* Bootstrap, router e shell dell'applicazione.

   Struttura: #app è alto quanto la finestra (100dvh) ed è una colonna flex.
   Lo scroll avviene dentro #view, non sulla pagina: così la tab bar è un
   elemento di flusso ancorato in fondo alla colonna e non può "staccarsi"
   dal bordo inferiore, cosa che su iOS succede agli elementi `position:fixed`
   dopo l'apertura e chiusura della tastiera.                               */

import { S, load, save, sub, buildIndex } from './lib/store.js';
import { registerCustom } from './data/exercises.js';
import { $, on, audioUnlock, closeSheet, sheetOpen, initKeyboard } from './lib/dom.js';
import { icon } from './lib/icons.js';
import { clearFigures } from './lib/anim.js';

import home from './views/home.js';
import routines from './views/routines.js';
import historyView from './views/history.js';
import stats from './views/stats.js';
import settings from './views/settings.js';
import exercises from './views/exercises.js';
import { renderWorkout, mountWorkout, isWorkoutOpen, resumeBanner } from './views/workout.js';

const VIEWS = { home, routines, history: historyView, stats, settings, exercises };

const TABS = [
  { k: 'home', ico: 'home', lab: 'Oggi' },
  { k: 'routines', ico: 'clipboard', lab: 'Schede' },
  { k: 'start', ico: 'logo', lab: '' },
  { k: 'history', ico: 'calendar', lab: 'Diario' },
  { k: 'stats', ico: 'chart', lab: 'Statistiche' },
];

let stack = [{ name: 'home', params: {} }];
const scrollMemo = {};

export function route() { return stack[stack.length - 1]; }

const memoKey = (r) => r.name + JSON.stringify(r.params);

export function go(name, params = {}, { replace = false, reset = false } = {}) {
  if (sheetOpen()) closeSheet(true);
  const view = $('#view');
  if (view) scrollMemo[memoKey(route())] = view.scrollTop;
  if (reset) stack = [{ name, params }];
  else if (replace) stack[stack.length - 1] = { name, params };
  else stack.push({ name, params });
  render();
  $('#view')?.scrollTo(0, 0);
}

export function back() {
  if (sheetOpen()) { closeSheet(); return; }
  if (stack.length > 1) {
    stack.pop();
    render();
    const y = scrollMemo[memoKey(route())] || 0;
    requestAnimationFrame(() => $('#view')?.scrollTo(0, y));
  }
}

export function canGoBack() { return stack.length > 1; }

/* ------------------------------------------------------------- rendering */

let appEl;

function shell() {
  return `<main id="view"></main>
    <nav class="tabbar" id="tabbar">${TABS.map((t) => (t.k === 'start'
      ? `<div class="fab-slot"><button class="tab-fab" data-act="quickstart" aria-label="Inizia allenamento">${icon('logo', 30)}</button></div>`
      : `<button data-tab="${t.k}" data-act="tab" data-k="${t.k}">${icon(t.ico, 23)}<span>${t.lab}</span></button>`)).join('')}
    </nav>`;
}

export function render() {
  const r = route();
  const view = VIEWS[r.name] || VIEWS.home;
  clearFigures();

  // allenamento in corso: occupa tutta la colonna, senza tab bar
  if (isWorkoutOpen()) {
    appEl.innerHTML = renderWorkout();
    mountWorkout($('.wk', appEl));   // nodo nuovo a ogni render: niente listener duplicati
    return;
  }

  if (!$('#view')) appEl.innerHTML = shell();
  const viewEl = $('#view');
  viewEl.innerHTML = `<div class="screen" data-view="${r.name}">${resumeBanner()}${view.render(r.params)}</div>`;
  view.mount?.($('.screen', viewEl), r.params);
  syncTabs();
}

function syncTabs() {
  const r = route().name;
  for (const b of document.querySelectorAll('#tabbar button[data-tab]')) {
    b.classList.toggle('on', b.dataset.tab === r);
  }
}

/* --------------------------------------------------------- altezza shell */

/**
 * Rete di sicurezza: `#app` è fisso con `inset: 0`, quindi dovrebbe già coprire
 * tutto il viewport. Se però il browser riporta un'altezza diversa (è successo
 * su iOS in standalone), la forziamo al valore misurato.
 */
function fitShell() {
  if (!appEl || document.body.classList.contains('kb-open')) return;
  const h = window.innerHeight;
  if (!h) return;
  const got = appEl.getBoundingClientRect().height;
  appEl.style.height = Math.abs(got - h) > 2 ? h + 'px' : '';
}

/* ------------------------------------------------------------------ tema */

export function applyTheme() {
  const t = S.settings.theme;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0a0b0f' : '#f4f5f8');
}

/* ------------------------------------------------------------------ boot */

async function boot() {
  appEl = $('#app');
  appEl.innerHTML = shell();

  await load();
  registerCustom(S.customEx || []);
  buildIndex();
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  render();
  initKeyboard();
  fitShell();
  window.addEventListener('resize', fitShell);
  window.addEventListener('orientationchange', () => setTimeout(fitShell, 250));
  window.visualViewport?.addEventListener('resize', () => setTimeout(fitShell, 60));

  // scorciatoia dal manifest / link diretto
  if (new URLSearchParams(location.search).get('a') === 'start') {
    window.history.replaceState({}, '', location.pathname);
    setTimeout(() => import('./views/workout.js').then((m) => m.quickStart()), 400);
  }

  // delega globale
  on(document, 'click', '[data-act="tab"]', (e, t) => {
    const k = t.dataset.k;
    if (route().name === k) { $('#view')?.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    go(k, {}, { reset: true });
  });
  on(document, 'click', '[data-act="back"]', () => back());
  on(document, 'click', '[data-act="quickstart"]', () => import('./views/workout.js').then((m) => m.quickStart()));

  // primo gesto: sblocca l'audio per i timer
  const unlock = () => { audioUnlock(); };
  document.addEventListener('touchend', unlock, { once: true });
  document.addEventListener('click', unlock, { once: true });

  // gesto "indietro" del browser
  window.history.pushState?.({}, '');
  window.addEventListener('popstate', () => {
    if (isWorkoutOpen()) { window.history.pushState({}, ''); return; }
    if (canGoBack() || sheetOpen()) { back(); window.history.pushState({}, ''); }
  });

  // salvataggio di sicurezza quando l'app va in background
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
  window.addEventListener('pagehide', () => save(true));

  sub(() => { /* hook per futuri aggiornamenti reattivi */ });

  registerSW();
}

/* ---------------------------------------------------------- service worker */

/* Aggiornamenti: appena il nuovo service worker prende il controllo, la pagina
   si ricarica da sola. Se è in corso un allenamento aspettiamo la fine, per non
   interromperlo. L'utente non deve fare nulla e non c'è nessun avviso da
   cogliere al volo. */

let pendingUpdate = false;
let updating = false;

function applyUpdate() {
  if (updating) return;
  updating = true;
  location.reload();
}

/** Forza il controllo e l'installazione di una nuova versione. */
export async function checkForUpdate({ force = false } = {}) {
  if (!('serviceWorker' in navigator)) { if (force) applyUpdate(); return 'nd'; }
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) { if (force) applyUpdate(); return 'nd'; }
  try { await reg.update(); } catch { /* offline */ }
  if (reg.waiting) {
    reg.waiting.postMessage('skipWaiting');
    setTimeout(applyUpdate, 600);
    return 'nuova';
  }
  if (force) {
    // niente di nuovo: svuoto comunque la cache e ricarico pulito
    try { for (const k of await caches.keys()) await caches.delete(k); } catch { /* ignore */ }
    applyUpdate();
  }
  return 'aggiornata';
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;            // prima installazione: niente ricarica
    if (isWorkoutOpen()) { pendingUpdate = true; return; }
    applyUpdate();
  });

  // aggiornamento rimasto in sospeso durante un allenamento: lo applico al
  // rientro nell'app, quando non c'è nulla da interrompere
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && pendingUpdate && !isWorkoutOpen()) applyUpdate();
  });

  navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
    // controlla a ogni ritorno in primo piano
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) reg.update().catch(() => { /* offline */ });
    });
  }).catch(() => { /* offline o non supportato */ });
}

document.addEventListener('DOMContentLoaded', boot);
