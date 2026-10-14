/* =========================================================================
   Animazione esercizi.

   Il corpo non è più una figura a bastoncini: ogni segmento è una capsula
   rastremata (path con due archi e i due raccordi tangenti), così la figura
   ha volume e si legge come un corpo.

   Una posa descrive il bacino, l'inclinazione del tronco e, per ciascun arto,
   o la posizione del punto di contatto (mano sul bilanciere, piede a terra) —
   risolta con una IK a due segmenti — oppure direttamente gli angoli dei due
   segmenti. Gli angoli servono per gli esercizi di isolamento: interpolare un
   angolo dà l'arco vero del movimento, mentre interpolare la posizione della
   mano taglia la corda dell'arco e fa sembrare il gesto innaturale.

   Angoli in gradi: 0 = destra, 90 = su, -90 = giù.
   ========================================================================= */

const NS = 'http://www.w3.org/2000/svg';

/* lunghezze dei segmenti (unità del viewBox 200x145) */
const L = { thigh: 25, shin: 25, arm: 19, fore: 18, torso: 32, neck: 4.5, head: 7.6, foot: 10 };
const FLOOR = 130;

/* spessori: raggio all'estremità prossimale e distale di ogni segmento */
const R = {
  torso: [8.6, 12.2],    // bacino -> spalle: la V del dorso
  thigh: [8, 5.6], shin: [5.2, 3.4], foot: [3.4, 2.2],
  arm: [5.2, 4], fore: [4, 3], hand: 3.1,
  neck: 4.6, head: [7.8, 8.8],
};

/* ------------------------------------------------------------- geometria - */

const rad = (d) => (d * Math.PI) / 180;
const dirv = (deg, len) => [Math.cos(rad(deg)) * len, -Math.sin(rad(deg)) * len];
const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
const lerp = (a, b, t) => a + (b - a) * t;
const lerpP = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
/** angolo speculare rispetto all'asse verticale: serve per il braccio opposto */
const mir = (ang) => (Array.isArray(ang) ? ang.map((x) => 180 - x) : 180 - ang);

/** Risolve la posizione dell'articolazione intermedia fra A e B. */
function ik(a, b, l1, l2, sign) {
  let dx = b[0] - a[0], dy = b[1] - a[1];
  let d = Math.hypot(dx, dy) || 0.001;
  const max = l1 + l2 - 0.01, min = Math.abs(l1 - l2) + 0.01;
  if (d > max) { const k = max / d; dx *= k; dy *= k; d = max; }
  if (d < min) { const k = min / d; dx *= k; dy *= k; d = min; }
  const t = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - t * t));
  const ux = dx / d, uy = dy / d;
  // sign > 0 -> l'articolazione sporge in avanti (+x) per un segmento verticale
  return [a[0] + ux * t + uy * h * sign, a[1] + uy * t - ux * h * sign, a[0] + dx, a[1] + dy];
}

/**
 * Capsula rastremata fra due punti: i due cerchi di raggio ra e rb uniti dalle
 * loro tangenti esterne. È la primitiva con cui è disegnato tutto il corpo.
 */
function capsule(a, b, ra, rb) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.hypot(dx, dy) || 0.001;
  const ux = dx / d, uy = dy / d;
  const nx = -uy, ny = ux;
  let s = (ra - rb) / d;
  s = Math.max(-0.999, Math.min(0.999, s));
  const c = Math.sqrt(1 - s * s);
  const P = (o, r, k) => `${(o[0] + r * (s * ux + k * c * nx)).toFixed(2)} ${(o[1] + r * (s * uy + k * c * ny)).toFixed(2)}`;
  // lato +n da A a B, semicerchio attorno a B, lato -n da B ad A, semicerchio attorno ad A
  return `M${P(a, ra, 1)}L${P(b, rb, 1)}A${rb} ${rb} 0 0 0 ${P(b, rb, -1)}L${P(a, ra, -1)}A${ra} ${ra} 0 0 0 ${P(a, ra, 1)}Z`;
}

/* --------------------------------------------------------------- pose ---- */

const BASE = {
  hip: [100, 80], torso: 90, tl: 0,
  ankle: [100, FLOOR], ankle2: null,
  hand: null, hand2: null,
  arm: null, arm2: null,          // [gradi omero, gradi avambraccio] -> cinematica diretta
  leg: null, leg2: null,          // [gradi femore, gradi tibia]
  kneeS: 1, kneeS2: 1, elbowS: -1, elbowS2: 1,
  sw: 0, hw: 0,                   // larghezza spalle / bacino (vista frontale)
  foot: 0, foot2: 0,              // piede: scarto dalla perpendicolare alla tibia
  head: 0,                        // inclinazione testa
  dir: 1,
};

/** hand può essere {rel:'shoulder', d:[dx,dy]} per restare solidale alle spalle. */
function resolveHand(h, shoulder) {
  if (!h) return null;
  if (Array.isArray(h)) return h;
  if (h.rel === 'shoulder') return [shoulder[0] + h.d[0], shoulder[1] + h.d[1]];
  if (h.rel === 'hip') return [h.d[0], h.d[1]];
  return null;
}

const D = (o) => ({ ...BASE, ...o });

/* ---------------------------------------------------------- definizioni --
   a = posizione allungata/iniziale, b = contratta/finale, mid = posa di
   passaggio (opzionale, per le traiettorie che non sono una retta).
   spine: true disegna la guida della schiena neutra.                       */

