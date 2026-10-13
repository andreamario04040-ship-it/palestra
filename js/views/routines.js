/* Schede: elenco, editor giorni/esercizi, modelli pronti e import da testo. */

import { S, save, newRoutine, newDay, newRow, deleteRoutine, getRoutine } from '../lib/store.js';
import { getEx, MUSCLES, registerCustom } from '../data/exercises.js';
import { TEMPLATES, buildFromTemplate, parseScheda } from '../data/templates.js';
import {
  esc, uid, $, $$, on, openSheet, closeSheet, confirmSheet, promptSheet, toast, fmtDurShort, plur,
} from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { go, back, render } from '../app.js';
import { pickExercise, exerciseSheet } from './exercises.js';
import { startWorkout } from './workout.js';
import { estimate } from './home.js';

const SS_COLORS = ['#8b7bff', '#4cd7f6', '#ffb020', '#f06595', '#35d07f'];

/** Colore assegnato al superset dentro un giorno di scheda. */
function ssColor(day, gid) {
  if (!gid) return null;
  const all = [...new Set(day.exercises.map((x) => x.superset).filter(Boolean))];
  return SS_COLORS[all.indexOf(gid) % SS_COLORS.length];
}

/* ------------------------------------------------------------- elenco --- */

function listView() {
  return `
    <div class="topbar">
      <div><h1>Schede</h1><div class="sub">${plur(S.routines.length, 'scheda', 'schede')} · ${plur(S.routines.reduce((a, r) => a + r.days.length, 0), 'giorno', 'giorni')}</div></div>
      <button class="icon-btn" data-act="new">${icon('plus', 22)}</button>
    </div>

    ${S.routines.length ? S.routines.map((r) => `
      <button class="card tappable" style="width:100%;text-align:left;display:block${r.id === S.activeRoutineId ? ';border-color:var(--acc)' : ''}" data-open="${r.id}">
        <div class="flex between center">
          <div class="grow">
            <div class="flex center gap8">
              <span class="t fw7" style="font-size:17px;letter-spacing:-.025em">${esc(r.name)}</span>
              ${r.id === S.activeRoutineId ? '<span class="pill acc">attiva</span>' : ''}
            </div>
            <div class="s muted fs12" style="margin-top:3px">${plur(r.days.length, 'giorno', 'giorni')} · ${plur(r.days.reduce((a, d) => a + d.exercises.length, 0), 'esercizio', 'esercizi')}</div>
          </div>
          ${icon('chevR', 20)}
        </div>
        <div class="flex wrap gap6 mt10">${r.days.slice(0, 5).map((d) => `<span class="pill">${esc(d.name)}</span>`).join('')}</div>
      </button>`).join('')
      : `<div class="empty"><div class="ico">${icon('clipboard', 28)}</div><h3>Nessuna scheda</h3>
         <p>Parti da un modello collaudato, importa la scheda che ti ha dato il tuo istruttore o creala da zero.</p></div>`}

    <div class="section-title">Aggiungi</div>
    <div class="card flush"><div class="rows">
      <button class="row" data-act="tpl"><span class="avatar acc">${icon('star', 20)}</span>
        <span class="grow"><span class="t">Modelli pronti</span><span class="s">Full Body, PPL, Upper/Lower, Split 5gg…</span></span>${icon('chevR', 18)}</button>
      <button class="row" data-act="import"><span class="avatar">${icon('upload', 20)}</span>
        <span class="grow"><span class="t">Importa da testo</span><span class="s">Incolla la tua scheda, la converto io</span></span>${icon('chevR', 18)}</button>
      <button class="row" data-act="new"><span class="avatar">${icon('plus', 20)}</span>
        <span class="grow"><span class="t">Scheda vuota</span><span class="s">Costruiscila esercizio per esercizio</span></span>${icon('chevR', 18)}</button>
    </div></div>`;
}

/* --------------------------------------------------------- dettaglio ---- */

