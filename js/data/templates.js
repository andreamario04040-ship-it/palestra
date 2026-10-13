/* Schede pronte all'uso + parser per importare una scheda scritta a mano. */

import { uid } from '../lib/dom.js';
import { matchEx, makeCustom, norm } from './exercises.js';

const row = (exId, sets, reps, rest, note = '', superset = null) => ({ id: uid(), exId, sets, reps, rest, note, superset });

export const TEMPLATES = [
  {
    key: 'andrea',
    name: 'Scheda di Andrea',
    tag: 'Min-Max Phase 2 · 4 giorni',
    desc: 'Poche serie ma portate a cedimento. Upper, Lower, 1-2 giorni di riposo, Push, Pull, 1-2 giorni di riposo. '
      + 'Il RIR indicato nelle note dice quante ripetizioni lasciare in canna: RIR 0 vuol dire fino a cedimento. '
      + 'Quando riesci a fare tutte le serie al limite alto del range, la volta dopo aumenta il carico. '
      + 'Struttura adattata dal Min-Max Phase 2 di Jeff Nippard.',
    days: [
      { name: 'Upper', ex: [
        row('chest-press', 2, '4-6', 150, 'Risc. 2-3 serie · RIR 0 · 1 secondo di fermo in basso mantenendo la tensione sui pettorali.'),
        row('chest-press', 1, '20', 150, 'Serie da 20 con carico ridotto, subito dopo le due pesanti · RIR 0.'),
        row('pullover-macchina', 1, '8-10', 90, 'Risc. 1-2 · RIR 0 · ripetizioni fluide, allungamento profondo dei dorsali nel punto alto.'),
        row('pullover-macchina', 1, '20', 90, 'Serie da 20 con carico ridotto · RIR 0.'),
        row('pectoral-machine', 2, '10-12', 90, 'Risc. 0-1 · RIR 0 · 1 secondo di fermo in basso. Dalla settimana 8 aggiungi myo-reps sull’ultima serie.'),
        row('rematore-tbar', 2, '6-8', 150, 'Risc. 1-2 · RIR 0 · gomiti aperti a circa 45°, stringi forte le scapole in alto. Dalla settimana 8 aggiungi myo-reps sull’ultima serie.'),
        row('y-raise', 3, '10-12', 90, 'Risc. 0-1 · RIR 0 · panca a 30° con la schiena appoggiata, porta i manubri in alto e in fuori a formare una Y.'),
        row('curl-ez', 2, '4-6', 45, 'Risc. 1 · RIR 0 · un po’ di slancio per salire, ma controlla la discesa. Si alterna con lo skull crusher.', 'ss-upper'),
        row('french-press', 2, '6-8', 45, 'Risc. 1 · RIR 0 · allungamento profondo sui tricipiti in tutta la discesa, 1 secondo di fermo in basso.', 'ss-upper')] },
      { name: 'Lower', ex: [
        row('leg-curl-seduto', 3, '6-8', 90, 'Risc. 1-2 · RIR 0 · inclina il busto in avanti sulla macchina per allungare al massimo i femorali.'),
        row('hack-squat', 2, '4-6', 180, 'Risc. 2-3 · RIR 1 sulla prima, 2 sulla seconda · negativa controllata, poi esplodi in salita.'),
        row('leg-extension', 2, '6-8', 90, 'Risc. 0-1 · RIR 0 · schienale il più indietro possibile, afferra forte le maniglie per tenere il bacino giù.'),
        row('leg-extension', 1, '20', 90, 'Serie da 20 con carico ridotto · RIR 0.'),
        row('affondi-camminata', 1, '10 per gamba', 90, 'Risc. 0-1 · RIR 0 · passi medi, riduci al minimo la spinta della gamba dietro.'),
        row('calf-raise-piedi', 3, '10-12', 90, 'Risc. 0-1 · RIR 0 · 1-2 secondi di fermo in basso, rulla la caviglia sull’avampiede invece di spingere solo in punta.'),
        row('kickback-glutei', 1, '30', 90, 'Risc. 0-1 · RIR 0 · 30 ripetizioni. Se preferisci lavorare lombari e femorali, sostituisci con l’hyperextension.')] },
      { name: 'Push', ex: [
        row('shoulder-press-macchina', 2, '4-6', 150, 'Risc. 2-3 · RIR 0 poi 1 · i gomiti devono scendere almeno a 90°, ripetizioni fluide.'),
        row('panca-manubri', 1, '10', 150, 'Risc. 2-3 · RIR 0 · 1 secondo di fermo in basso mantenendo la tensione sui pettorali.'),
        row('panca-manubri', 1, '20', 150, 'Serie da 20 con carico ridotto · RIR 0.'),
        row('leg-extension', 1, '20', 90, 'Risc. 0-1 · RIR 0 · una gamba alla volta, schienale indietro e maniglie strette forte.'),
        row('alzate-laterali-macchina', 1, '10', 90, 'Risc. 0-1 · RIR 0 · resisti alla negativa e non fermarti in basso.'),
        row('alzate-laterali-macchina', 1, '20', 90, 'Serie da 20 con carico ridotto · RIR 0.'),
        row('croci-cavi', 2, '10-12', 90, 'Risc. 0-1 · RIR 0 · cerca un allungamento profondo dei pettorali in basso.'),
        row('pushdown-barra', 2, '4-6', 90, 'Risc. 0-1 · RIR 0 · corda o barra, quella che ti è più comoda.')] },
      { name: 'Pull', ex: [
        row('trazioni', 3, '4-6', 150, 'Risc. 1-2 · RIR 0, poi 1 e 1 · presa larga · negativa lenta di 2-3 secondi.'),
        row('stacco-rumeno', 2, '6-8', 150, 'Risc. 2-3 · RIR 1 sulla prima, 2 sulla seconda · schiena piatta e ginocchia appena flesse.'),
        row('lat-machine-presa-stretta', 1, '10', 150, 'Risc. 1-2 · RIR 0 · inclinati indietro di circa 15° e porta i gomiti in basso stringendo le scapole.'),
        row('lat-machine-presa-stretta', 1, '20', 150, 'Serie da 20 con carico ridotto · RIR 0.'),
        row('rematore-macchina', 2, '4-6', 150, 'Risc. 1-2 · RIR 0 · gomiti aperti a 45°, stringi forte le scapole in alto.'),
        row('reverse-pec-deck', 1, '20', 90, 'Risc. 0-1 · RIR 0 · un braccio alla volta, disegna il semicerchio più ampio possibile.'),
        row('reverse-pec-deck', 1, '10', 90, 'RIR 0 · un braccio alla volta, carico più alto della serie da 20.'),
        row('curl-martello', 2, '6-8', 90, 'Risc. 0-1 · RIR 0 · alla panca Scott con presa a martello, ripetizioni fluide.'),
        row('crunch-cavi', 2, '6-8', 90, 'Risc. 0-1 · RIR 0 · arrotonda la zona lombare mentre ti chiudi.')] },
    ],
  },
  {
    key: 'fullbody3',
    name: 'Full Body 3x',
    tag: 'Principiante · 3 giorni',
    desc: 'Tutto il corpo in ogni seduta: la scelta migliore per i primi 6-12 mesi. Lun / Mer / Ven.',
    days: [
      { name: 'Full Body A', ex: [
        row('squat', 3, '6-8', 150), row('panca-piana', 3, '6-8', 150), row('rematore-bilanciere', 3, '8-10', 120),
        row('shoulder-press-manubri', 3, '10-12', 90), row('leg-curl-sdraiato', 3, '10-12', 75), row('plank', 3, '40 s', 60)] },
      { name: 'Full Body B', ex: [
        row('stacco-rumeno', 3, '8-10', 150), row('lat-machine', 3, '8-12', 100), row('panca-inclinata-manubri', 3, '8-12', 110),
        row('affondi', 3, '10-12', 90), row('alzate-laterali', 3, '12-15', 60), row('crunch', 3, '15-20', 45)] },
      { name: 'Full Body C', ex: [
        row('leg-press', 3, '10-12', 120), row('trazioni', 3, '6-10', 150), row('chest-press', 3, '10-12', 90),
        row('curl-manubri', 3, '10-12', 70), row('pushdown-corda', 3, '12-15', 70), row('calf-raise-piedi', 3, '15-20', 60)] },
    ],
  },
  {
    key: 'ppl',
    name: 'Push / Pull / Legs',
    tag: 'Intermedio · 3-6 giorni',
    desc: 'Spinta, trazione e gambe. Il classico per chi si allena 3 o 6 volte a settimana.',
    days: [
      { name: 'Push', ex: [
        row('panca-piana', 4, '6-8', 150), row('shoulder-press-manubri', 3, '8-10', 120), row('panca-inclinata-manubri', 3, '10-12', 110),
        row('alzate-laterali', 4, '12-20', 60), row('pushdown-corda', 3, '12-15', 70), row('estensioni-sopra-testa', 3, '10-12', 70)] },
      { name: 'Pull', ex: [
        row('trazioni', 4, '6-10', 150), row('rematore-bilanciere', 4, '8-10', 120), row('pulley', 3, '10-12', 90),
        row('face-pull', 3, '15-20', 60), row('curl-bilanciere', 3, '8-12', 80), row('curl-martello', 3, '10-12', 70)] },
      { name: 'Legs', ex: [
        row('squat', 4, '5-8', 180), row('stacco-rumeno', 3, '8-10', 150), row('leg-press', 3, '10-12', 120),
        row('leg-curl-sdraiato', 3, '10-12', 75), row('calf-raise-piedi', 4, '12-20', 60), row('leg-raise', 3, '12-15', 60)] },
    ],
  },
  {
    key: 'upperlower',
    name: 'Upper / Lower',
    tag: 'Intermedio · 4 giorni',
    desc: 'Due sedute per la parte alta e due per la parte bassa. Ottimo compromesso volume/recupero.',
    days: [
      { name: 'Upper A (forza)', ex: [
        row('panca-piana', 4, '5-6', 180), row('rematore-bilanciere', 4, '6-8', 150), row('military-press', 3, '6-8', 150),
        row('lat-machine', 3, '8-12', 90), row('curl-bilanciere', 3, '8-10', 75), row('french-press', 3, '8-12', 75)] },
      { name: 'Lower A (forza)', ex: [
        row('squat', 4, '5-6', 210), row('stacco-rumeno', 3, '6-8', 150), row('leg-press', 3, '10-12', 120),
        row('leg-curl-seduto', 3, '10-12', 75), row('calf-raise-piedi', 4, '12-15', 60)] },
      { name: 'Upper B (ipertrofia)', ex: [
        row('panca-inclinata-manubri', 4, '8-12', 110), row('pulley', 4, '10-12', 100), row('trazioni', 3, '6-10', 120),
        row('alzate-laterali', 4, '12-20', 60), row('curl-panca-inclinata', 3, '10-12', 70), row('pushdown-corda', 3, '12-15', 60)] },
      { name: 'Lower B (ipertrofia)', ex: [
        row('hip-thrust', 4, '8-12', 120), row('affondi', 3, '10-12', 100), row('leg-extension', 3, '12-15', 75),
        row('leg-curl-sdraiato', 3, '12-15', 75), row('calf-raise-seduto', 4, '15-20', 60), row('crunch-cavi', 3, '12-15', 60)] },
    ],
  },
  {
    key: 'bro5',
    name: 'Split 5 giorni',
    tag: 'Avanzato · 5 giorni',
    desc: 'Un distretto per seduta, volume alto. Per chi ha tempo e recupera bene.',
    days: [
      { name: 'Petto', ex: [
        row('panca-piana', 4, '6-8', 150), row('panca-inclinata-manubri', 4, '8-12', 110), row('croci-cavi', 3, '12-15', 70),
        row('chest-press', 3, '10-12', 90), row('dip-petto', 3, '8-12', 100)] },
      { name: 'Dorso', ex: [
        row('trazioni', 4, '6-10', 150), row('rematore-bilanciere', 4, '8-10', 120), row('lat-machine', 3, '10-12', 90),
        row('pulley', 3, '10-12', 90), row('pulldown-braccia-tese', 3, '12-15', 60), row('shrug-manubri', 3, '12-15', 60)] },
      { name: 'Gambe', ex: [
        row('squat', 4, '5-8', 180), row('leg-press', 4, '10-12', 140), row('stacco-rumeno', 3, '8-10', 140),
        row('leg-extension', 3, '12-15', 75), row('leg-curl-sdraiato', 3, '12-15', 75), row('calf-raise-piedi', 4, '12-20', 60)] },
      { name: 'Spalle', ex: [
        row('military-press', 4, '6-10', 140), row('alzate-laterali', 4, '12-20', 60), row('alzate-posteriori', 3, '15-20', 60),
        row('face-pull', 3, '15-20', 60), row('tirate-mento', 3, '10-12', 75)] },
      { name: 'Braccia', ex: [
        row('curl-bilanciere', 4, '8-12', 80), row('french-press', 4, '8-12', 80), row('curl-martello', 3, '10-12', 70),
        row('pushdown-corda', 3, '12-15', 60), row('curl-scott', 3, '10-12', 70), row('kickback', 3, '12-15', 60)] },
    ],
  },
  {
    key: 'home',
    name: 'Corpo libero',
    tag: 'Ovunque · 3 giorni',
    desc: 'Senza attrezzi, da fare a casa o in viaggio. Progredisci aumentando le ripetizioni.',
    days: [
      { name: 'Parte alta', ex: [
        row('piegamenti', 4, '10-20', 90), row('trazioni', 4, '5-10', 120), row('dip-tricipiti', 3, '8-15', 90),
        row('plank', 3, '45 s', 60), row('mountain-climber', 3, '40 s', 45)] },
      { name: 'Parte bassa', ex: [
        row('squat-corpo-libero', 4, '15-25', 75), row('affondi', 3, '12-15', 75), row('glute-bridge', 3, '15-20', 60),
        row('nordic-curl', 3, '5-8', 120), row('calf-raise-piedi', 4, '15-25', 45)] },
      { name: 'Full body', ex: [
        row('burpee', 4, '10-15', 90), row('piegamenti', 3, '12-20', 75), row('squat-corpo-libero', 3, '20-25', 60),
        row('leg-raise-terra', 3, '15-20', 45), row('plank-laterale', 3, '30 s', 45)] },
    ],
  },
];

