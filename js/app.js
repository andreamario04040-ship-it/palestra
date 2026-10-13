/* Bootstrap, router e shell dell'applicazione. */

import { S, load, save, sub, buildIndex } from './lib/store.js';
import { registerCustom } from './data/exercises.js';
import { $, on, audioUnlock, toast, closeSheet, sheetOpen } from './lib/dom.js';
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
  { k: 'start', ico: 'play', lab: '' },
  { k: 'history', ico: 'calendar', lab: 'Diario' },
  { k: 'stats', ico: 'chart', lab: 'Statistiche' },
];

let stack = [{ name: 'home', params: {} }];
let scrollMemo = {};

export function route() { return stack[stack.length - 1]; }

export function go(name, params = {}, { replace = false, reset = false } = {}) {
  if (sheetOpen()) closeSheet(true);
  const cur = route();
  scrollMemo[cur.name + JSON.stringify(cur.params)] = window.scrollY;
  if (reset) stack = [{ name, params }];
  else if (replace) stack[stack.length - 1] = { name, params };
  else stack.push({ name, params });
  render();
  window.scrollTo(0, 0);
}

export function back() {
  if (sheetOpen()) { closeSheet(); return; }
  if (stack.length > 1) {
    stack.pop();
    render();
    const cur = route();
    const y = scrollMemo[cur.name + JSON.stringify(cur.params)] || 0;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }
}

export function canGoBack() { return stack.length > 1; }

/* ------------------------------------------------------------- rendering */

let appEl, tabEl;

export function render() {
  const r = route();
  const view = VIEWS[r.name] || VIEWS.home;
  clearFigures();

  // allenamento in corso: schermata a tutto schermo
  if (isWorkoutOpen()) {
    appEl.innerHTML = renderWorkout();
    tabEl.style.display = 'none';
    mountWorkout(appEl);
    return;
  }

  tabEl.style.display = '';
  appEl.innerHTML = `<div class="screen" data-view="${r.name}">${resumeBanner()}${view.render(r.params)}</div>`;
  view.mount?.($('.screen', appEl), r.params);
  syncTabs();
}

function syncTabs() {
  const r = route().name;
  for (const b of tabEl.querySelectorAll('button[data-tab]')) {
    b.classList.toggle('on', b.dataset.tab === r);
  }
}

function tabbar() {
  return TABS.map((t) => {
    if (t.k === 'start') {
      return `<div class="fab-slot"><button class="tab-fab" data-act="quickstart" aria-label="Inizia allenamento">${icon('logo', 28)}</button></div>`;
    }
    return `<button data-tab="${t.k}" data-act="tab" data-k="${t.k}">${icon(t.ico, 23)}<span>${t.lab}</span></button>`;
  }).join('');
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
  tabEl = document.createElement('nav');
  tabEl.className = 'tabbar';
  tabEl.innerHTML = tabbar();
  document.body.appendChild(tabEl);

  await load();
  registerCustom(S.customEx || []);
  buildIndex();
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  render();

  // scorciatoia dal manifest / link diretto
  if (new URLSearchParams(location.search).get('a') === 'start') {
    history.replaceState({}, '', location.pathname);
    setTimeout(() => import('./views/workout.js').then((m) => m.quickStart()), 400);
  }

  // delega globale
  on(document, 'click', '[data-act="tab"]', (e, t) => {
    const k = t.dataset.k;
    if (route().name === k) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    go(k, {}, { reset: true });
  });
  on(document, 'click', '[data-act="back"]', () => back());
  on(document, 'click', '[data-act="quickstart"]', () => import('./views/workout.js').then((m) => m.quickStart()));

  // primo gesto: sblocca l'audio per i timer
  const unlock = () => { audioUnlock(); document.removeEventListener('touchend', unlock); document.removeEventListener('click', unlock); };
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

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          const t = toast('Nuova versione disponibile · <b style="text-decoration:underline">aggiorna</b>', '', 8000);
          t.style.pointerEvents = 'auto';
          t.onclick = () => { nw.postMessage('skipWaiting'); location.reload(); };
        }
      });
    });
  }).catch(() => { /* offline o non supportato */ });
}

document.addEventListener('DOMContentLoaded', boot);
