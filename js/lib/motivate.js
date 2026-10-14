/* =========================================================================
   Spinte motivazionali.

   Regola unica: niente frasi generiche. Ogni riga nasce da un numero vero
   dello storico — un record a portata, una ripetizione da battere, una seduta
   da superare — e se quel numero non c'è non esce niente. Un incoraggiamento
   a vuoto si legge una volta e poi diventa carta da parati.
   ========================================================================= */

import { S, prOf, lastPerf, isWork, sessionVolume, e1rm } from './store.js';

const kg = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
const n0 = (n) => String(Math.round(n));

/** Volume di lavoro già accumulato nell'allenamento in corso. */
function volumeCorrente(w) {
  let v = 0;
  for (const e of w.exercises) {
    for (const s of e.sets) {
      if (s.done && isWork(s)) v += (Number(s.weight) || 0) * (Number(s.reps) || 0);
    }
  }
  return v;
}

/* Ogni generatore torna { txt, forte } oppure null. `forte` vuol dire che è un
   record a portata di mano: quello si mostra sempre, gli altri ogni tanto. */

function recordCarico(w, e, set) {
  const pr = prOf(e.exId);
  const peso = Number(set?.weight) || 0;
  if (!pr || !pr.weight || !peso) return null;
  if (peso > pr.weight) {
    return { txt: `${kg(peso)} kg è più del tuo record di carico su questo esercizio. Chiudila e il record è nuovo.`, forte: true };
  }
  if (peso === pr.weight) {
    return { txt: `Sei sul tuo record di carico. L'hai tenuto per ${n0(pr.weightReps || 1)} ripetizioni: oggi puoi allargarlo.`, forte: true };
  }
  const manca = pr.weight - peso;
  if (manca <= pr.weight * 0.06) {
    return { txt: `Ti mancano ${kg(manca)} kg dal tuo record di carico. Più vicino di così si fa solo provandoci.`, forte: false };
  }
  return null;
}

function battiRipetizioni(w, e, set) {
  const last = lastPerf(e.exId);
  const peso = Number(set?.weight) || 0;
  if (!last || !peso) return null;
  const pari = last.sets.filter((s) => Number(s.weight) === peso && Number(s.reps) > 0);
  if (!pari.length) return null;
  const best = Math.max(...pari.map((s) => Number(s.reps)));
  if (!best) return null;
  return { txt: `Con ${kg(peso)} kg l'ultima volta sei arrivato a ${n0(best)} ripetizioni. Una in più e l'hai battuto.`, forte: false };
}

function massimaleStimato(w, e, set) {
  const pr = prOf(e.exId);
  const peso = Number(set?.weight) || 0, rip = Number(set?.reps) || 0;
  if (!pr || !pr.e1rm || !peso || !rip) return null;
  const stima = e1rm(peso, rip);
  if (stima <= pr.e1rm) return null;
  return { txt: `${kg(peso)} × ${n0(rip)} porterebbe il tuo massimale stimato a ${kg(stima)} kg, sopra il record di ${kg(pr.e1rm)}.`, forte: true };
}

function sedutaMigliore(w) {
  const simili = S.sessions.filter((s) => s.name === w.name);
  if (simili.length < 2) return null;
  const meglio = Math.max(...simili.map(sessionVolume));
  const ora = volumeCorrente(w);
  if (!meglio || !ora) return null;
  const manca = meglio - ora;
  if (manca <= 0) {
    return { txt: `Hai già superato il volume del tuo miglior ${w.name}. Tutto quello che aggiungi da qui è terreno nuovo.`, forte: false };
  }
  if (manca < meglio * 0.3) {
    return { txt: `Ti mancano ${n0(manca)} kg di volume per superare il tuo miglior ${w.name}.`, forte: false };
  }
  return null;
}

function ultimaSerie(w) {
  const restano = w.exercises.reduce((a, e) => a + e.sets.filter((s) => !s.done && isWork(s)).length, 0);
  if (restano !== 1) return null;
  return { txt: 'Ultima serie di lavoro. È quella che decide se l’allenamento è stato buono o ottimo.', forte: false };
}

function settimanaViva(w) {
  const obiettivo = S.settings.weeklyGoal || 4;
  const ora = new Date();
  const lun = new Date(ora); lun.setHours(0, 0, 0, 0);
  lun.setDate(lun.getDate() - ((lun.getDay() + 6) % 7));
  const fatti = S.sessions.filter((s) => new Date(s.date) >= lun).length;
  if (fatti + 1 !== obiettivo) return null;
  return { txt: `Con questo chiudi la settimana a ${n0(obiettivo)} allenamenti su ${n0(obiettivo)}. Vale la pena finirlo bene.`, forte: false };
}

const GENERATORI = [recordCarico, massimaleStimato, battiRipetizioni, sedutaMigliore, ultimaSerie, settimanaViva];

/* Ogni frase si dice una volta sola per allenamento: ripetuta a ogni pausa
   tornerebbe a essere carta da parati, che è esattamente ciò che si vuole
   evitare. */
const dette = new Set();
let contatore = 0;

/**
 * Una spinta per il momento di recupero, o null se non c'è niente di vero da
 * dire. I record a portata escono sempre; il resto una volta ogni tre pause,
 * perché una spinta continua smette di spingere.
 */
export function challenge(w, e, set) {
  if (!w || !e) return null;
  contatore++;
  const trovate = [];
  for (const g of GENERATORI) {
    let r = null;
    try { r = g(w, e, set); } catch { r = null; }
    if (r && !dette.has(r.txt)) trovate.push(r);
  }
  if (!trovate.length) return null;

  const forti = trovate.filter((x) => x.forte);
  const scelta = forti.length
    ? forti[Math.floor(Math.random() * forti.length)]
    : (contatore % 3 === 1 ? trovate[Math.floor(Math.random() * trovate.length)] : null);
  if (!scelta) return null;
  dette.add(scelta.txt);
  return scelta;
}

/** Azzera la cadenza all'inizio di ogni allenamento. */
export function resetChallenges() { dette.clear(); contatore = 0; }