export const PATTERNS = {
  squat: {
    a: D({ hip: [100, 76], torso: 86, hand: { rel: 'shoulder', d: [-12, 3] }, elbowS: 1 }),
    mid: D({ hip: [98, 91], torso: 73, hand: { rel: 'shoulder', d: [-12, 3] }, elbowS: 1 }),
    b: D({ hip: [95, 106], torso: 60, hand: { rel: 'shoulder', d: [-12, 3] }, elbowS: 1 }),
    props: [{ t: 'load', at: 'shoulderBack', atDb: 'chest', style: 'disc' }, { t: 'rig', at: [162, 52] }, { t: 'floor' }], spine: true,
  },
  frontSquat: {
    a: D({ hip: [100, 76], torso: 89, hand: { rel: 'shoulder', d: [10, -1] }, elbowS: 1 }),
    b: D({ hip: [97, 106], torso: 76, hand: { rel: 'shoulder', d: [10, -1] }, elbowS: 1 }),
    props: [{ t: 'load', at: 'shoulderFront', style: 'disc' }, { t: 'floor' }], spine: true,
  },
  hinge: {
    a: D({ hip: [100, 78], torso: 88, hand: [103, 86] }),
    mid: D({ hip: [92, 83], torso: 58, hand: [104, 99] }),
    b: D({ hip: [84, 88], torso: 33, hand: [104, 110] }),
    props: [{ t: 'load', at: 'hand' }, { t: 'floor' }], spine: true,
  },
  horizPush: {
    a: D({ hip: [112, 100], torso: 177, ankle: [144, FLOOR], hand: [82, 86], elbowS: -1 }),
    b: D({ hip: [112, 100], torso: 177, ankle: [144, FLOOR], hand: [78, 60], elbowS: -1 }),
    props: [{ t: 'bench', from: [58, 106], to: [126, 106] }, { t: 'load', at: 'hand', rails: [62, 98] },
      { t: 'rig', at: [168, 56], rails: [62, 98] }, { t: 'floor' }],
  },
  inclinePush: {
    a: D({ hip: [118, 104], torso: 160, ankle: [146, FLOOR], hand: [84, 80], elbowS: -1 }),
    b: D({ hip: [118, 104], torso: 160, ankle: [146, FLOOR], hand: [78, 54], elbowS: -1 }),
    props: [{ t: 'benchInc', from: [126, 112], to: [68, 76] }, { t: 'load', at: 'hand' }, { t: 'floor' }],
  },
  pushup: {
    a: D({ hip: [92, 98], torso: -5, ankle: [44, 122], hand: [128, FLOOR], elbowS: -1, kneeS: -1 }),
    b: D({ hip: [92, 112], torso: -5, ankle: [44, 124], hand: [128, FLOOR], elbowS: -1, kneeS: -1 }),
    props: [{ t: 'floor' }], spine: true,
  },
  dip: {
    a: D({ hip: [100, 80], torso: 82, ankle: [78, 112], hand: [114, 84], elbowS: -1, kneeS: 1 }),
    b: D({ hip: [100, 100], torso: 76, ankle: [78, 124], hand: [114, 84], elbowS: -1, kneeS: 1 }),
    props: [{ t: 'rail', at: [114, 84] }],
  },
  vertPull: {
    a: D({ hip: [100, 95], torso: 88, ankle: [86, 124], hand: [104, 26], kneeS: 1, foot: -20 }),
    b: D({ hip: [100, 76], torso: 85, ankle: [86, 102], hand: [104, 26], kneeS: 1, foot: -20 }),
    props: [{ t: 'bar-fixed', y: 26 }],
  },
  pulldown: {
    a: D({ hip: [96, 98], torso: 96, ankle: [126, FLOOR], hand: [108, 30], kneeS: 1 }),
    b: D({ hip: [96, 98], torso: 102, hand: [112, 60], ankle: [126, FLOOR], kneeS: 1 }),
    props: [{ t: 'cable', from: [106, 10], to: 'hand' }, { t: 'load', at: 'hand', w: 18, pull: [106, 10] }, { t: 'seat', at: [96, 104] }, { t: 'rig', at: [152, 10] }, { t: 'floor' }],
  },
  horizPull: {
    a: D({ hip: [92, 100], torso: 76, ankle: [134, 124], hand: [154, 88], elbowS: -1, kneeS: 1 }),
    b: D({ hip: [92, 100], torso: 96, ankle: [134, 124], hand: [112, 86], elbowS: -1, kneeS: 1 }),
    props: [{ t: 'cable', from: [186, 90], to: 'hand' }, { t: 'load', at: 'hand', w: 12, pull: [186, 90] }, { t: 'seat', at: [92, 106] }, { t: 'floor' }], spine: true,
  },
  bentRow: {
    a: D({ hip: [86, 84], torso: 32, ankle: [92, FLOOR], hand: [116, 108] }),
    b: D({ hip: [86, 84], torso: 32, ankle: [92, FLOOR], hand: [110, 82] }),
    props: [{ t: 'load', at: 'hand' }, { t: 'floor' }], spine: true,
  },
  oneArmRow: {
    a: D({ hip: [84, 86], torso: 28, ankle: [86, FLOOR], hand: [116, 110], hand2: [138, 94], elbowS2: 1 }),
    b: D({ hip: [84, 86], torso: 28, ankle: [86, FLOOR], hand: [108, 84], hand2: [138, 94], elbowS2: 1 }),
    props: [{ t: 'bench', from: [122, 96], to: [168, 96] }, { t: 'load', at: 'hand' }, { t: 'floor' }], spine: true,
  },
  vertPush: {
    a: D({ hip: [100, 80], torso: 90, arm: [-40, 95], elbowS: 1 }),
    b: D({ hip: [100, 78], torso: 90, arm: [85, 88], elbowS: 1 }),
    props: [{ t: 'load', at: 'hand' }, { t: 'rig', at: [164, 26] }, { t: 'floor' }], spine: true,
  },
  lateralRaise: {
    a: D({ sw: 23, hw: 15, arm: [-78, -84], arm2: mir([-78, -84]), ankle: [108, FLOOR], ankle2: [92, FLOOR] }),
    b: D({ sw: 23, hw: 15, arm: [4, -2], arm2: mir([4, -2]), ankle: [108, FLOOR], ankle2: [92, FLOOR] }),
    props: [{ t: 'load', at: 'hand', cable: [178, 124] }, { t: 'load', at: 'hand2', cable: [22, 124] }, { t: 'floor' }],
  },
  frontRaise: {
    a: D({ arm: [-88, -86] }),
    b: D({ arm: [8, 8] }),
    props: [{ t: 'load', at: 'hand' }, { t: 'floor' }],
  },
  rearDelt: {
    a: D({ sw: 23, hw: 15, hip: [100, 86], torso: 82, hand: [110, 56], hand2: [90, 56], ankle: [110, FLOOR], ankle2: [90, FLOOR], elbowS: 1, elbowS2: -1 }),
    b: D({ sw: 23, hw: 15, hip: [100, 86], torso: 82, hand: [150, 50], hand2: [50, 50], ankle: [110, FLOOR], ankle2: [90, FLOOR], elbowS: 1, elbowS2: -1 }),
    props: [{ t: 'seat', at: [100, 96] }, { t: 'load', at: 'hand' }, { t: 'load', at: 'hand2' }, { t: 'rig', at: [172, 50] }, { t: 'floor' }],
  },
  facePull: {
    a: D({ arm: [-4, 6], elbowS: 1 }),
    b: D({ arm: [14, 150], elbowS: 1 }),
    props: [{ t: 'cable', from: [190, 36], to: 'hand' }, { t: 'load', at: 'hand', w: 14, pull: [190, 36] }, { t: 'floor' }],
  },
  uprightRow: {
    a: D({ sw: 23, hw: 15, hand: [110, 88], hand2: [90, 88], ankle: [108, FLOOR], ankle2: [92, FLOOR], elbowS: 1, elbowS2: -1 }),
    b: D({ sw: 23, hw: 15, hand: [108, 52], hand2: [92, 52], ankle: [108, FLOOR], ankle2: [92, FLOOR], elbowS: 1, elbowS2: -1 }),
    props: [{ t: 'load', at: 'hand', at2: 'hand2' }, { t: 'floor' }],
  },
  shrug: {
    a: D({ tl: -2.5, arm: [-92, -90] }),
    b: D({ tl: 3, arm: [-92, -90] }),
    props: [{ t: 'load', at: 'hand' }, { t: 'floor' }], spine: true,
  },
  curl: {
    a: D({ arm: [-95, -88] }),
    b: D({ arm: [-95, 55] }),
    props: [{ t: 'load', at: 'hand', w: 14, cable: [142, 124] }, { t: 'floor' }],
  },
  skull: {
    a: D({ hip: [112, 100], torso: 177, ankle: [144, FLOOR], arm: [85, 168], elbowS: 1 }),
    b: D({ hip: [112, 100], torso: 177, ankle: [144, FLOOR], arm: [85, 80], elbowS: 1 }),
    props: [{ t: 'bench', from: [58, 106], to: [126, 106] }, { t: 'load', at: 'hand', w: 14 }, { t: 'floor' }],
  },
  tricepsExt: {
    a: D({ arm: [100, -158] }),
    b: D({ arm: [100, 86] }),
    props: [{ t: 'load', at: 'hand', cable: [100, 124] }, { t: 'floor' }],
  },
  pushdown: {
    a: D({ arm: [-92, 28] }),
    b: D({ arm: [-92, -88] }),
    props: [{ t: 'cable', from: [126, 10], to: 'hand' }, { t: 'load', at: 'hand', w: 13, pull: [126, 10] }, { t: 'rig', at: [152, 10] }, { t: 'floor' }],
  },
  kickback: {
    a: D({ hip: [88, 86], torso: 32, ankle: [92, FLOOR], arm: [-150, -80] }),
    b: D({ hip: [88, 86], torso: 32, ankle: [92, FLOOR], arm: [-150, -148] }),
    props: [{ t: 'load', at: 'hand', cable: [152, 118] }, { t: 'floor' }], spine: true,
  },
  legPress: {
    a: D({ hip: [76, 98], torso: 203, leg: [18, 108], leg2: [12, 104], hand: [94, 112], elbowS: 1 }),
    b: D({ hip: [76, 98], torso: 203, leg: [-16, -14], leg2: [-22, -18], hand: [94, 112], elbowS: 1 }),
    props: [{ t: 'pad', from: [84, 108], to: [46, 124] }, { t: 'plate', at: 'ankle' }, { t: 'rig', at: [172, 30] }],
  },
  legExtension: {
    a: D({ hip: [92, 96], torso: 96, leg: [-5, -80], hand: [76, 102], elbowS: 1 }),
    b: D({ hip: [92, 96], torso: 96, leg: [-5, 4], hand: [76, 102], elbowS: 1 }),
    props: [{ t: 'seat', at: [92, 102] }, { t: 'roll', at: 'ankle' }, { t: 'rig', at: [60, 62] }, { t: 'floor' }],
  },
  legCurl: {
    a: D({ hip: [104, 104], torso: 186, leg: [-3, -9], hand: [68, 112], elbowS: 1 }),
    b: D({ hip: [104, 104], torso: 186, leg: [-3, 76], hand: [68, 112], elbowS: 1 }),
    props: [{ t: 'bench', from: [58, 112], to: [122, 112] }, { t: 'roll', at: 'ankle' }, { t: 'rig', at: [174, 64] }, { t: 'floor' }],
  },
  calfRaise: {
    a: D({ hip: [100, 80], ankle: [100, FLOOR], arm: [-92, -90], foot: 0 }),
    b: D({ hip: [100, 72], ankle: [100, 122], arm: [-92, -90] }),
    props: [{ t: 'pad', from: [92, 44], to: [112, 44] }, { t: 'rig', at: [150, 40] }, { t: 'floor' }],
  },
  lunge: {
    a: D({ hip: [100, 82], torso: 86, ankle: [126, FLOOR], ankle2: [76, FLOOR], arm: [-92, -90], arm2: [-92, -90] }),
    b: D({ hip: [100, 102], torso: 83, ankle: [126, FLOOR], ankle2: [72, 126], kneeS2: -1, arm: [-92, -90], arm2: [-92, -90] }),
    props: [{ t: 'load', at: 'hand' }, { t: 'load', at: 'hand2' }, { t: 'floor' }], spine: true,
  },
  stepUp: {
    a: D({ hip: [92, 90], torso: 86, ankle: [120, 106], ankle2: [76, FLOOR], arm: [-92, -90], arm2: [-92, -90] }),
    b: D({ hip: [112, 68], torso: 88, ankle: [120, 106], ankle2: [104, 110], kneeS2: -1, arm: [-92, -90], arm2: [-92, -90] }),
    props: [{ t: 'box', at: [120, 106] }, { t: 'load', at: 'hand' }, { t: 'load', at: 'hand2' }, { t: 'floor' }],
  },
  hipThrust: {
    a: D({ hip: [112, 116], torso: 156, ankle: [150, FLOOR], hand: { rel: 'shoulder', d: [6, -4] }, kneeS: 1, elbowS: 1 }),
    b: D({ hip: [112, 94], torso: 178, ankle: [150, FLOOR], hand: { rel: 'shoulder', d: [6, -4] }, kneeS: 1, elbowS: 1 }),
    props: [{ t: 'bench', from: [50, 100], to: [94, 100] }, { t: 'load', at: 'hip', style: 'disc' }, { t: 'floor' }],
  },
  hyperextension: {
    a: D({ hip: [100, 92], torso: 20, ankle: [68, 124], hand: { rel: 'shoulder', d: [1, 9] }, kneeS: -1, elbowS: -1 }),
    b: D({ hip: [100, 92], torso: 74, ankle: [68, 124], hand: { rel: 'shoulder', d: [1, 9] }, kneeS: -1, elbowS: -1 }),
    props: [{ t: 'pad', from: [96, 98], to: [76, 116] }, { t: 'floor' }], spine: true,
  },
  abduction: {
    a: D({ sw: 23, hw: 16, hip: [100, 94], torso: 92, ankle: [108, 124], ankle2: [92, 124], kneeS: 1, kneeS2: -1, hand: [114, 100], hand2: [86, 100], elbowS: 1, elbowS2: -1 }),
    b: D({ sw: 23, hw: 16, hip: [100, 94], torso: 92, ankle: [138, 122], ankle2: [62, 122], kneeS: 1, kneeS2: -1, hand: [114, 100], hand2: [86, 100], elbowS: 1, elbowS2: -1 }),
    props: [{ t: 'seat', at: [100, 102] }, { t: 'rig', at: [170, 56] }, { t: 'floor' }],
  },
  adduction: {
    a: D({ sw: 23, hw: 16, hip: [100, 94], torso: 92, ankle: [138, 122], ankle2: [62, 122], kneeS: 1, kneeS2: -1, hand: [114, 100], hand2: [86, 100], elbowS: 1, elbowS2: -1 }),
    b: D({ sw: 23, hw: 16, hip: [100, 94], torso: 92, ankle: [108, 124], ankle2: [92, 124], kneeS: 1, kneeS2: -1, hand: [114, 100], hand2: [86, 100], elbowS: 1, elbowS2: -1 }),
    props: [{ t: 'seat', at: [100, 102] }, { t: 'rig', at: [170, 56] }, { t: 'floor' }],
  },
  fly: {
    a: D({ hip: [112, 100], torso: 177, ankle: [144, FLOOR], arm: [160, 112], elbowS: 1 }),
    b: D({ hip: [112, 100], torso: 177, ankle: [144, FLOOR], arm: [92, 80], elbowS: 1 }),
    props: [{ t: 'bench', from: [58, 106], to: [126, 106] }, { t: 'load', at: 'hand' }, { t: 'rig', at: [168, 50] }, { t: 'floor' }],
  },
  flyCable: {
    a: D({ sw: 23, hw: 15, hip: [100, 82], torso: 86, hand: [152, 52], hand2: [48, 52], ankle: [110, FLOOR], ankle2: [90, 124], elbowS: 1, elbowS2: -1 }),
    b: D({ sw: 23, hw: 15, hip: [100, 82], torso: 86, hand: [108, 84], hand2: [92, 84], ankle: [110, FLOOR], ankle2: [90, 124], elbowS: 1, elbowS2: -1 }),
    props: [{ t: 'cable', from: [188, 18], to: 'hand' }, { t: 'cable', from: [12, 18], to: 'hand2' }, { t: 'load', at: 'hand', w: 10, pull: [188, 18] }, { t: 'load', at: 'hand2', w: 10, pull: [12, 18] }, { t: 'floor' }],
  },
  pullover: {
    a: D({ hip: [112, 100], torso: 177, ankle: [144, FLOOR], arm: [150, 150], elbowS: 1 }),
    b: D({ hip: [112, 100], torso: 177, ankle: [144, FLOOR], arm: [88, 88], elbowS: 1 }),
    props: [{ t: 'bench', from: [58, 106], to: [126, 106] }, { t: 'load', at: 'hand', cable: [18, 34] }, { t: 'rig', at: [168, 50] }, { t: 'floor' }],
  },
  crunch: {
    a: D({ hip: [114, 112], torso: 190, ankle: [148, 126], hand: { rel: 'shoulder', d: [9, -3] }, kneeS: 1, elbowS: 1, head: -12 }),
    b: D({ hip: [114, 112], torso: 146, ankle: [148, 126], hand: { rel: 'shoulder', d: [9, -3] }, kneeS: 1, elbowS: 1, head: -22 }),
    props: [{ t: 'rig', at: [170, 60] }, { t: 'floor' }],
  },
  legRaise: {
    a: D({ hip: [100, 80], torso: 88, leg: [-92, -92], hand: [104, 12] }),
    b: D({ hip: [100, 80], torso: 88, leg: [-4, 6], hand: [104, 12] }),
    props: [{ t: 'bar-fixed', y: 12 }],
  },
  plank: {
    a: D({ hip: [98, 104], torso: -7, ankle: [46, 122], hand: [134, 126], elbowS: -1, kneeS: -1 }),
    b: D({ hip: [98, 106], torso: -7, ankle: [46, 123], hand: [134, 126], elbowS: -1, kneeS: -1 }),
    props: [{ t: 'floor' }], spine: true,
  },
  mountain: {
    a: D({ hip: [98, 104], torso: -7, ankle: [46, 122], ankle2: [50, 126], hand: [134, 127], elbowS: -1, kneeS: 1, kneeS2: 1 }),
    b: D({ hip: [98, 104], torso: -7, ankle: [92, 114], ankle2: [50, 126], hand: [134, 127], elbowS: -1, kneeS: 1, kneeS2: 1 }),
    props: [{ t: 'floor' }], spine: true,
  },
  twist: {
    a: D({ sw: 23, hw: 16, hip: [100, 100], torso: 64, ankle: [130, 118], ankle2: [136, 122], hand: [70, 86], hand2: [78, 88], elbowS: 1, elbowS2: 1, kneeS: 1, kneeS2: 1 }),
    b: D({ sw: 23, hw: 16, hip: [100, 100], torso: 64, ankle: [130, 118], ankle2: [136, 122], hand: [128, 86], hand2: [136, 88], elbowS: -1, elbowS2: -1, kneeS: 1, kneeS2: 1 }),
    props: [{ t: 'floor' }],
  },
  abwheel: {
    a: D({ hip: [104, 106], torso: 50, leg: [-122, 174], hand: [126, 124], elbowS: -1, foot: 198 }),
    b: D({ hip: [104, 108], torso: 12, leg: [-122, 174], hand: [172, 126], elbowS: -1, foot: 198 }),
    props: [{ t: 'wheel', at: 'hand' }, { t: 'floor' }], spine: true,
  },
  wristCurl: {
    a: D({ hip: [92, 98], torso: 94, ankle: [120, 126], arm: [-18, -8], kneeS: 1 }),
    b: D({ hip: [92, 98], torso: 94, ankle: [120, 126], arm: [-18, 16], kneeS: 1 }),
    props: [{ t: 'seat', at: [92, 104] }, { t: 'load', at: 'hand', w: 14 }, { t: 'floor' }],
  },
  farmer: {
    a: D({ sw: 22, hw: 15, arm: [-92, -90], arm2: mir([-92, -90]), ankle: [112, 124], ankle2: [88, FLOOR], kneeS2: 1 }),
    b: D({ sw: 22, hw: 15, arm: [-92, -90], arm2: mir([-92, -90]), ankle: [88, FLOOR], ankle2: [112, 124], kneeS2: 1 }),
    props: [{ t: 'load', at: 'hand' }, { t: 'load', at: 'hand2' }, { t: 'floor' }], spine: true,
  },
  cardio: {
    a: D({ hip: [100, 76], torso: 82, leg: [-58, -92], leg2: [-108, -58], arm: [-120, -40], arm2: [-62, -140], elbowS: 1, elbowS2: 1 }),
    b: D({ hip: [100, 76], torso: 82, leg: [-108, -58], leg2: [-58, -92], arm: [-62, -140], arm2: [-120, -40], elbowS: 1, elbowS2: 1 }),
    props: [{ t: 'floor' }],
  },
  bike: {
    a: D({ hip: [88, 92], torso: 66, ankle: [118, 102], ankle2: [104, 120], kneeS: 1, kneeS2: 1, hand: [136, 76], elbowS: 1 }),
    b: D({ hip: [88, 92], torso: 66, ankle: [104, 120], ankle2: [118, 102], kneeS: 1, kneeS2: 1, hand: [136, 76], elbowS: 1 }),
    props: [{ t: 'seat', at: [88, 98] }, { t: 'wheel', at: [112, 112], r: 13 }, { t: 'floor' }],
  },
  rowErg: {
    a: D({ hip: [92, 102], torso: 60, leg: [6, -64], hand: [152, 92], elbowS: 1 }),
    b: D({ hip: [86, 100], torso: 106, leg: [-6, -4], hand: [104, 94], elbowS: 1 }),
    props: [{ t: 'cable', from: [190, 108], to: 'hand' }, { t: 'floor' }], spine: true,
  },
  rope: {
    a: D({ sw: 22, hw: 15, hip: [100, 82], arm: [-130, -40], arm2: mir([-130, -40]), ankle: [108, FLOOR], ankle2: [92, FLOOR] }),
    b: D({ sw: 22, hw: 15, hip: [100, 74], arm: [-130, -40], arm2: mir([-130, -40]), ankle: [108, 120], ankle2: [92, 120], foot: -25, foot2: -25 }),
    props: [{ t: 'floor' }],
  },
  burpee: {
    a: D({ hip: [100, 76], torso: 88, arm: [-90, -88] }),
    b: D({ hip: [98, 108], torso: -7, ankle: [48, 126], hand: [134, 128], elbowS: -1, kneeS: -1 }),
    props: [{ t: 'floor' }],
  },
  clean: {
    a: D({ hip: [82, 92], torso: 40, ankle: [98, FLOOR], hand: [104, 114] }),
    mid: D({ hip: [96, 82], torso: 72, ankle: [100, FLOOR], hand: [104, 84] }),
    b: D({ hip: [100, 80], torso: 90, hand: [110, 46], elbowS: 1 }),
    props: [{ t: 'load', at: 'hand' }, { t: 'floor' }], spine: true,
  },
  thruster: {
    a: D({ hip: [97, 104], torso: 72, hand: [118, 72], elbowS: 1 }),
    b: D({ hip: [100, 78], torso: 90, arm: [85, 88], elbowS: 1 }),
    props: [{ t: 'load', at: 'hand' }, { t: 'floor' }], spine: true,
  },
  sled: {
    a: D({ hip: [92, 85], torso: 38, leg: [-130, -66], leg2: [-52, -84], hand: [136, 74], elbowS: -1 }),
    b: D({ hip: [92, 85], torso: 38, leg: [-52, -84], leg2: [-130, -66], hand: [136, 74], elbowS: -1 }),
    props: [{ t: 'sledBox', at: [152, 112] }, { t: 'floor' }], spine: true,
  },
  misc: {
    a: D({ hip: [100, 80], arm: [-90, -86] }),
    b: D({ hip: [100, 75], arm: [-90, -72] }),
    props: [{ t: 'floor' }],
  },

  /* ------------------------------------------------------------- macchine --
     Alla macchina non si impugna un peso libero: ci si siede dentro e si muove
     la sua leva. Questi pattern sostituiscono quelli con i pesi liberi quando
     l'attrezzo dell'esercizio è una macchina (vedi EQ_PAT), perché il gesto
     è un altro: cambia la postura, non solo l'attrezzo in mano.             */

  /* Seduto, schienale dietro, spinta orizzontale sulle maniglie. */
  machPress: {
    a: D({ hip: [92, 100], torso: 94, leg: [-8, -78], arm: [-100, 29] }),
    mid: D({ hip: [92, 100], torso: 94, leg: [-8, -78], arm: [-70, 26] }),
    b: D({ hip: [92, 100], torso: 94, leg: [-8, -78], arm: [-20, -10] }),
    props: [
      { t: 'seat', at: [92, 104] }, { t: 'pad', from: [82, 110], to: [77, 58] },
      { t: 'load', at: 'hand', cable: [168, 56] },
      { t: 'rig', at: [168, 56] }, { t: 'floor' },
    ],
  },
  /* Pectoral machine: i bracci pivotano in alto e si chiudono davanti. */
  machFly: {
    a: D({ hip: [92, 100], torso: 92, leg: [-8, -78], arm: [160, 90] }),
    b: D({ hip: [92, 100], torso: 92, leg: [-8, -78], arm: [20, 90] }),
    props: [
      { t: 'seat', at: [92, 104] }, { t: 'pad', from: [82, 110], to: [79, 76] },
      { t: 'frame', pts: [[91, 12], [91, 5], [170, 5], [170, 40]] },
      { t: 'lever', at: [91, 12], to: 'hand', ext: 3 },
      { t: 'load', at: 'hand', pull: [91, 12] },
      { t: 'rig', at: [170, 40] }, { t: 'floor' },
    ],
  },
  /* Shoulder press: seduto, le maniglie salgono sopra la testa. */
  machShoulder: {
    a: D({ hip: [92, 100], torso: 92, leg: [-8, -78], arm: [-40, 95] }),
    b: D({ hip: [92, 100], torso: 92, leg: [-8, -78], arm: [85, 88] }),
    props: [
      { t: 'seat', at: [92, 104] }, { t: 'pad', from: [82, 110], to: [78, 66] },
      { t: 'frame', pts: [[136, 34], [136, 10], [172, 10], [172, 42]] },
      { t: 'lever', at: [136, 34], to: 'hand', ext: 3 },
      { t: 'load', at: 'hand', pull: [136, 34] },
      { t: 'rig', at: [172, 42] }, { t: 'floor' },
    ],
  },
  /* Reverse pec deck: di fronte, seduto, i bracci si aprono all'indietro. */
  machRearDelt: {
    a: D({ sw: 23, hw: 15, hip: [100, 92], torso: 84, hand: [126, 58], hand2: [74, 58],
      ankle: [112, 126], ankle2: [88, 126], elbowS: 1, elbowS2: -1, kneeS: 1, kneeS2: -1 }),
    b: D({ sw: 23, hw: 15, hip: [100, 92], torso: 84, hand: [150, 52], hand2: [50, 52],
      ankle: [112, 126], ankle2: [88, 126], elbowS: 1, elbowS2: -1, kneeS: 1, kneeS2: -1 }),
    props: [
      { t: 'seat', at: [100, 96] }, { t: 'frame', pts: [[100, 96], [100, 128]], w: 9 },
      { t: 'frame', pts: [[73, 10], [174, 10], [174, 44]] },
      { t: 'lever', at: [127, 10], to: 'hand', ext: 3 },
      { t: 'lever', at: [73, 10], to: 'hand2', ext: 3 },
      { t: 'load', at: 'hand', pull: [127, 10] }, { t: 'load', at: 'hand2', pull: [73, 10] },
      { t: 'rig', at: [174, 44] }, { t: 'floor' },
    ],
  },
  /* Alzate laterali alla macchina: i cuscinetti premono sulle braccia. */
  machLatRaise: {
    a: D({ sw: 23, hw: 15, hip: [100, 90], torso: 90, arm: [-78, -84], arm2: mir([-78, -84]),
      ankle: [112, 126], ankle2: [88, 126], kneeS: 1, kneeS2: -1 }),
    b: D({ sw: 23, hw: 15, hip: [100, 90], torso: 90, arm: [4, -2], arm2: mir([4, -2]),
      ankle: [112, 126], ankle2: [88, 126], kneeS: 1, kneeS2: -1 }),
    props: [
      { t: 'seat', at: [100, 94] }, { t: 'frame', pts: [[100, 94], [100, 128]], w: 9 },
      { t: 'frame', pts: [[100, 49], [100, 18], [176, 18], [176, 46]] },
      { t: 'lever', at: [99, 49], to: 'elbow' }, { t: 'lever', at: [101, 49], to: 'elbow2' },
      { t: 'cuff', at: 'elbow', from: 'shR', off: 3, len: 13, front: true },
      { t: 'cuff', at: 'elbow2', from: 'shL', off: 3, len: 13, front: true },
      { t: 'load', at: 'hand', pull: [99, 49] }, { t: 'load', at: 'hand2', pull: [101, 49] },
      { t: 'rig', at: [176, 46] }, { t: 'floor' },
    ],
  },
  /* Pullover alla macchina: gomiti sui cuscinetti, perno all'altezza spalla. */
  machPullover: {
    a: D({ hip: [92, 100], torso: 92, leg: [-8, -78], arm: [140, 140] }),
    b: D({ hip: [92, 100], torso: 92, leg: [-8, -78], arm: [-40, -42] }),
    props: [
      { t: 'seat', at: [92, 104] }, { t: 'pad', from: [82, 110], to: [79, 80] },
      { t: 'frame', pts: [[91, 68], [56, 68]] },
      { t: 'lever', at: [91, 68], to: 'elbow', ext: 4 },
      { t: 'cuff', at: 'elbow', from: 'shR', off: 2, len: 13, front: true },
      { t: 'rig', at: [56, 68] }, { t: 'floor' },
    ],
  },
  /* Hack squat: slitta inclinata, cuscinetti sulle spalle, piedi sulla pedana. */
  hackSquat: {
    a: D({ hip: [94, 84], torso: 108, ankle: [114, 127], arm: [-80, -85], kneeS: 1 }),
    b: D({ hip: [84, 106], torso: 108, ankle: [114, 127], arm: [-80, -85], kneeS: 1 }),
    props: [
      { t: 'frame', pts: [[82, 26], [36, 127]], w: 3.5 },
      { t: 'pad', from: [80, 39], to: [60, 83] },
      { t: 'pad', from: [100, 128], to: [144, 128] },
      { t: 'cuff', at: 'shoulder', from: 'hip', off: 2, len: 15, w: 7, front: true },
      { t: 'disc', at: [52, 92], r: 7.5 }, { t: 'disc', at: [45, 108], r: 7.5 },
      { t: 'floor' },
    ],
  },
  /* Crunch ai cavi: in ginocchio davanti alla colonna, corda alla fronte. */
  kneelCrunch: {
    a: D({ hip: [96, 104], torso: 72, leg: [-85, 175], foot: 180,
      hand: { rel: 'shoulder', d: [6, -6] }, elbowS: 1 }),
    b: D({ hip: [96, 104], torso: 35, leg: [-85, 175], foot: 180,
      hand: { rel: 'shoulder', d: [6, -6] }, elbowS: 1 }),
    props: [
      { t: 'cable', from: [166, 14], to: 'hand' },
      { t: 'load', at: 'hand', w: 12, pull: [166, 14] },
      { t: 'rig', at: [166, 14] }, { t: 'floor' },
    ],
  },
  /* Woodchopper: la fune scende dalla carrucola alta e si tira di traverso. */
  cableChop: {
    a: D({ sw: 23, hw: 16, hip: [100, 84], torso: 88, ankle: [112, FLOOR], ankle2: [88, FLOOR],
      hand: [80, 38], hand2: [76, 40], elbowS: 1, elbowS2: -1, kneeS: 1, kneeS2: -1 }),
    b: D({ sw: 23, hw: 16, hip: [100, 84], torso: 88, ankle: [112, FLOOR], ankle2: [88, FLOOR],
      hand: [116, 76], hand2: [112, 74], elbowS: 1, elbowS2: -1, kneeS: 1, kneeS2: -1 }),
    props: [
      { t: 'cable', from: [20, 20], to: 'hand' },
      { t: 'load', at: 'hand', w: 12, pull: [20, 20] },
      { t: 'rig', at: [20, 20] }, { t: 'floor' },
    ],
  },
  /* Crunch alla macchina: il braccio della macchina ruota al livello del sedile. */
  machCrunch: {
    a: D({ hip: [92, 102], torso: 100, leg: [-8, -78], hand: { rel: 'shoulder', d: [12, -4] }, elbowS: 1, head: -8 }),
    b: D({ hip: [92, 102], torso: 68, leg: [-8, -78], hand: { rel: 'shoulder', d: [12, -4] }, elbowS: 1, head: -16 }),
    props: [
      { t: 'seat', at: [92, 106] },
      { t: 'frame', pts: [[118, 128], [118, 112], [168, 112]] },
      { t: 'lever', at: [118, 112], to: 'hand', ext: 4, front: true },
      { t: 'load', at: 'hand', pull: [118, 112] },
      { t: 'rig', at: [168, 46] }, { t: 'floor' },
    ],
  },
};