function routineView(r) {
  return `
    <div class="topbar">
      <button class="icon-btn" data-act="back">${icon('chevL', 20)}</button>
      <div class="grow" style="text-align:center;min-width:0">
        <div class="t fw7 nowrap" style="font-size:17px;letter-spacing:-.02em">${esc(r.name)}</div>
        <div class="sub">${plur(r.days.length, 'giorno', 'giorni')}</div>
      </div>
      <button class="icon-btn" data-act="rmenu">${icon('more', 20)}</button>
    </div>

    ${r.id !== S.activeRoutineId ? `<button class="btn ghost block sm" data-act="activate" style="margin-bottom:14px">${icon('check', 16)} Rendi scheda attiva</button>` : ''}

    ${r.days.length ? r.days.map((d, i) => `
      <div class="card">
        <div class="flex between center">
          <div class="grow" style="min-width:0">
            <div class="fw7 nowrap" style="font-size:16px;letter-spacing:-.02em">${esc(d.name)}</div>
            <div class="fs12 muted" style="margin-top:2px">${plur(d.exercises.length, 'esercizio', 'esercizi')} · ${d.exercises.reduce((a, e) => a + e.sets, 0)} serie · ~${fmtDurShort(estimate(d))}</div>
          </div>
          <button class="icon-btn ghost" data-dmenu="${d.id}">${icon('more', 19)}</button>
        </div>
        ${d.exercises.length ? `<div class="rows" style="margin:8px -16px -4px">
          ${d.exercises.map((e) => {
            const col = ssColor(d, e.superset);
            return `<button class="row" data-ed="${d.id}:${e.id}"${col ? ` style="box-shadow:inset 3px 0 0 ${col}"` : ''}>
            <span class="pill" style="min-width:48px;justify-content:center">${e.sets}×${esc(String(e.reps))}</span>
            <span class="grow"><span class="t">${esc(getEx(e.exId).n)}</span>
            <span class="s">${col ? '<b style="color:' + col + '">superset</b> · ' : ''}${(getEx(e.exId).m || []).map((m) => MUSCLES[m]?.n || m).join(', ')} · rec ${e.rest}s</span></span>
            ${icon('chevR', 17)}</button>`;
          }).join('')}
        </div>` : '<p class="muted fs13 mt10">Nessun esercizio.</p>'}
        <div class="flex gap8 mt14">
          <button class="btn ghost sm grow" data-addex="${d.id}">${icon('plus', 16)} Esercizio</button>
          <button class="btn primary sm grow" data-start="${d.id}">${icon('play', 16)} Allena</button>
        </div>
      </div>`).join('')
      : `<div class="empty"><div class="ico">${icon('layers', 26)}</div><h3>Scheda vuota</h3><p>Aggiungi il primo giorno di allenamento.</p></div>`}

    <button class="btn ghost block mt20" data-act="addday">${icon('plus', 18)} Aggiungi giorno</button>`;
}

/* --------------------------------------------------- editor riga esercizio */

