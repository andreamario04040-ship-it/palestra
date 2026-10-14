/* Impostazioni: profilo, allenamento, attrezzatura, aspetto, backup dei dati. */

import { S, save, exportJSON, importJSON, resetAll } from '../lib/store.js';
import { esc, $, $$, on, openSheet, closeSheet, confirmSheet, promptSheet, toast, fmtWeight, fmtDate } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { applyTheme, render, go, checkForUpdate, viewportInfo } from '../app.js';

const VERSION = '1.7.0';

function toggleRow(key, title, sub, group = 'settings') {
  const v = group === 'settings' ? S.settings[key] : S[group][key];
  return `<div class="row" data-tg="${group}:${key}">
    <span class="grow"><span class="t">${esc(title)}</span>${sub ? `<span class="s">${esc(sub)}</span>` : ''}</span>
    <span class="switch ${v ? 'on' : ''}"></span>
  </div>`;
}

/** Stato del viewport in una riga: dice se la barra in basso è a posto. */
function schermoDesc() {
  const v = viewportInfo;
  if (!v.pwa) return `${v.view} di ${v.screen} punti · nel browser`;
  if (v.fixed) return `${v.view} di ${v.screen} punti · corretto`;
  if (v.gap) return `${v.view} di ${v.screen} punti · ne mancano ${v.gap}`;
  return `${v.view} di ${v.screen} punti · tutto pieno`;
}

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

async function doExport() {
  const json = exportJSON();
  const file = new File([json], `palestra-backup-${stamp()}.json`, { type: 'application/json' });
  const segna = () => { S.meta.lastBackup = new Date().toISOString(); save(); };
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Backup Palestra' }); segna(); render(); return; } catch { /* annullato */ }
  }
  segna();
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Backup scaricato');
}

function doImport() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json,.json';
  inp.onchange = async () => {
    const f = inp.files?.[0];
    if (!f) return;
    const text = await f.text();
    const ok = await confirmSheet(
      'Come importare?',
      'Scegli "Unisci" per aggiungere allenamenti e schede mancanti senza toccare i tuoi dati attuali. "Sostituisci" cancella tutto e carica il backup.',
      'Sostituisci tutto',
    );
    try {
      importJSON(text, { merge: !ok });
      toast(ok ? 'Dati sostituiti' : 'Dati uniti');
      const { registerCustom } = await import('../data/exercises.js');
      registerCustom(S.customEx || []);
      render();
    } catch (e) {
      toast('File non valido', 'err');
    }
  };
  inp.click();
}

function storageInfo() {
  try {
    const bytes = new Blob([localStorage.getItem('palestra.state.v1') || '']).size;
    return bytes > 1024 * 1024 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  } catch { return '—'; }
}