/* alias di pattern che condividono la stessa animazione */
const ALIAS = { jump: 'squat', hang: 'vertPull' };

/* Con la macchina il gesto non è lo stesso con un attrezzo diverso: è un
   altro gesto. L'esercizio tiene il suo `p` (la panca resta una spinta
   orizzontale) e qui si sceglie la variante giusta per l'attrezzo. */
const EQ_PAT = {
  horizPush: { macchina: 'machPress' },
  fly: { macchina: 'machFly' },
  vertPush: { macchina: 'machShoulder' },
  rearDelt: { macchina: 'machRearDelt' },
  lateralRaise: { macchina: 'machLatRaise' },
  pullover: { macchina: 'machPullover' },
  squat: { macchina: 'hackSquat' },
  crunch: { macchina: 'machCrunch', cavi: 'kneelCrunch' },
  twist: { cavi: 'cableChop' },
};

export function patternOf(key, eq) {
  const k = ALIAS[key] || key;
  const v = eq && EQ_PAT[k] && EQ_PAT[k][eq];
  return PATTERNS[v] || PATTERNS[k] || PATTERNS.misc;
}

/* ---------------------------------------------------------- scheletro ---- */

function skeleton(pose) {
  const hip = pose.hip;
  const tl = L.torso + (pose.tl || 0);
  const r = rad(pose.torso);
  const sh = [hip[0] + Math.cos(r) * tl, hip[1] - Math.sin(r) * tl];
  const neck = [hip[0] + Math.cos(r) * (tl + L.neck), hip[1] - Math.sin(r) * (tl + L.neck)];
  const headDeg = pose.torso + pose.head;
  const head = add(neck, dirv(headDeg, L.head));

  const shR = [sh[0] + pose.sw / 2, sh[1]];
  const shL = [sh[0] - pose.sw / 2, sh[1]];
  const hipR = [hip[0] + pose.hw / 2, hip[1]];
  const hipL = [hip[0] - pose.hw / 2, hip[1]];

  /** Catena a due segmenti: angoli espliciti se ci sono, altrimenti IK sul contatto. */
  function chain(origin, ang, target, l1, l2, sign) {
    if (ang) {
      const j = add(origin, dirv(ang[0], l1));
      return [j, add(j, dirv(ang[1], l2))];
    }
    const t = target || add(origin, [0, l1 + l2]);
    const [jx, jy, ex, ey] = ik(origin, t, l1, l2, sign);
    return [[jx, jy], [ex, ey]];
  }

  const armA = pose.arm;
  const armB = pose.arm2 ?? (pose.sw ? (pose.arm ? mir(pose.arm) : null) : pose.arm);
  const handA = resolveHand(pose.hand, sh);
  const handB = resolveHand(pose.hand2, sh) ?? (pose.sw ? null : handA);
  /* Di profilo i due arti sono sovrapposti: se usassero segni diversi i gomiti
     (e le ginocchia) si aprirebbero in direzioni opposte, come due persone
     diverse. Il segno del lato lontano vale solo quando quel lato ha una posa
     sua, cioè nelle viste frontali o quando è indicato esplicitamente. */
  const soloSuo = (b, a) => (pose.sw || pose.hand2 || pose.arm2 ? b : a);
  const [elbow, hand] = chain(shR, armA, handA, L.arm, L.fore, pose.elbowS);
  const [elbow2, hand2] = chain(shL, armB, handB, L.arm, L.fore, soloSuo(pose.elbowS2, pose.elbowS));

  const legA = pose.leg;
  const legB = pose.leg2 ?? (pose.hw ? (pose.leg ? mir(pose.leg) : null) : pose.leg);
  const ankA = pose.ankle;
  const ankB = pose.ankle2 || (pose.hw ? [ankA[0] - pose.hw, ankA[1]] : ankA);
  const soloSua = (b, a) => (pose.hw || pose.ankle2 || pose.leg2 ? b : a);
  const [knee, ankle] = chain(hipR, legA, ankA, L.thigh, L.shin, pose.kneeS);
  const [knee2, ankle2] = chain(hipL, legB, ankB, L.thigh, L.shin, soloSua(pose.kneeS2, pose.kneeS));

  /* Direzione del piede. Con un angolo assoluto il piede restava indietro
     appena la gamba usciva dalla verticale; ma nemmeno "perpendicolare alla
     tibia" va bene, perché in accosciata affonderebbe nel pavimento. La regola
     è fisica: se il piede appoggia resta appoggiato — è la caviglia ad
     assorbire l'inclinazione — altrimenti segue la tibia. */
  const tibia = (k, a) => (Math.atan2(-(a[1] - k[1]), a[0] - k[0]) * 180) / Math.PI;
  function footDeg(k, a, off) {
    const dy = FLOOR - a[1];
    if (dy <= 9) {                                   // appoggiato o sulla punta
      const dx = Math.sqrt(Math.max(1, L.foot * L.foot - dy * dy));
      return (Math.atan2(-dy, dx) * 180) / Math.PI + off;
    }
    return tibia(k, a) + 90 + off;
  }
  const foot2 = soloSua(pose.foot2, pose.foot);

  return {
    hip, sh, neck, head, headDeg, shR, shL, hipR, hipL,
    elbow, hand, elbow2, hand2, knee, ankle, knee2, ankle2,
    toe: add(ankle, dirv(footDeg(knee, ankle, pose.foot), L.foot)),
    toe2: add(ankle2, dirv(footDeg(knee2, ankle2, foot2), L.foot)),
    shoulder: sh,
    chest: add(lerpP(sh, hip, 0.26), dirv(pose.torso - 90, 9)),
    shoulderBack: add(sh, dirv(pose.torso - 180, 4.5)),   // rack posteriore: bilanciere sui trapezi
    shoulderFront: add(sh, dirv(pose.torso - 62, 9)),     // rack frontale: bilanciere sulle clavicole
  };
}