function rowSheet(r, d, row) {
  const ex = getEx(row.exId);
  openSheet({
    title: ex.n,
    body: `
      <div class="field"><label>Serie</label>
        <div class="stepper"><button data-s="-1">−</button><label class="val"><input type="number" inputmode="numeric" data-f="sets" value="${row.sets}"><small>serie</small></label><button data-s="1">+</button></div>
      </div>
      <div class="field"><label>Ripetizioni</label>
        <input class="input" data-f="reps" value="${esc(String(row.reps))}" placeholder="es. 8-12 oppure 10 oppure 45 s">
      </div>
      <div class="field"><label>Recupero</label>
        <div class="stepper"><button data-r="-15">−</button><label class="val"><input type="number" inputmode="numeric" data-f="rest" value="${row.rest}"><small>secondi</small></label><button data-r="15">+</button></div>
      </div>
      <div class="field"><label>Nota</label>
        <input class="input" data-f="note" value="${esc(row.note || '')}" placeholder="es. presa stretta, 2 serie di scarico…">
      </div>
      <div class="card flush"><div class="rows">
        <button class="row" data-a="info"><span class="avatar">${icon('info', 19)}</span><span class="grow"><span class="t">Tecnica ed errori comuni</span></span>${icon('chevR', 17)}</button>
        <button class="row" data-a="swap"><span class="avatar">${icon('swap', 19)}</span><span class="grow"><span class="t">Sostituisci esercizio</span></span>${icon('chevR', 17)}</button>
        <button class="row" data-a="ss"><span class="avatar">${icon('layers', 19)}</span><span class="grow"><span class="t">${row.superset ? 'Togli dal superset' : 'Superset col successivo'}</span><span class="s">${row.superset ? 'Torna a esercizio singolo' : 'Si alternano senza recupero'}</span></span></button>
        <button class="row" data-a="up"><span class="avatar">${icon('arrowUp', 19)}</span><span class="grow"><span class="t">Sposta su</span></span></button>
        <button class="row" data-a="down"><span class="avatar">${icon('arrowDown', 19)}</span><span class="grow"><span class="t">Sposta giù</span></span></button>
        <button class="row" data-a="del"><span class="avatar" style="color:var(--err)">${icon('trash', 19)}</span><span class="grow"><span class="t" style="color:var(--err)">Rimuovi dalla scheda</span></span></button>
      </div></div>`,
    foot: `<button class="btn primary block" data-save>Salva</button>`,
    onMount: (el) => {
      const num = (sel) => $(`[data-f="${sel}"]`, el);
      on(el, 'click', '[data-s]', (e, t) => { num('sets').value = Math.max(1, Math.min(12, Number(num('sets').value) + Number(t.dataset.s))); });
      on(el, 'click', '[data-r]', (e, t) => { num('rest').value = Math.max(0, Number(num('rest').value) + Number(t.dataset.r)); });
      const commit = () => {
        row.sets = Math.max(1, Number(num('sets').value) || 3);
        row.reps = num('reps').value.trim() || '8-12';
        row.rest = Math.max(0, Number(num('rest').value) || 90);
        row.note = num('note').value.trim();
        save();
      };
      $('[data-save]', el).onclick = () => { commit(); closeSheet(); render(); };
      on(el, 'click', '[data-a]', async (e, t) => {
        const a = t.dataset.a;
        const i = d.exercises.indexOf(row);
        if (a === 'info') { exerciseSheet(row.exId); return; }
        if (a === 'swap') { commit(); closeSheet(); pickExercise((nw) => { row.exId = nw.id; save(); render(); toast('Esercizio sostituito'); }, { title: 'Sostituisci' }); return; }
        if (a === 'ss') {
          if (row.superset) row.superset = null;
          else if (i < d.exercises.length - 1) {
            const gid = d.exercises[i + 1].superset || uid();
            row.superset = gid;
            d.exercises[i + 1].superset = gid;
            toast('Superset creato');
          } else toast('Serve un esercizio successivo', 'err');
        }
        if (a === 'up' && i > 0) { d.exercises.splice(i - 1, 0, d.exercises.splice(i, 1)[0]); }
        if (a === 'down' && i < d.exercises.length - 1) { d.exercises.splice(i + 1, 0, d.exercises.splice(i, 1)[0]); }
        if (a === 'del') {
          const ok = await confirmSheet('Rimuovere?', `${getEx(row.exId).n} verrà tolto da ${d.name}.`, 'Rimuovi');
          if (!ok) return;
          d.exercises.splice(i, 1);
        }
        save(); closeSheet(); render();
      });
    },
  });
}

/* ------------------------------------------------------------ modelli --- */