export default {
  render() {
    const st = S.settings;
    return `
      <div class="topbar">
        <button class="icon-btn" data-act="back">${icon('chevL', 20)}</button>
        <div class="grow" style="text-align:center"><div class="fw7" style="font-size:17px">Impostazioni</div></div>
        <div style="width:40px"></div>
      </div>

      <div class="section-title">Profilo</div>
      <div class="card flush"><div class="rows">
        <button class="row" data-a="name"><span class="avatar">${icon('user', 19)}</span>
          <span class="grow"><span class="t">Nome</span><span class="s">${esc(S.profile.name || 'Non impostato')}</span></span>${icon('chevR', 17)}</button>
        <button class="row" data-a="weight"><span class="avatar">${icon('scale', 19)}</span>
          <span class="grow"><span class="t">Peso corporeo</span><span class="s">${S.profile.bodyWeight ? fmtWeight(S.profile.bodyWeight) + ' kg' : 'Non impostato'}</span></span>${icon('chevR', 17)}</button>
      </div></div>

      <div class="section-title">Allenamento</div>
      <div class="card flush"><div class="rows">
        <button class="row" data-a="rest"><span class="avatar">${icon('timer', 19)}</span>
          <span class="grow"><span class="t">Recupero predefinito</span><span class="s">Usato quando l’esercizio non ne ha uno</span></span>
          <span class="pill acc">${st.restDefault}s</span></button>
        ${toggleRow('autoRest', 'Timer automatico', 'Parte da solo dopo ogni serie')}
        ${toggleRow('autoAdvance', 'Avanzamento automatico', 'Passa al prossimo esercizio quando finisci')}
        ${toggleRow('suggest', 'Suggerimenti di carico', 'Propone peso e ripetizioni in base allo storico')}
        ${toggleRow('warmup', 'Riscaldamento guidato', 'Propone le serie di avvicinamento')}
        ${toggleRow('rpe', 'RPE', 'Registra lo sforzo percepito a ogni serie')}
        <button class="row" data-a="goal"><span class="avatar">${icon('target', 19)}</span>
          <span class="grow"><span class="t">Obiettivo settimanale</span><span class="s">Allenamenti a settimana</span></span>
          <span class="pill acc">${st.weeklyGoal}</span></button>
      </div></div>

      <div class="section-title">Feedback</div>
      <div class="card flush"><div class="rows">
        ${toggleRow('sound', 'Suono', 'Bip di conto alla rovescia e fine recupero')}
        ${toggleRow('vibrate', 'Vibrazione', 'Non supportata da Safari su iPhone')}
        ${toggleRow('wakeLock', 'Schermo sempre acceso', 'Durante l’allenamento')}
      </div></div>

      <div class="section-title">Attrezzatura</div>
      <div class="card flush"><div class="rows">
        <button class="row" data-a="bar"><span class="avatar">${icon('dumbbell', 19)}</span>
          <span class="grow"><span class="t">Peso del bilanciere</span><span class="s">Per il calcolo dei dischi</span></span>
          <span class="pill acc">${fmtWeight(st.barWeight)} kg</span></button>
        <button class="row" data-a="plates"><span class="avatar">${icon('layers', 19)}</span>
          <span class="grow"><span class="t">Dischi disponibili</span><span class="s">${st.plates.map(fmtWeight).join(' · ')} kg</span></span>${icon('chevR', 17)}</button>
      </div></div>

      <div class="section-title">Aspetto</div>
      <div class="card">
        <div class="seg">
          ${[['dark', 'Scuro'], ['light', 'Chiaro'], ['auto', 'Sistema']].map(([k, l]) =>
            `<button data-theme="${k}" class="${st.theme === k ? 'on' : ''}">${l}</button>`).join('')}
        </div>
      </div>

      <div class="section-title">I tuoi dati</div>
      <div class="card flush"><div class="rows">
        <button class="row" data-a="export"><span class="avatar acc">${icon('download', 19)}</span>
          <span class="grow"><span class="t">Esporta backup</span><span class="s">${S.meta.lastBackup ? 'Ultimo: ' + fmtDate(S.meta.lastBackup) : 'Mai eseguito'}</span></span>${icon('chevR', 17)}</button>
        <button class="row" data-a="import"><span class="avatar">${icon('upload', 19)}</span>
          <span class="grow"><span class="t">Importa backup</span><span class="s">Da un file .json</span></span>${icon('chevR', 17)}</button>
        <div class="row"><span class="avatar">${icon('folder', 19)}</span>
          <span class="grow"><span class="t">Spazio occupato</span><span class="s">${S.sessions.length} allenamenti · ${S.routines.length} schede</span></span>
          <span class="pill">${storageInfo()}</span></div>
        <button class="row" data-a="reset"><span class="avatar" style="color:var(--err)">${icon('trash', 19)}</span>
          <span class="grow"><span class="t" style="color:var(--err)">Cancella tutto</span><span class="s">Azzera schede, storico e misure</span></span></button>
      </div></div>

      <div class="coach" style="margin:14px 0 0">${icon('info', 17)}
        <div>Tutti i dati restano <b>solo su questo dispositivo</b>: nessun account, nessun server. Esporta ogni tanto un backup per non perderli se cambi telefono o svuoti i dati di Safari.</div>
      </div>

      <div class="section-title">App</div>
      <div class="card flush"><div class="rows">
        <button class="row" data-a="install"><span class="avatar">${icon('share', 19)}</span>
          <span class="grow"><span class="t">Installa su iPhone</span><span class="s">Aggiungi alla schermata Home</span></span>${icon('chevR', 17)}</button>
        <button class="row" data-a="exlib"><span class="avatar">${icon('book', 19)}</span>
          <span class="grow"><span class="t">Libreria esercizi</span></span>${icon('chevR', 17)}</button>
        <button class="row" data-a="update"><span class="avatar">${icon('refresh', 19)}</span>
          <span class="grow"><span class="t">Aggiorna l’app</span><span class="s">Scarica l’ultima versione e ricarica</span></span>
          <span class="pill">${VERSION}</span></button>
        <div class="row"><span class="avatar">${icon('phone', 19)}</span>
          <span class="grow"><span class="t">Schermo</span><span class="s">${schermoDesc()}</span></span></div>
      </div></div>
      <div style="height:16px"></div>`;
  },

  mount(root) {
    on(root, 'click', '[data-tg]', (e, t) => {
      const [g, k] = t.dataset.tg.split(':');
      const obj = g === 'settings' ? S.settings : S[g];
      obj[k] = !obj[k];
      t.querySelector('.switch').classList.toggle('on', obj[k]);
      save();
    });
    on(root, 'click', '[data-theme]', (e, t) => {
      S.settings.theme = t.dataset.theme;
      save(); applyTheme(); render();
    });
    on(root, 'click', '[data-a]', async (e, t) => {
      switch (t.dataset.a) {
        case 'name': {
          const v = await promptSheet('Il tuo nome', { value: S.profile.name });
          if (v !== null) { S.profile.name = v; save(); render(); }
          break;
        }
        case 'weight': {
          const v = await promptSheet('Peso corporeo', { value: S.profile.bodyWeight ?? '', label: 'kg' });
          if (v !== null && v !== '') { S.profile.bodyWeight = Number(v.replace(',', '.')); save(); render(); }
          break;
        }
        case 'rest': {
          const v = await promptSheet('Recupero predefinito', { value: S.settings.restDefault, label: 'secondi' });
          if (v) { S.settings.restDefault = Math.max(0, Math.min(600, Number(v))); save(); render(); }
          break;
        }
        case 'bar': {
          const v = await promptSheet('Peso del bilanciere', { value: S.settings.barWeight, label: 'kg' });
          if (v) { S.settings.barWeight = Number(v.replace(',', '.')) || 20; save(); render(); }
          break;
        }
        case 'plates': {
          const v = await promptSheet('Dischi disponibili', {
            value: S.settings.plates.join(', '),
            label: 'Pesi separati da virgola (per lato)',
          });
          if (v) {
            const arr = v.split(/[,;\s]+/).map((x) => Number(x.replace(',', '.'))).filter((x) => x > 0);
            if (arr.length) { S.settings.plates = arr.sort((a, b) => b - a); save(); render(); }
          }
          break;
        }
        case 'goal': {
          const v = await promptSheet('Obiettivo settimanale', { value: S.settings.weeklyGoal, label: 'allenamenti a settimana' });
          if (v) { S.settings.weeklyGoal = Math.max(1, Math.min(14, Number(v) || 4)); save(); render(); }
          break;
        }
        case 'update': {
          toast('Controllo aggiornamenti…');
          const r = await checkForUpdate({ force: true });
          if (r === 'nd') toast('Aggiornamento non disponibile su questo browser', 'err');
          break;
        }
        case 'export': doExport(); break;
        case 'import': doImport(); break;
        case 'exlib': go('exercises'); break;
        case 'install': installSheet(); break;
        case 'reset': {
          const ok = await confirmSheet('Cancellare tutto?', 'Schede, allenamenti, record e misure verranno eliminati definitivamente da questo dispositivo. Esporta prima un backup se vuoi conservarli.', 'Cancella tutto');
          if (!ok) return;
          resetAll();
          toast('Dati azzerati');
          go('home', {}, { reset: true });
          break;
        }
      }
    });
  },
};