function blend(a, b, t) {
  const o = {};
  for (const k of Object.keys(BASE)) {
    const va = a[k] ?? BASE[k], vb = b[k] ?? BASE[k];
    if (Array.isArray(va) && Array.isArray(vb)) o[k] = lerpP(va, vb, t);
    else if (typeof va === 'number' && typeof vb === 'number') o[k] = lerp(va, vb, t);
    else if (va && vb && va.rel && vb.rel) o[k] = { rel: va.rel, d: lerpP(va.d, vb.d, t) };
    else o[k] = t < 0.5 ? va : vb;
  }
  return o;
}

/** Con una posa di passaggio il movimento segue la traiettoria vera, non la corda. */
function poseAt(pat, t) {
  if (!pat.mid) return blend(pat.a, pat.b, t);
  return t < 0.5 ? blend(pat.a, pat.mid, t * 2) : blend(pat.mid, pat.b, (t - 0.5) * 2);
}

/* ------------------------------------------------------------ muscoli --- */
/* La figura non è una sagoma liscia: sopra al corpo corrono i contorni dei
   gruppi muscolari, ancorati alle stesse articolazioni e quindi deformati
   dalla posa. Il gruppo che lavora viene poi ridisegnato pieno, in rosso. */

/** Capsula lungo un segmento, spostata di `off` sulla sua normale. */
function mus(a, b, ra, rb, from, to, off = 0) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.hypot(dx, dy) || 0.001;
  const nx = -dy / d, ny = dx / d;
  const p = lerpP(a, b, from), q = lerpP(a, b, to);
  return capsule([p[0] + nx * off, p[1] + ny * off], [q[0] + nx * off, q[1] + ny * off], ra, rb);
}

