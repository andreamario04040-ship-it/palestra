/* Helper DOM, formattazione, feedback (toast / audio / vibrazione) e bottom sheet. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape per interpolazione sicura nelle template string HTML. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function debounce(fn, ms = 300) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/* ------------------------------------------------------- formattazione -- */

export function fmtNum(n, dec = 1) {
  if (n == null || isNaN(n)) return '0';
  const r = Math.round(n * 10 ** dec) / 10 ** dec;
  return String(r).replace('.', ',');
}

/** 12500 -> "12,5 t" ; 850 -> "850 kg" */
export function fmtVolume(kg) {
  if (!kg) return '0';
  if (kg >= 10000) return fmtNum(kg / 1000, 1) + ' t';
  return Math.round(kg).toLocaleString('it-IT');
}

/** Volume con unita' coerente: "12,5 t" oppure "850 kg". */
export function fmtVol(kg) {
  return fmtVolume(kg) + (kg >= 10000 ? '' : ' kg');
}

export function fmtWeight(w) {
  if (w == null || w === '') return '—';
  return fmtNum(w, 2).replace(/,00$/, '').replace(/(,\d)0$/, '$1');
}

/** secondi -> "1:05:20" / "45:08" / "0:30" */
export function fmtDur(sec, forceH = false) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h || forceH) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** secondi -> "1h 12m" / "48 min" */
export function fmtDurShort(sec) {
  const m = Math.round(sec / 60);
  if (m >= 60) return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
  return `${m} min`;
}

export const DOW = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
export const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

