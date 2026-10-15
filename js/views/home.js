/* "Oggi": cosa allenare adesso, in un tap. */

import { S, save, sessionsSince, sessionVolume, sessionSets, activeRoutine, idx, streakWeeks } from '../lib/store.js';
import { nextDay, balanceHint, parseReps } from '../lib/coach.js';
import { getEx, MUSCLES } from '../data/exercises.js';
import { esc, fmtVolume, fmtVol, fmtWeight, fmtDate, fmtDurShort, openSheet, closeSheet, on, $, plur } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { heatGrid } from '../lib/charts.js';
import { go, render } from '../app.js';
import { startWorkout, quickStart } from './workout.js';
import { doExport } from './settings.js';

function greet() {
  const h = new Date().getHours();
  if (h < 6) return 'Notte fonda';
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

/** Durata stimata di un giorno di scheda, in secondi. */
export function estimate(day) {
  let t = 0;
  for (const r of day.exercises || []) {
    const rr = parseReps(r.reps);
    const work = rr.timed ? rr.max : Math.max(20, rr.max * 3.5);
    t += r.sets * (work + (r.rest || 90));
    t += (r.warm ? 0 : r.warmSets || 0) * (work * 0.7 + 60);   // anche l'avvicinamento costa tempo
  }
  return t + 240; // riscaldamento e transizioni
}

/** Progresso verso l'obiettivo settimanale di allenamenti. */
function goalCard(done) {
  const goal = Math.max(1, S.settings.weeklyGoal || 4);
  const pct = Math.min(1, done / goal);
  const c = 2 * Math.PI * 26;
  return `<div class="card flex center gap14" style="margin-bottom:10px">
    <svg width="68" height="68" viewBox="0 0 68 68" style="flex:none;transform:rotate(-90deg)">
      <circle cx="34" cy="34" r="26" fill="none" stroke="var(--surface-3)" stroke-width="7"/>
      <circle cx="34" cy="34" r="26" fill="none" stroke="var(--acc)" stroke-width="7" stroke-linecap="round"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}"/>
    </svg>
    <div class="grow">
      <div class="fw7" style="font-size:16px;letter-spacing:-.02em">${done} di ${plur(goal, 'allenamento', 'allenamenti')}</div>
      <div class="s muted fs12" style="margin-top:2px">${done >= goal
        ? 'Obiettivo raggiunto, bravo.'
        : `Ne manca${goal - done === 1 ? '' : 'no'} ${goal - done} per chiudere la settimana.`}</div>
    </div>
  </div>`;
}

/** Invito (una sola volta) ad aggiungere l'app alla schermata Home. */
/**
 * Promemoria del backup. I dati stanno solo su questo telefono: se svuoti
 * Safari o cambi dispositivo spariscono, e nessuno te lo ricorda. Compare
 * quando si sono accumulati allenamenti non ancora messi al sicuro, e sparisce
 * da solo appena esporti.
 */
function backupCard() {
  const ultimo = S.meta.lastBackup ? new Date(S.meta.lastBackup) : null;
  const rinvio = S.meta.backupSnooze ? new Date(S.meta.backupSnooze) : null;
  const da = ultimo && rinvio ? new Date(Math.max(ultimo, rinvio)) : (ultimo || rinvio);
  const nuovi = S.sessions.filter((s) => !da || new Date(s.date) > da).length;
  if (nuovi < (ultimo ? 10 : 5)) return '';
  return `<div class="card mt20" style="border-color:var(--line-2)">
    <div class="flex center gap12">
      <span class="avatar">${icon('download', 20)}</span>
      <div class="grow"><div class="t fw7">Metti al sicuro i tuoi dati</div>
      <div class="s muted fs12">${ultimo
        ? `${plur(nuovi, 'allenamento registrato', 'allenamenti registrati')} dall’ultimo backup del ${esc(fmtDate(ultimo))}.`
        : `${plur(nuovi, 'allenamento registrato', 'allenamenti registrati')} e nessun backup: restano solo su questo telefono.`}</div></div>
    </div>
    <div class="flex gap8 mt14">
      <button class="btn ghost sm grow" data-act="backupskip">Più tardi</button>
      <button class="btn sm grow" data-act="backupnow">Esporta backup</button>
    </div>
  </div>`;
}

function installCard() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone || S.meta.installSeen) return '';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return `<div class="card mt20" style="border-color:var(--line-2)">
    <div class="flex center gap12">
      <span class="avatar acc">${icon('share', 20)}</span>
      <div class="grow"><div class="t fw7">Mettila sulla schermata Home</div>
      <div class="s muted fs12">${ios
        ? 'Condividi ' + icon('share', 12) + ' → Aggiungi a Home: va a schermo intero e funziona offline.'
        : 'Aggiungi l’app alla Home del telefono per usarla a schermo intero e offline.'}</div></div>
    </div>
    <div class="flex gap8 mt14">
      <button class="btn ghost sm grow" data-act="installok">Ho capito</button>
      <button class="btn sm grow" data-act="installhow">Come si fa</button>
    </div>
  </div>`;
}