export function templatesSheet() {
  openSheet({
    title: 'Modelli pronti',
    body: `<div class="card flush"><div class="rows">
      ${TEMPLATES.map((t) => `<button class="row" data-t="${t.key}">
        <span class="avatar acc">${icon('star', 19)}</span>
        <span class="grow"><span class="t">${esc(t.name)}</span><span class="s">${esc(t.tag)}</span></span>
        ${icon('chevR', 18)}</button>`).join('')}
    </div></div>
    <p class="fs12 muted mt14">Potrai modificare esercizi, serie e recuperi in qualsiasi momento.</p>`,
    onMount: (el) => on(el, 'click', '[data-t]', (e, t) => {
      const tpl = TEMPLATES.find((x) => x.key === t.dataset.t);
      closeSheet();
      openSheet({
        title: tpl.name,
        body: `<p class="fs13 muted" style="margin-bottom:14px">${esc(tpl.desc)}</p>
          ${tpl.days.map((d) => `<div class="section-title" style="margin-top:14px">${esc(d.name)}</div>
            <div class="card flush"><div class="rows">${d.ex.map((e) => `<div class="row">
              <span class="pill" style="min-width:48px;justify-content:center">${e.sets}×${esc(String(e.reps))}</span>
              <span class="grow"><span class="t">${esc(getEx(e.exId).n)}</span></span></div>`).join('')}</div></div>`).join('')}`,
        foot: `<button class="btn ghost" data-sheet-close>Chiudi</button><button class="btn primary" data-use>Usa questa scheda</button>`,
        onMount: (el2) => {
          $('[data-use]', el2).onclick = () => {
            const r = buildFromTemplate(tpl);
            S.routines.push(r);
            S.activeRoutineId = r.id;
            save();
            closeSheet();
            toast('Scheda creata');
            go('routines', { id: r.id }, { replace: true });
          };
        },
      });
    }),
  });
}

/* ------------------------------------------------------------- import --- */

const EXAMPLE = `GIORNO A - PETTO E TRICIPITI
Panca piana 4x8 rec 2'
Panca inclinata manubri 3x10 90s
Croci ai cavi 3x12
Push down corda 3x15 60s

GIORNO B - DORSO E BICIPITI
Trazioni 4x6
Rematore bilanciere 4x8 rec 120s
Lat machine 3x12
Curl bilanciere 3x10`;

export function importSheet() {
  openSheet({
    title: 'Importa scheda',
    body: `
      <p class="fs13 muted" style="margin-bottom:12px">Incolla la scheda così com’è: riconosco titoli dei giorni, serie × ripetizioni e recuperi.</p>
      <div class="field"><textarea class="input" data-in style="min-height:200px;font-size:14px" placeholder="${esc(EXAMPLE)}"></textarea></div>
      <button class="btn ghost sm" data-ex>${icon('clipboard', 16)} Inserisci un esempio</button>`,
    foot: `<button class="btn ghost" data-sheet-close>Annulla</button><button class="btn primary" data-go>Analizza</button>`,
    onMount: (el) => {
      $('[data-ex]', el).onclick = () => { $('[data-in]', el).value = EXAMPLE; };
      $('[data-go]', el).onclick = () => {
        const txt = $('[data-in]', el).value;
        if (!txt.trim()) { toast('Incolla prima la scheda', 'err'); return; }
        const parsed = parseScheda(txt, S.settings.restDefault);
        if (!parsed.days.length) { toast('Non ho riconosciuto nessun esercizio', 'err'); return; }
        closeSheet();
        previewImport(parsed);
      };
    },
  });
}