/* Ogni gruppo è descritto su un lato del corpo; `L` porta le articolazioni di
   quel lato, così di fronte si disegnano entrambi. off < 0 = lato anteriore. */
const SHAPES = {
  trap: (s, L) => mus(s.neck, L.sh, 4.4, 5.2, 0.12, 1, 1.2),
  delt: (s, L) => mus(L.sh, L.elbow, 5.9, 4.6, -0.14, 0.26),
  pec: (s, L) => mus(s.sh, s.hip, 7.4, 5.8, 0.04, 0.36, -2.6),
  lat: (s, L) => mus(s.sh, s.hip, 6.8, 3.2, 0.1, 0.62, 2.8),
  abs: (s) => [0.44, 0.58, 0.72].map((t) => mus(s.sh, s.hip, 4.3, 4.3, t, t + 0.055, -1.6)).join(' '),
  bi: (s, L) => mus(L.sh, L.elbow, 4.4, 3.2, 0.3, 0.95, -1.3),
  tri: (s, L) => mus(L.sh, L.elbow, 4.2, 3, 0.26, 0.92, 1.5),
  fore: (s, L) => mus(L.elbow, L.hand, 3.6, 2.3, 0.08, 0.8, -0.6),
  quad: (s, L) => mus(L.hip, L.knee, 6.6, 4.6, 0.14, 0.96, -1.5),
  ham: (s, L) => mus(L.hip, L.knee, 5.8, 4.2, 0.18, 0.92, 2),
  glute: (s, L) => mus(L.hip, L.knee, 6.8, 5.4, -0.1, 0.22, 2.6),
  calf: (s, L) => mus(L.knee, L.ankle, 4.7, 2.6, 0.04, 0.6, 1.6),
};