export function buildFromTemplate(tpl) {
  return {
    id: uid(),
    name: tpl.name,
    note: tpl.desc,
    created: new Date().toISOString(),
    days: tpl.days.map((d) => ({
      id: uid(),
      name: d.name,
      exercises: d.ex.map((e) => ({ ...e, id: uid() })),
    })),
  };
}

/* ====================================================== parser testuale === */

const DAY_RE = /^\s*(?:giorno|day|scheda|allenamento|workout|sessione|seduta|wk)\b/i;
const SETS_RE = /(\d+)\s*(?:x|×|per)\s*(\d+\s*(?:[-–—/]\s*\d+)?)/i;
const REST_SEC = /(?:rec(?:upero)?|rest|pausa|riposo)?\s*[:=]?\s*(\d{2,3})\s*(?:''|"|s\b|sec\b|secondi)/i;
const REST_MIN = /(?:rec(?:upero)?|rest|pausa|riposo)?\s*[:=]?\s*(\d(?:[.,]\d)?)\s*(?:'|min\b|minuti)/i;

/**
 * Converte una scheda scritta a mano in una struttura utilizzabile.
 * Riconosce righe tipo:  "Panca piana 4x8 rec 2'"  ·  "3 x 12 Lat machine 90s"
 * @returns {{name:string, days:{name:string, exercises:object[]}[], unmatched:number, customs:object[]}}
 */
export function parseScheda(text, defaultRest = 90) {
  const lines = String(text || '').split(/\r?\n/);
  const days = [];
  const customs = [];
  let cur = null;
  let unmatched = 0;
  let name = '';

  const pushDay = (n) => { cur = { name: n || `Giorno ${days.length + 1}`, exercises: [] }; days.push(cur); };

  for (let raw of lines) {
    let line = raw.replace(/ /g, ' ').trim();
    if (!line) continue;
    line = line.replace(/^[-–—•*·>]+\s*/, '').replace(/^\d+[.)]\s+/, '');
    if (!line) continue;

    const hasSets = SETS_RE.test(line);
    const looksTitle = DAY_RE.test(line) || (!hasSets && line.length < 42 && (line === line.toUpperCase() || /[:：]$/.test(line)));

    if (looksTitle && !hasSets) {
      const clean = line.replace(/[:：]+$/, '').trim();
      if (/^scheda\b/i.test(clean) && !days.length) { name = clean.replace(/^scheda\s*[:\-–]?\s*/i, '').trim(); continue; }
      pushDay(clean);
      continue;
    }

    if (!cur) pushDay(null);

    // estrai serie x ripetizioni
    const m = line.match(SETS_RE);
    let sets = 3, reps = '8-12';
    if (m) {
      sets = Math.min(12, Math.max(1, parseInt(m[1], 10)));
      reps = m[2].replace(/\s+/g, '').replace(/[–—\/]/g, '-');
    }

    // recupero
    let rest = defaultRest;
    const rs = line.match(REST_SEC), rm = line.match(REST_MIN);
    if (rs) rest = Math.min(600, parseInt(rs[1], 10));
    else if (rm) rest = Math.round(parseFloat(rm[1].replace(',', '.')) * 60);

    // nome: tolgo serie/reps/recupero e le parole di servizio
    let exName = line
      .replace(SETS_RE, ' ')
      .replace(REST_SEC, ' ')
      .replace(REST_MIN, ' ')
      .replace(/\b(serie|set|reps?|ripetizioni|rec(?:upero)?|rest|pausa|riposo|kg|rpe\s*\d+(?:[.,]\d)?)\b/gi, ' ')
      .replace(/[:;,|]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    exName = exName.replace(/^[-–—\s]+|[-–—\s]+$/g, '');
    if (!exName) continue;

    const match = norm(exName).length >= 3 ? matchEx(exName) : null;
    let exId;
    if (match) exId = match.id;
    else {
      const c = makeCustom(exName);
      customs.push(c);
      exId = c.id;
      unmatched++;
    }
    cur.exercises.push({ id: uid(), exId, sets, reps, rest, note: '', superset: null, raw: exName, matched: !!match });
  }

  return {
    name: name || 'Scheda importata',
    days: days.filter((d) => d.exercises.length),
    unmatched,
    customs,
  };
}