function previewImport(parsed) {
  openSheet({
    title: 'Controlla e conferma',
    body: `
      <div class="flex gap8 wrap" style="margin-bottom:12px">
        <span class="pill acc">${plur(parsed.days.length, 'giorno', 'giorni')}</span>
        <span class="pill">${plur(parsed.days.reduce((a, d) => a + d.exercises.length, 0), 'esercizio', 'esercizi')}</span>
        ${parsed.unmatched ? `<span class="pill warn">${parsed.unmatched} da verificare</span>` : '<span class="pill ok">tutti riconosciuti</span>'}
      </div>
      ${parsed.unmatched ? `<div class="coach" style="margin:0 0 14px">${icon('info', 17)}<div>Gli esercizi evidenziati non sono nel catalogo: li creo come personalizzati. Potrai sostituirli con un tap.</div></div>` : ''}
      ${parsed.days.map((d) => `
        <div class="section-title" style="margin-top:12px">${esc(d.name)}</div>
        <div class="card flush"><div class="rows">
          ${d.exercises.map((e) => `<div class="row">
            <span class="pill" style="min-width:48px;justify-content:center">${e.sets}×${esc(String(e.reps))}</span>
            <span class="grow"><span class="t">${esc(e.matched ? getEx(e.exId).n : e.raw)}</span>
            <span class="s">${e.matched ? `rec ${e.rest}s` : 'esercizio personalizzato'}</span></span>
            ${e.matched ? '' : `<span class="pill warn">?</span>`}</div>`).join('')}
        </div></div>`).join('')}`,
    foot: `<button class="btn ghost" data-sheet-close>Annulla</button><button class="btn primary" data-ok>Crea scheda</button>`,
    onMount: (el) => {
      $('[data-ok]', el).onclick = () => {
        if (parsed.customs.length) {
          S.customEx = [...(S.customEx || []), ...parsed.customs];
          registerCustom(S.customEx);
        }
        const r = {
          id: uid(), name: parsed.name, note: 'Importata', created: new Date().toISOString(),
          days: parsed.days.map((d) => ({
            id: uid(), name: d.name,
            exercises: d.exercises.map((e) => ({ id: uid(), exId: e.exId, sets: e.sets, reps: e.reps, rest: e.rest, note: '', superset: null })),
          })),
        };
        S.routines.push(r);
        S.activeRoutineId = r.id;
        save();
        closeSheet();
        toast('Scheda importata');
        go('routines', { id: r.id }, { replace: true });
      };
    },
  });
}

/* ---------------------------------------------------------------- vista -- */