/** Lato vicino e, nelle viste frontali, anche quello lontano. */
function sides(sk, front) {
  const near = { sh: sk.shR, elbow: sk.elbow, hand: sk.hand, hip: sk.hipR, knee: sk.knee, ankle: sk.ankle };
  if (!front) return [near];
  return [{ sh: sk.shL, elbow: sk.elbow2, hand: sk.hand2, hip: sk.hipL, knee: sk.knee2, ankle: sk.ankle2 }, near];
}

/** Non si ripetono a destra e a sinistra. */
const CENTRALI = new Set(['pec', 'lat', 'abs']);
/** Descrivono il profilo del tronco: di fronte farebbero una macchia centrale. */
const SOLO_PROFILO = new Set(['pec', 'lat']);

/** Ordine di disegno: prima i piani profondi, poi quelli in rilievo. */
const SHAPE_ORDER = ['glute', 'ham', 'quad', 'calf', 'lat', 'pec', 'abs', 'trap', 'tri', 'bi', 'delt', 'fore'];

/** Dal muscolo dell'esercizio al gruppo da accendere. */
const FOCUS = {
  petto: ['pec'], dorso: ['lat'], spalle: ['delt'], trapezi: ['trap'],
  bicipiti: ['bi'], tricipiti: ['tri'], avambracci: ['fore'],
  quadricipiti: ['quad'], femorali: ['ham'], glutei: ['glute'], polpacci: ['calf'],
  addome: ['abs'], lombari: ['lat'], adduttori: ['quad'], abduttori: ['quad'],
};

/* ------------------------------------------------------------ rendering -- */

function line(parent, cls, w) {
  const e = document.createElementNS(NS, 'line');
  e.setAttribute('stroke-linecap', 'round');
  e.setAttribute('stroke-width', w);
  e.setAttribute('class', cls);
  parent.appendChild(e);
  return e;
}
function setLine(e, a, b) {
  e.setAttribute('x1', a[0].toFixed(1)); e.setAttribute('y1', a[1].toFixed(1));
  e.setAttribute('x2', b[0].toFixed(1)); e.setAttribute('y2', b[1].toFixed(1));
}
function circ(parent, cls, r) {
  const e = document.createElementNS(NS, 'circle');
  e.setAttribute('r', r);
  e.setAttribute('class', cls);
  parent.appendChild(e);
  return e;
}
function setC(e, p) { e.setAttribute('cx', p[0].toFixed(1)); e.setAttribute('cy', p[1].toFixed(1)); }
function pathEl(parent, cls) {
  const e = document.createElementNS(NS, 'path');
  e.setAttribute('class', cls);
  parent.appendChild(e);
  return e;
}
/* Attrezzi che hanno un telaio: solo per questi si disegnano leve e cuscinetti. */
const MACH = new Set(['macchina', 'cavi', 'smith']);