export function installSheet() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  openSheet({
    title: 'Installa sull’iPhone',
    body: standalone
      ? `<div class="coach" style="margin:0">${icon('checkCircle', 17)}<div>L’app è già installata sulla schermata Home. Funziona anche senza connessione.</div></div>
        <div class="section-title" style="margin-top:18px">Reinstallare</div>
        <p class="fs13 muted" style="margin:0 0 12px">iOS legge l’aspetto della status bar quando aggiungi l’app alla Home, non a ogni avvio: per cambiarlo serve rifare l’installazione. Rimuovendo l’app iOS può cancellare i dati del sito, quindi il backup non è facoltativo.</p>
        <ol class="cues" style="padding-left:0">
          <li><span class="n">1</span><span><b>Esporta il backup</b> e salvalo in File o su iCloud Drive.</span></li>
          <li><span class="n">2</span><span>Tieni premuta l’icona sulla Home e scegli <b>Rimuovi app</b>.</span></li>
          <li><span class="n">3</span><span>Apri il sito in <b>Safari</b>, Condividi ${icon('share', 15)} → <b>Aggiungi a Home</b>.</span></li>
          <li><span class="n">4</span><span>Apri l’app, <b>Importa backup</b> e scegli <b>Sostituisci tutto</b>.</span></li>
        </ol>
        <div class="coach" style="margin-top:14px">${icon('bulb', 17)}
          <div>Alla riapertura, qui sotto “Schermo” deve dire <b>tutto pieno</b>.</div></div>`
      : `<ol class="cues" style="padding-left:0">
          <li><span class="n">1</span><span>Apri questa pagina in <b>Safari</b> (non in un’altra app).</span></li>
          <li><span class="n">2</span><span>Tocca il pulsante <b>Condividi</b> ${icon('share', 15)} in basso.</span></li>
          <li><span class="n">3</span><span>Scorri e scegli <b>Aggiungi a Home</b>.</span></li>
          <li><span class="n">4</span><span>Conferma: trovi l’icona accanto alle altre app.</span></li>
        </ol>
        <div class="coach" style="margin-top:14px">${icon('bulb', 17)}
          <div>Aperta dalla Home va a schermo intero, funziona offline e i dati restano salvati anche se chiudi Safari.</div></div>`,
  });
}