function musclesOf(day) {
  const c = {};
  for (const r of day.exercises || []) for (const m of getEx(r.exId).m || []) c[m] = (c[m] || 0) + r.sets;
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([m]) => MUSCLES[m]?.n || m);
}

export default {
  render() {
    const rt = activeRoutine();
    const day = rt ? nextDay(rt) : null;
    const week = sessionsSince(7);
    const vol = week.reduce((a, s) => a + sessionVolume(s), 0);
    const sets = week.reduce((a, s) => a + sessionSets(s), 0);
    const last = S.sessions[S.sessions.length - 1];
    const streak = streakWeeks();
    const hint = balanceHint();

    return `
      <div class="topbar">
        <div>
          <h1>${greet()}</h1>
          <div class="sub">${esc(new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
        </div>
        <button class="icon-btn" data-act="settings">${icon('settings', 20)}</button>
      </div>

      ${day ? `
        <div class="card" style="background:linear-gradient(155deg,var(--surface-2),var(--surface));border-color:var(--line-2)">
          <div class="flex between center">
            <span class="pill acc">${icon('bolt', 13)} Prossimo allenamento</span>
            <button class="pill" data-act="pickday">${esc(rt.name)} ${icon('chevD', 12)}</button>
          </div>
          <h2 style="font-size:26px;font-weight:800;letter-spacing:-.035em;margin:12px 0 6px">${esc(day.name)}</h2>
          <div class="fs13 muted">${plur(day.exercises.length, 'esercizio', 'esercizi')} · ${day.exercises.reduce((a, e) => a + e.sets, 0)} serie${(() => {
            const sc = day.exercises.reduce((a, e) => a + (e.warm ? 0 : e.warmSets || 0), 0);
            return sc ? ` + ${sc} di riscaldamento` : '';
          })()} · ~${fmtDurShort(estimate(day))}</div>
          <div class="flex wrap gap6 mt10">${musclesOf(day).map((m) => `<span class="pill">${esc(m)}</span>`).join('')}</div>
          <div class="divider"></div>
          <div class="rows" style="margin:-4px 0 10px">
            ${day.exercises.slice(0, 4).map((r) => `<div class="flex center gap10" style="padding:5px 0">
              <span class="pill" style="min-width:42px;justify-content:center">${r.sets}×${esc(String(r.reps))}</span>
              <span class="fs15 nowrap grow">${esc(getEx(r.exId).n)}</span></div>`).join('')}
            ${day.exercises.length > 4 ? `<div class="fs12 muted" style="padding:4px 0 0">+ ${plur(day.exercises.length - 4, 'altro esercizio', 'altri esercizi')}</div>` : ''}
          </div>
          <button class="btn primary block xl" data-act="start">${icon('play', 20)} Inizia allenamento</button>
          <button class="btn ghost block sm mt10" data-act="freestart">Allenamento libero</button>
        </div>`
      : `<div class="card">
          <div class="empty" style="padding:26px 10px">
            <div class="ico">${icon('clipboard', 28)}</div>
            <h3>Nessuna scheda</h3>
            <p>Crea la tua scheda, importala da un testo o parti da un modello pronto.</p>
            <button class="btn primary" data-act="goroutines">${icon('plus', 18)} Crea la prima scheda</button>
          </div>
        </div>`}

      <div class="section-title">Questa settimana</div>
      ${goalCard(week.length)}
      <div class="stat-row">
        <div class="stat"><div class="v">${week.length}</div><div class="k">Allenamenti</div></div>
        <div class="stat"><div class="v">${fmtVolume(vol)}<span class="u">${vol >= 10000 ? '' : 'kg'}</span></div><div class="k">Volume</div></div>
        <div class="stat"><div class="v">${sets}</div><div class="k">Serie</div></div>
      </div>

      ${streak > 1 ? `<div class="card mt14 flex center gap12">
        <span class="avatar acc">${icon('flame', 22)}</span>
        <div class="grow"><div class="t fw7">${streak} settimane di fila</div>
        <div class="s muted fs12">Continua così, la costanza è tutto.</div></div></div>` : ''}

      ${hint ? `<div class="coach" style="margin:14px 0 0">${icon('bulb', 17)}
        <div>Nelle ultime 4 settimane hai fatto solo <b>${hint.sets} serie/sett.</b> per <b>${esc(hint.label)}</b>. Valuta di aggiungerne qualcuna.</div></div>` : ''}

      <div class="section-title">Costanza <button data-act="gohistory">Diario</button></div>
      <div class="card">${heatGrid(idx().days, 22)}</div>

      ${last ? `<div class="section-title">Ultimo allenamento</div>
        <button class="card tappable flush block" style="width:100%" data-act="lastsess">
          <div class="row">
            <span class="avatar acc">${icon('dumbbell', 20)}</span>
            <span class="grow" style="text-align:left"><span class="t">${esc(last.name || 'Allenamento')}</span>
            <span class="s">${esc(fmtDate(last.date))} · ${fmtDurShort(last.duration || 0)} · ${fmtVol(sessionVolume(last))}</span></span>
            <span class="chev">${icon('chevR', 18)}</span>
          </div>
        </button>` : ''}

      ${backupCard()}
      ${installCard()}

      <div class="section-title">Scorciatoie</div>
      <div class="card flush"><div class="rows">
        <button class="row" data-act="goexercises"><span class="avatar">${icon('book', 20)}</span>
          <span class="grow"><span class="t">Libreria esercizi</span><span class="s">Tecnica, errori comuni, animazioni</span></span>${icon('chevR', 18)}</button>
        <button class="row" data-act="measure"><span class="avatar">${icon('scale', 20)}</span>
          <span class="grow"><span class="t">Registra peso e misure</span><span class="s">${S.profile.bodyWeight ? fmtWeight(S.profile.bodyWeight) + ' kg attuali' : 'Non ancora registrato'}</span></span>${icon('chevR', 18)}</button>
      </div></div>`;
  },

  mount(root) {
    const rt = activeRoutine();
    on(root, 'click', '[data-act="start"]', () => { const d = nextDay(rt); if (d) startWorkout(rt, d); });
    on(root, 'click', '[data-act="freestart"]', () => quickStart());
    on(root, 'click', '[data-act="settings"]', () => go('settings'));
    on(root, 'click', '[data-act="goroutines"]', () => go('routines', {}, { reset: true }));
    on(root, 'click', '[data-act="gohistory"]', () => go('history', {}, { reset: true }));
    on(root, 'click', '[data-act="goexercises"]', () => go('exercises'));
    on(root, 'click', '[data-act="backupnow"]', () => doExport());
    // "più tardi": segna la data senza esportare, così la card tace per un po'
    on(root, 'click', '[data-act="backupskip"]', () => {
      S.meta.backupSnooze = new Date().toISOString();
      save(); render();
    });
    on(root, 'click', '[data-act="lastsess"]', () => go('history', { open: S.sessions[S.sessions.length - 1].id }));
    on(root, 'click', '[data-act="measure"]', () => import('./stats.js').then((m) => m.measureSheet()));
    on(root, 'click', '[data-act="installok"]', () => { S.meta.installSeen = true; save(); render(); });
    on(root, 'click', '[data-act="installhow"]', () => import('./settings.js').then((m) => m.installSheet()));
    on(root, 'click', '[data-act="pickday"]', () => {
      if (!rt) return;
      openSheet({
        title: 'Scegli cosa allenare',
        body: `<div class="card flush"><div class="rows">
          ${S.routines.map((r) => r.days.map((d) => `
            <button class="row" data-r="${r.id}" data-d="${d.id}">
              <span class="avatar ${r.id === rt.id ? 'acc' : ''}">${icon('dumbbell', 19)}</span>
              <span class="grow"><span class="t">${esc(d.name)}</span><span class="s">${esc(r.name)} · ${plur(d.exercises.length, 'esercizio', 'esercizi')}</span></span>
              ${icon('chevR', 18)}</button>`).join('')).join('')}
        </div></div>`,
        onMount: (el) => on(el, 'click', '[data-r]', (e, t) => {
          const r = S.routines.find((x) => x.id === t.dataset.r);
          const d = r?.days.find((x) => x.id === t.dataset.d);
          closeSheet();
          if (r && d) startWorkout(r, d);
        }),
      });
    });
  },
};