/** Crea il nodo SVG di un prop; ritorna {node, update(sk)}. */
function makeProp(g, spec, eq) {
  const at = (sk, key) => (Array.isArray(key) ? key : sk[key]);
  switch (spec.t) {
    case 'floor': {
      const e = line(g, 'p-floor', 2.5);
      setLine(e, [8, FLOOR + 3], [192, FLOOR + 3]);
      return null;
    }
    case 'bar-fixed': {
      const e = line(g, 'p-eq', 4);
      setLine(e, [52, spec.y], [148, spec.y]);
      const l = line(g, 'p-eq', 3);
      setLine(l, [56, spec.y], [56, 8]);
      const r = line(g, 'p-eq', 3);
      setLine(r, [144, spec.y], [144, 8]);
      return null;
    }
    case 'bench': { const e = line(g, 'p-eq', 7); setLine(e, spec.from, spec.to);
      const l1 = line(g, 'p-eq', 3.5); setLine(l1, [spec.from[0] + 6, spec.from[1] + 3], [spec.from[0] + 6, FLOOR]);
      const l2 = line(g, 'p-eq', 3.5); setLine(l2, [spec.to[0] - 6, spec.to[1] + 3], [spec.to[0] - 6, FLOOR]);
      return null; }
    case 'benchInc': { const e = line(g, 'p-eq', 7); setLine(e, spec.from, spec.to);
      const l1 = line(g, 'p-eq', 3.5); setLine(l1, [spec.from[0] - 4, spec.from[1]], [spec.from[0] - 4, FLOOR]);
      return null; }
    case 'seat': { const e = line(g, 'p-eq', 7); setLine(e, [spec.at[0] - 18, spec.at[1]], [spec.at[0] + 14, spec.at[1]]);
      const l = line(g, 'p-eq', 3.5); setLine(l, [spec.at[0], spec.at[1]], [spec.at[0], FLOOR]);
      return null; }
    case 'pad': { const e = line(g, 'p-eq', 8); setLine(e, spec.from, spec.to); return null; }
    case 'rail': { const e = line(g, 'p-eq', 4); setLine(e, [spec.at[0] - 14, spec.at[1]], [spec.at[0] + 24, spec.at[1]]);
      const l = line(g, 'p-eq', 3.5); setLine(l, [spec.at[0] + 20, spec.at[1]], [spec.at[0] + 20, FLOOR]);
      return null; }
    case 'box': { const e = document.createElementNS(NS, 'rect');
      e.setAttribute('x', spec.at[0] - 16); e.setAttribute('y', spec.at[1]);
      e.setAttribute('width', 36); e.setAttribute('height', FLOOR - spec.at[1]);
      e.setAttribute('rx', 3); e.setAttribute('class', 'p-eq-f'); g.appendChild(e); return null; }
    case 'sledBox': { const e = document.createElementNS(NS, 'rect');
      e.setAttribute('x', spec.at[0]); e.setAttribute('y', spec.at[1]);
      e.setAttribute('width', 26); e.setAttribute('height', 18);
      e.setAttribute('rx', 3); e.setAttribute('class', 'p-eq-f'); g.appendChild(e); return null; }
    case 'disc': {
      const c = circ(g, 'p-w', spec.r || 9);
      const i = circ(g, 'p-w-i', 2.6);
      return (sk) => { setC(c, at(sk, spec.at)); setC(i, at(sk, spec.at)); };
    }
    case 'bar': {
      const w = spec.w || 22;
      const b = line(g, 'p-w-l', 3.2);
      const c1 = circ(g, 'p-w', 7), c2 = circ(g, 'p-w', 7);
      return (sk) => {
        const p = at(sk, spec.at);
        setLine(b, [p[0] - w / 2, p[1]], [p[0] + w / 2, p[1]]);
        setC(c1, [p[0] - w / 2, p[1]]); setC(c2, [p[0] + w / 2, p[1]]);
      };
    }
    case 'bar2': {
      const b = line(g, 'p-w-l', 3.2);
      const c1 = circ(g, 'p-w', 6), c2 = circ(g, 'p-w', 6);
      return (sk) => {
        const p = sk[spec.a], q = sk[spec.b];
        setLine(b, [p[0] - 14, p[1]], [q[0] + 14, q[1]]);
        setC(c1, [p[0] - 14, p[1]]); setC(c2, [q[0] + 14, q[1]]);
      };
    }
    case 'db': {
      const b = line(g, 'p-w-l', 3), c1 = circ(g, 'p-w', 4.6), c2 = circ(g, 'p-w', 4.6);
      return (sk) => {
        const p = at(sk, spec.at);
        setLine(b, [p[0] - 5, p[1]], [p[0] + 5, p[1]]);
        setC(c1, [p[0] - 6, p[1]]); setC(c2, [p[0] + 6, p[1]]);
      };
    }
    case 'cable': {
      if (!['cavi', 'macchina', 'elastico'].includes(eq)) return null;
      const c = line(g, 'p-cable', 1.8);
      const pulley = circ(g, 'p-eq-f', 4.5);
      setC(pulley, spec.from);
      const post = line(g, 'p-eq', 3);
      setLine(post, [spec.from[0], spec.from[1]], [spec.from[0], FLOOR]);
      return (sk) => setLine(c, spec.from, at(sk, spec.to === 'hand2' ? 'hand2' : 'hand'));
    }
    case 'roll': {
      const c = circ(g, 'p-eq-f', 6);
      return (sk) => setC(c, at(sk, spec.at));
    }
    /* Telaio: la spezzata di montanti e traverse che regge i perni. */
    case 'frame': {
      if (!MACH.has(eq)) return null;
      for (let i = 1; i < spec.pts.length; i++) setLine(line(g, 'p-eq', spec.w || 3), spec.pts[i - 1], spec.pts[i]);
      return null;
    }
    /* Braccio della macchina: perno fisso sul telaio, asta fino al punto di
       presa. È questo che dice che la mano non regge un peso libero ma muove
       la leva della macchina. */
    case 'lever': {
      if (!MACH.has(eq)) return null;
      const arm = line(g, 'p-eq', spec.w || 3.4);
      setC(circ(g, 'p-eq-f', 2.6), spec.at);
      return (sk) => {
        const p = at(sk, spec.to);
        const dx = p[0] - spec.at[0], dy = p[1] - spec.at[1];
        const d = Math.hypot(dx, dy) || 1, e = spec.ext || 0;
        setLine(arm, spec.at, [p[0] + (dx / d) * e, p[1] + (dy / d) * e]);
      };
    }
    /* Cuscinetto che preme su un arto: spalle dell'hack squat, braccia della
       macchina per le alzate laterali, gomiti del pullover. */
    case 'cuff': {
      if (!MACH.has(eq)) return null;
      const padL = line(g, 'p-eq', spec.w || 6.5);
      return (sk) => {
        const a2 = at(sk, spec.at), b2 = at(sk, spec.from);
        const dx = a2[0] - b2[0], dy = a2[1] - b2[1], d = Math.hypot(dx, dy) || 1;
        const ux = dx / d, uy = dy / d, h = (spec.len || 12) / 2, o = spec.off || 0;
        const c = [a2[0] + ux * o, a2[1] + uy * o];
        setLine(padL, [c[0] - uy * h, c[1] + ux * h], [c[0] + uy * h, c[1] - ux * h]);
      };
    }
    case 'wheel': {
      const c = circ(g, 'p-w', spec.r || 8);
      if (Array.isArray(spec.at)) { setC(c, spec.at); return null; }
      return (sk) => setC(c, at(sk, spec.at));
    }
    case 'plate': {
      const e = line(g, 'p-w-l', 8);
      return (sk) => { const p = at(sk, spec.at); setLine(e, [p[0] - 4, p[1] - 14], [p[0] + 4, p[1] + 16]); };
    }
    /* Il pattern dice cosa fa il corpo; l'attrezzo lo dice l'esercizio.
       `load` disegna manubri, bilanciere, EZ, kettlebell, maniglia o niente. */
    case 'load': {
      if (eq === 'corpo' || eq === 'elastico' || eq === 'cardio') return null;
      const pt = eq === 'manubri' && spec.atDb ? spec.atDb : spec.at;
      const pt2 = eq === 'manubri' && spec.atDb ? null : spec.at2;

      if (eq === 'manubri') {
        const mk = () => {
          const b = line(g, 'p-w-l', 3), c1 = circ(g, 'p-w', 4.6), c2 = circ(g, 'p-w', 4.6);
          return (p) => { setLine(b, [p[0] - 5, p[1]], [p[0] + 5, p[1]]); setC(c1, [p[0] - 6, p[1]]); setC(c2, [p[0] + 6, p[1]]); };
        };
        const u1 = mk(), u2 = spec.at2 ? mk() : null;
        return (sk) => { u1(at(sk, pt)); if (u2) u2(at(sk, spec.at2)); };
      }
      if (eq === 'kettlebell') {
        const body = circ(g, 'p-w', 6.4);
        const handle = pathEl(g, 'p-w-h');
        return (sk) => {
          const p = at(sk, pt);
          setC(body, [p[0], p[1] + 7]);
          handle.setAttribute('d', `M${(p[0] - 4).toFixed(1)} ${(p[1] + 3).toFixed(1)}`
            + `A4.6 4.6 0 1 1 ${(p[0] + 4).toFixed(1)} ${(p[1] + 3).toFixed(1)}`);
        };
      }
      if (spec.style === 'disc') {                       // bilanciere visto di punta
        const c = circ(g, 'p-w', 9), i = circ(g, 'p-w-i', 2.6);
        return (sk) => { const p = at(sk, pt); setC(c, p); setC(i, p); };
      }
      /* Cavo o macchina: in mano non c'è un peso ma un'impugnatura, e
         l'impugnatura è sempre attaccata a qualcosa. Niente dischi alle
         estremità (erano la ragione per cui sembrava un manubrio) e asse
         perpendicolare al tiro, come una maniglia che si impugna davvero.
         `cable` disegna anche il cavo, `pull` dice solo da che parte tira. */
      if (eq === 'cavi' || eq === 'macchina') {
        const grip = line(g, 'p-w-l', 5.2);
        const cab = spec.cable ? line(g, 'p-cable', 1.8) : null;
        if (cab) setC(circ(g, 'p-eq-f', 4), spec.cable);
        return (sk) => {
          const p = at(sk, pt);
          const anc = spec.cable || spec.pull || [p[0], p[1] - 40];
          const dx = anc[0] - p[0], dy = anc[1] - p[1], d = Math.hypot(dx, dy) || 1;
          const h = (spec.w || 11) / 2;
          setLine(grip, [p[0] + (dy / d) * h, p[1] - (dx / d) * h], [p[0] - (dy / d) * h, p[1] + (dx / d) * h]);
          if (cab) setLine(cab, spec.cable, p);
        };
      }
      // bilanciere, multipower, EZ
      const w = eq === 'ez' ? 14 : spec.w || 22;
      const guide = eq === 'smith' && spec.rails ? spec.rails : null;
      const b = line(g, 'p-w-l', 3.2);
      const c1 = circ(g, 'p-w', 7), c2 = circ(g, 'p-w', 7);
      return (sk) => {
        const p = pt2 ? lerpP(at(sk, pt), at(sk, pt2), 0.5) : at(sk, pt);
        const half = (pt2 ? Math.hypot(at(sk, pt)[0] - at(sk, pt2)[0], at(sk, pt)[1] - at(sk, pt2)[1]) / 2 + 8 : w / 2);
        const x1 = guide ? guide[0] : p[0] - half, x2 = guide ? guide[1] : p[0] + half;
        setLine(b, [x1, p[1]], [x2, p[1]]);
        setC(c1, [x1, p[1]]); setC(c2, [x2, p[1]]);
      };
    }
    /* Telaio: colonna e pacco pesi per le macchine, guide per il multipower. */
    case 'rig': {
      if (!['macchina', 'cavi', 'smith'].includes(eq)) return null;
      if (eq === 'smith') {
        for (const x of spec.rails || [66, 150]) { const r = line(g, 'p-eq', 3); setLine(r, [x, 12], [x, FLOOR]); }
        return null;
      }
      const x = spec.at[0], top = spec.at[1];
      const col = line(g, 'p-eq', 3.5); setLine(col, [x, top], [x, FLOOR]);
      const stack = document.createElementNS(NS, 'rect');
      stack.setAttribute('x', x - 7); stack.setAttribute('y', top + 26);
      stack.setAttribute('width', 14); stack.setAttribute('height', FLOOR - top - 30);
      stack.setAttribute('rx', 2); stack.setAttribute('class', 'p-eq-f');
      g.appendChild(stack);
      for (let i = 1; i < 5; i++) {
        const l = line(g, 'p-eq', 1); setLine(l, [x - 7, top + 26 + i * (FLOOR - top - 30) / 5], [x + 7, top + 26 + i * (FLOOR - top - 30) / 5]);
      }
      return null;
    }
    default: return null;
  }
}


/* --------------------------------------------------------------- loop ---- */

const registry = new Set();
let rafId = null;

function tick(now) {
  rafId = requestAnimationFrame(tick);
  if (document.hidden) return;
  for (const f of registry) {
    try { f.frame(now); } catch (e) { registry.delete(f); console.warn('figura disattivata', e); }
  }
}