export default {
  render(params = {}) {
    const r = params.id ? getRoutine(params.id) : null;
    return r ? routineView(r) : listView();
  },

  mount(root, params = {}) {
    const r = params.id ? getRoutine(params.id) : null;

    on(root, 'click', '[data-act="tpl"]', () => templatesSheet());
    on(root, 'click', '[data-act="import"]', () => importSheet());
    on(root, 'click', '[data-act="new"]', async () => {
      const name = await promptSheet('Nuova scheda', { placeholder: 'es. Massa autunno', label: 'Nome', ok: 'Crea' });
      if (!name) return;
      const nr = newRoutine(name);
      newDay(nr, 'Giorno 1');
      go('routines', { id: nr.id });
    });
    on(root, 'click', '[data-open]', (e, t) => go('routines', { id: t.dataset.open }));

    if (!r) return;

    on(root, 'click', '[data-act="activate"]', () => { S.activeRoutineId = r.id; save(); toast('Scheda attiva'); render(); });
    on(root, 'click', '[data-act="addday"]', async () => {
      const name = await promptSheet('Nuovo giorno', { value: `Giorno ${r.days.length + 1}`, label: 'Nome', ok: 'Aggiungi' });
      if (!name) return;
      newDay(r, name);
      render();
    });
    on(root, 'click', '[data-addex]', (e, t) => {
      const d = r.days.find((x) => x.id === t.dataset.addex);
      pickExercise((list) => {
        for (const nw of (Array.isArray(list) ? list : [list])) {
          d.exercises.push(newRow(nw.id, { sets: 3, reps: nw.rr, rest: nw.rest }));
        }
        save(); render();
      }, { multi: true, title: 'Aggiungi esercizi' });
    });
    on(root, 'click', '[data-start]', (e, t) => {
      const d = r.days.find((x) => x.id === t.dataset.start);
      if (d?.exercises.length) startWorkout(r, d);
      else toast('Aggiungi prima qualche esercizio', 'err');
    });
    on(root, 'click', '[data-ed]', (e, t) => {
      const [dayId, rowId] = t.dataset.ed.split(':');
      const d = r.days.find((x) => x.id === dayId);
      const row = d?.exercises.find((x) => x.id === rowId);
      if (row) rowSheet(r, d, row);
    });
    on(root, 'click', '[data-dmenu]', (e, t) => {
      const d = r.days.find((x) => x.id === t.dataset.dmenu);
      openSheet({
        title: d.name,
        body: `<div class="card flush"><div class="rows">
          <button class="row" data-a="rename"><span class="avatar">${icon('edit', 19)}</span><span class="grow"><span class="t">Rinomina giorno</span></span></button>
          <button class="row" data-a="dup"><span class="avatar">${icon('copy', 19)}</span><span class="grow"><span class="t">Duplica giorno</span></span></button>
          <button class="row" data-a="up"><span class="avatar">${icon('arrowUp', 19)}</span><span class="grow"><span class="t">Sposta su</span></span></button>
          <button class="row" data-a="down"><span class="avatar">${icon('arrowDown', 19)}</span><span class="grow"><span class="t">Sposta giù</span></span></button>
          <button class="row" data-a="del"><span class="avatar" style="color:var(--err)">${icon('trash', 19)}</span><span class="grow"><span class="t" style="color:var(--err)">Elimina giorno</span></span></button>
        </div></div>`,
        onMount: (el) => on(el, 'click', '[data-a]', async (ev, b) => {
          const a = b.dataset.a, i = r.days.indexOf(d);
          if (a === 'rename') {
            const v = await promptSheet('Rinomina', { value: d.name });
            if (v) d.name = v;
          }
          if (a === 'dup') r.days.splice(i + 1, 0, { ...structuredClone(d), id: uid(), name: d.name + ' (copia)' });
          if (a === 'up' && i > 0) r.days.splice(i - 1, 0, r.days.splice(i, 1)[0]);
          if (a === 'down' && i < r.days.length - 1) r.days.splice(i + 1, 0, r.days.splice(i, 1)[0]);
          if (a === 'del') {
            const ok = await confirmSheet('Eliminare il giorno?', `"${d.name}" e i suoi esercizi verranno rimossi dalla scheda.`, 'Elimina');
            if (!ok) return;
            r.days.splice(i, 1);
          }
          save(); closeSheet(); render();
        }),
      });
    });
    on(root, 'click', '[data-act="rmenu"]', () => {
      openSheet({
        title: r.name,
        body: `<div class="card flush"><div class="rows">
          <button class="row" data-a="rename"><span class="avatar">${icon('edit', 19)}</span><span class="grow"><span class="t">Rinomina scheda</span></span></button>
          <button class="row" data-a="active"><span class="avatar">${icon('check', 19)}</span><span class="grow"><span class="t">Rendi attiva</span></span></button>
          <button class="row" data-a="dup"><span class="avatar">${icon('copy', 19)}</span><span class="grow"><span class="t">Duplica scheda</span></span></button>
          <button class="row" data-a="del"><span class="avatar" style="color:var(--err)">${icon('trash', 19)}</span><span class="grow"><span class="t" style="color:var(--err)">Elimina scheda</span></span></button>
        </div></div>`,
        onMount: (el) => on(el, 'click', '[data-a]', async (ev, b) => {
          const a = b.dataset.a;
          if (a === 'rename') { const v = await promptSheet('Rinomina scheda', { value: r.name }); if (v) r.name = v; }
          if (a === 'active') { S.activeRoutineId = r.id; toast('Scheda attiva'); }
          if (a === 'dup') {
            const c = structuredClone(r);
            c.id = uid(); c.name = r.name + ' (copia)';
            c.days.forEach((d) => { d.id = uid(); d.exercises.forEach((x) => { x.id = uid(); }); });
            S.routines.push(c);
            save(); closeSheet(); go('routines', { id: c.id }, { replace: true }); return;
          }
          if (a === 'del') {
            const ok = await confirmSheet('Eliminare la scheda?', `"${r.name}" verrà rimossa. Lo storico degli allenamenti resta.`, 'Elimina');
            if (!ok) return;
            deleteRoutine(r.id);
            closeSheet(); back(); return;
          }
          save(); closeSheet(); render();
        }),
      });
    });
  },
};