/** chiave giorno locale YYYY-MM-DD (niente UTC: evita lo shift di fuso) */
export function dayKey(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function fmtDate(iso, opts = {}) {
  const d = new Date(iso);
  const today = dayKey();
  const k = dayKey(d);
  const yest = dayKey(new Date(Date.now() - 864e5));
  if (!opts.full) {
    if (k === today) return 'Oggi';
    if (k === yest) return 'Ieri';
  }
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${DOW[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}${sameYear ? '' : ' ' + d.getFullYear()}`;
}

export function fmtTime(iso) {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* --------------------------------------------------------------- feedback */

let actx = null;
export function audioUnlock() {
  if (actx) return actx;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    // "sblocco" iOS: un buffer muto appena c'è un gesto utente
    const b = actx.createBuffer(1, 1, 22050);
    const src = actx.createBufferSource();
    src.buffer = b; src.connect(actx.destination); src.start(0);
  } catch { /* audio non disponibile */ }
  return actx;
}

/** Bip sintetico: freq Hz, durata ms, volume 0-1. */
export function beep(freq = 880, ms = 130, vol = 0.22) {
  const ctx = audioUnlock();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + ms / 1000 + 0.02);
}

export function chime() {
  beep(784, 150, 0.2);
  setTimeout(() => beep(1046, 260, 0.24), 150);
}

export function vibrate(pattern) {
  try { navigator.vibrate?.(pattern); } catch { /* non supportato su iOS */ }
}

/* ----------------------------------------------------------------- toast */

export function toast(msg, type = '', ms = 2600) {
  let host = $('#toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toasts';
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = msg;
  host.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 320);
  }, ms);
  return t;
}

export function sparkle(n = 34) {
  const wrap = document.createElement('div');
  wrap.className = 'sparkle';
  const cols = ['#d7ff3e', '#9ae630', '#8b7bff', '#4cd7f6', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = cols[(Math.random() * cols.length) | 0];
    p.style.animationDuration = (1.1 + Math.random() * 1.1) + 's';
    p.style.animationDelay = (Math.random() * 0.35) + 's';
    p.style.transform = `scale(${0.6 + Math.random()})`;
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 2800);
}

/* ----------------------------------------------------------- bottom sheet */

const sheetStack = [];

/**
 * Apre un bottom sheet.
 * @param {{title?:string, body:string, foot?:string, onMount?:(el:HTMLElement)=>void, full?:boolean}} opt
 */
export function openSheet(opt) {
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.innerHTML = `
    <div class="grab"></div>
    ${opt.title !== undefined ? `<div class="sheet-head">
      <h3>${esc(opt.title)}</h3>
      <button class="icon-btn ghost" data-sheet-close aria-label="Chiudi">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>` : ''}
    <div class="sheet-body"${opt.full ? ' style="max-height:none"' : ''}>${opt.body}</div>
    ${opt.foot ? `<div class="sheet-foot">${opt.foot}</div>` : ''}`;

  document.body.appendChild(scrim);
  document.body.appendChild(sheet);
  const entry = { scrim, sheet, onClose: opt.onClose };
  sheetStack.push(entry);

  scrim.addEventListener('click', () => closeSheet());
  sheet.querySelector('[data-sheet-close]')?.addEventListener('click', () => closeSheet());

  // trascinamento verso il basso per chiudere
  let y0 = null, dy = 0;
  const grab = sheet.querySelector('.grab');
  const head = sheet.querySelector('.sheet-head') || grab;
  const onStart = (e) => { y0 = e.touches[0].clientY; dy = 0; sheet.style.transition = 'none'; };
  const onMove = (e) => {
    if (y0 == null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    sheet.style.transform = `translateY(${dy}px)`;
  };
  const onEnd = () => {
    sheet.style.transition = '';
    sheet.style.transform = '';
    if (dy > 90) closeSheet();
    y0 = null;
  };
  [grab, head].forEach((n) => {
    n?.addEventListener('touchstart', onStart, { passive: true });
    n?.addEventListener('touchmove', onMove, { passive: true });
    n?.addEventListener('touchend', onEnd);
  });

  opt.onMount?.(sheet);
  return sheet;
}

export function closeSheet(all = false) {
  const e = sheetStack.pop();
  if (!e) return;
  e.sheet.dispatchEvent(new CustomEvent('sheetdestroy'));
  e.sheet.classList.add('closing');
  e.scrim.classList.add('closing');
  setTimeout(() => { e.sheet.remove(); e.scrim.remove(); }, 230);
  e.onClose?.();
  if (all && sheetStack.length) closeSheet(true);
}

export const sheetOpen = () => sheetStack.length > 0;

/** Conferma modale -> Promise<boolean> */
export function confirmSheet(title, msg, okLabel = 'Conferma', danger = true) {
  return new Promise((resolve) => {
    let done = false;
    const sheet = openSheet({
      title,
      body: `<p style="color:var(--txt-2);font-size:15px;line-height:1.5;margin-bottom:6px">${esc(msg)}</p>`,
      foot: `<button class="btn ghost" data-no>Annulla</button>
             <button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(okLabel)}</button>`,
      onClose: () => { if (!done) resolve(false); },
    });
    sheet.querySelector('[data-no]').onclick = () => { done = true; resolve(false); closeSheet(); };
    sheet.querySelector('[data-yes]').onclick = () => { done = true; resolve(true); closeSheet(); };
  });
}

/** Input modale -> Promise<string|null> */
export function promptSheet(title, { value = '', placeholder = '', multiline = false, label = '', ok = 'Salva' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const sheet = openSheet({
      title,
      body: `<div class="field">${label ? `<label>${esc(label)}</label>` : ''}
        ${multiline
          ? `<textarea class="input" data-in placeholder="${esc(placeholder)}" style="min-height:140px">${esc(value)}</textarea>`
          : `<input class="input" data-in value="${esc(value)}" placeholder="${esc(placeholder)}">`}
        </div>`,
      foot: `<button class="btn ghost" data-no>Annulla</button><button class="btn primary" data-yes>${esc(ok)}</button>`,
      onClose: () => { if (!done) resolve(null); },
      onMount: (s) => setTimeout(() => s.querySelector('[data-in]').focus(), 180),
    });
    sheet.querySelector('[data-no]').onclick = () => { done = true; resolve(null); closeSheet(); };
    sheet.querySelector('[data-yes]').onclick = () => {
      done = true; resolve(sheet.querySelector('[data-in]').value.trim()); closeSheet();
    };
  });
}

/* ------------------------------------------------------- misc interazioni */

/** Delegazione eventi: on(root,'click','[data-act="x"]',handler) */
export function on(root, type, sel, handler) {
  root.addEventListener(type, (e) => {
    const t = e.target.closest(sel);
    if (t && root.contains(t)) handler(e, t);
  });
}

/** Scroll orizzontale per portare un elemento al centro del contenitore. */
export function centerInScroller(el) {
  if (!el) return;
  const p = el.parentElement;
  p.scrollTo({ left: el.offsetLeft - p.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
}