function ensureLoop() { if (!rafId) rafId = requestAnimationFrame(tick); }

/** easing in-out */
const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Monta una figura animata dentro `host`.
 * @param src chiave del pattern, oppure l'esercizio (per evidenziare il muscolo).
 */
export function mountFigure(host, src, { period = 2600, cls = 'exfig', cue = true, phase = null } = {}) {
  const key = typeof src === 'string' ? src : src?.p;
  let muscles = typeof src === 'string' ? [] : src?.m || [];
  let eq = typeof src === 'string' ? 'bilanciere' : src?.eq || 'bilanciere';

  host.innerHTML = '';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 145');
  svg.setAttribute('class', cls);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  host.appendChild(svg);

  const gProps = document.createElementNS(NS, 'g');
  const gBack = document.createElementNS(NS, 'g');
  const gBody = document.createElementNS(NS, 'g');
  const gFront = document.createElementNS(NS, 'g');
  const gFocus = document.createElementNS(NS, 'g');
  const gWeights = document.createElementNS(NS, 'g');
  const gCue = document.createElementNS(NS, 'g');
  svg.append(gProps, gBack, gBody, gFront, gFocus, gWeights, gCue);

  let pat = patternOf(key, eq);
  let propUpd = [];

  const shadow = document.createElementNS(NS, 'ellipse');
  shadow.setAttribute('class', 'b-shadow');
  shadow.setAttribute('ry', 1.8);
  gProps.appendChild(shadow);

  // arto posteriore (più tenue): sta dietro al tronco
  const bArm = pathEl(gBack, 'b-fill-d'), bFore = pathEl(gBack, 'b-fill-d'), bHand = circ(gBack, 'b-fill-d', R.hand - 0.3);
  const bThigh = pathEl(gBack, 'b-fill-d'), bShin = pathEl(gBack, 'b-fill-d'), bFoot = pathEl(gBack, 'b-fill-d');
  // tronco, collo, testa
  const torsoP = pathEl(gBody, 'b-fill');
  const neckP = pathEl(gBody, 'b-fill');
  const headE = document.createElementNS(NS, 'ellipse');
  headE.setAttribute('class', 'b-head');
  headE.setAttribute('rx', R.head[0]); headE.setAttribute('ry', R.head[1]);
  gBody.appendChild(headE);
  // arto anteriore
  const fArm = pathEl(gFront, 'b-fill'), fFore = pathEl(gFront, 'b-fill'), fHand = circ(gFront, 'b-fill', R.hand);
  const fThigh = pathEl(gFront, 'b-fill'), fShin = pathEl(gFront, 'b-fill'), fFoot = pathEl(gFront, 'b-fill');
  // anatomia: un contorno per gruppo, più il gruppo acceso ridisegnato pieno
  // due copie per gruppo: nelle viste frontali servono destra e sinistra
  const musEl = Object.fromEntries(SHAPE_ORDER.map((k) => [k, [pathEl(gFocus, 'b-mus'), pathEl(gFocus, 'b-mus')]]));
  const focusEls = [pathEl(gFocus, 'b-focus'), pathEl(gFocus, 'b-focus')];
  // guida della schiena neutra
  const spineL = line(gCue, 'b-spine', 1.6);

  function build() {
    gProps.innerHTML = '';
    gProps.appendChild(shadow);
    gWeights.innerHTML = '';
    propUpd = [];
    for (const spec of pat.props || []) {
      const davanti = spec.front || ['disc', 'bar', 'bar2', 'db', 'plate', 'wheel', 'load'].includes(spec.t);
      const target = davanti ? gWeights : gProps;
      const u = makeProp(target, spec, eq);
      if (u) propUpd.push(u);
    }
    spineL.style.display = cue && pat.spine ? '' : 'none';
  }
  build();

  const start = performance.now() + Math.random() * 400;

  function frame(now) {
    // phase fissa: figura immobile a un punto preciso del movimento (anteprime)
    const p = phase == null ? (((now - start) % period) + period) % period / period : phase;
    // concentrica 42% / fermo breve / eccentrica / fermo
    let t;
    if (p < 0.42) t = easeIO(p / 0.42);
    else if (p < 0.5) t = 1;
    else if (p < 0.94) t = 1 - easeIO((p - 0.5) / 0.44);
    else t = 0;

    const pose = poseAt(pat, t);
    const sk = skeleton(pose);

    // tronco: capsula di profilo, trapezio arrotondato di fronte
    const front = pose.sw > 0;
    for (const e of [bArm, bFore, bHand, bThigh, bShin, bFoot]) {
      e.setAttribute('class', front ? 'b-fill-s' : 'b-fill-d');
    }
    if (front) {
      // di fronte il tronco è un poligono con la vita rientrante, non una lastra
      const wy = lerpP(sk.sh, sk.hip, 0.6);
      const ww = Math.min(pose.sw, pose.hw) * 0.42;
      const pt = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;
      torsoP.setAttribute('d',
        `M${pt(sk.shL[0], sk.shL[1])}L${pt(sk.shR[0], sk.shR[1])}L${pt(wy[0] + ww, wy[1])}`
        + `L${pt(sk.hipR[0], sk.hipR[1])}L${pt(sk.hipL[0], sk.hipL[1])}L${pt(wy[0] - ww, wy[1])}Z`);
      torsoP.setAttribute('class', 'b-fill b-torso-wide');
    } else {
      torsoP.setAttribute('d', capsule(sk.hip, sk.sh, R.torso[0], R.torso[1]));
      torsoP.setAttribute('class', 'b-fill');
    }
    neckP.setAttribute('d', capsule(sk.sh, sk.neck, R.neck + 1.2, R.neck));
    setC(headE, sk.head);
    headE.setAttribute('transform', `rotate(${(-(sk.headDeg + 90)).toFixed(1)} ${sk.head[0].toFixed(1)} ${sk.head[1].toFixed(1)})`);

    fArm.setAttribute('d', capsule(sk.shR, sk.elbow, R.arm[0], R.arm[1]));
    fFore.setAttribute('d', capsule(sk.elbow, sk.hand, R.fore[0], R.fore[1]));
    setC(fHand, sk.hand);
    bArm.setAttribute('d', capsule(sk.shL, sk.elbow2, R.arm[0], R.arm[1]));
    bFore.setAttribute('d', capsule(sk.elbow2, sk.hand2, R.fore[0], R.fore[1]));
    setC(bHand, sk.hand2);

    fThigh.setAttribute('d', capsule(sk.hipR, sk.knee, R.thigh[0], R.thigh[1]));
    fShin.setAttribute('d', capsule(sk.knee, sk.ankle, R.shin[0], R.shin[1]));
    fFoot.setAttribute('d', capsule(sk.ankle, sk.toe, R.foot[0], R.foot[1]));
    bThigh.setAttribute('d', capsule(sk.hipL, sk.knee2, R.thigh[0], R.thigh[1]));
    bShin.setAttribute('d', capsule(sk.knee2, sk.ankle2, R.shin[0], R.shin[1]));
    bFoot.setAttribute('d', capsule(sk.ankle2, sk.toe2, R.foot[0], R.foot[1]));

    const acceso = cue ? FOCUS[muscles[0]] || [] : [];
    const lati = sides(sk, front);
    for (const k of SHAPE_ORDER) {
      const doppio = !CENTRALI.has(k);
      const on = acceso.includes(k);
      const ok = !(front && SOLO_PROFILO.has(k));
      musEl[k].forEach((el, n) => {
        const L = lati[doppio ? n : lati.length - 1];
        const usa = ok && L && (doppio || n === lati.length - 1);
        el.style.display = usa && !on ? '' : 'none';
        if (usa) el.setAttribute('d', SHAPES[k](sk, L));
      });
    }
    const k0 = acceso[0];
    focusEls.forEach((el, n) => {
      const doppio = k0 && !CENTRALI.has(k0);
      const L = lati[doppio ? n : lati.length - 1];
      const usa = k0 && L && (doppio || n === lati.length - 1);
      el.style.display = usa ? '' : 'none';
      if (usa) el.setAttribute('d', SHAPES[k0](sk, L));
    });
    if (spineL.style.display !== 'none') setLine(spineL, lerpP(sk.hip, sk.sh, -0.08), lerpP(sk.hip, sk.neck, 1.02));

    shadow.setAttribute('cx', ((sk.ankle[0] + sk.ankle2[0]) / 2).toFixed(1));
    shadow.setAttribute('cy', (FLOOR + 3.5).toFixed(1));
    shadow.setAttribute('rx', 15);

    for (const u of propUpd) u(sk);
  }

  const entry = { frame };
  registry.add(entry);
  ensureLoop();
  frame(performance.now());

  return {
    el: svg,
    setPattern(src2) {
      if (src2 && typeof src2 !== 'string') { muscles = src2.m || []; eq = src2.eq || eq; }
      pat = patternOf(typeof src2 === 'string' ? src2 : src2?.p, eq); build(); },
    destroy() { registry.delete(entry); host.innerHTML = ''; },
  };
}

/** Smonta tutte le figure (chiamato ai cambi di schermata). */
export function clearFigures() { registry.clear(); }
