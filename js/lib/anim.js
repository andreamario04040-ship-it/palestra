/* =========================================================================
   Animazione esercizi.
   Figura stilizzata in SVG: le pose definiscono le posizioni di anca, caviglie
   e mani; le articolazioni intermedie (ginocchio/gomito) sono risolte con una
   IK a due segmenti. Interpolazione A->B con easing, loop in requestAnimationFrame.
   ========================================================================= */

const NS = 'http://www.w3.org/2000/svg';

/* lunghezze dei segmenti (unità del viewBox 200x145) */
const L = { thigh: 25, shin: 25, arm: 19, fore: 18, torso: 32, neck: 6, head: 8, foot: 10 };
const FLOOR = 130;

/* ------------------------------------------------------------------- IK -- */

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
  return [
    a[0] + ux * t + uy * h * sign,
    a[1] + uy * t - ux * h * sign,
    a[0] + dx, a[1] + dy, // estremo effettivo (clampato)
  ];
}

const lerp = (a, b, t) => a + (b - a) * t;
const lerpP = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/* --------------------------------------------------------------- pose ---- */

const BASE = {
  hip: [100, 80], torso: 90,
  ankle: [100, FLOOR], ankle2: null,
  hand: null, hand2: null,
  kneeS: 1, kneeS2: 1, elbowS: -1, elbowS2: 1,
  sw: 0, hw: 0,        // larghezza spalle / bacino (vista frontale)
  foot: 0, foot2: 0,   // angolo del piede (gradi, 0 = orizzontale avanti)
  head: 0,             // inclinazione testa
  dir: 1,              // verso (1 = destra)
};

/** hand può essere {rel:'shoulder', d:[dx,dy]} per restare solidale alle spalle. */
function resolveHand(h, shoulder) {
  if (!h) return null;
  if (Array.isArray(h)) return h;
  if (h.rel === 'shoulder') return [shoulder[0] + h.d[0], shoulder[1] + h.d[1]];
  if (h.rel === 'hip') return [h.d[0], h.d[1]];
  return null;
}

/* ---------------------------------------------------------- definizioni -- */
/* P(a, b, props) : a = posizione iniziale/allungata, b = finale/contratta     */

const D = (o) => ({ ...BASE, ...o });

export const PATTERNS = {
  squat: {
    a: D({ hip: [100, 78], torso: 84, hand: { rel: 'shoulder', d: [-13, 4] }, elbowS: 1 }),
    b: D({ hip: [97, 104], torso: 62, hand: { rel: 'shoulder', d: [-13, 4] }, elbowS: 1 }),
    props: [{ t: 'disc', at: 'shoulder', r: 9 }, { t: 'floor' }],
  },
  frontSquat: {
    a: D({ hip: [100, 78], torso: 88, hand: { rel: 'shoulder', d: [11, -1] }, elbowS: 1 }),
    b: D({ hip: [99, 104], torso: 72, hand: { rel: 'shoulder', d: [11, -1] }, elbowS: 1 }),
    props: [{ t: 'disc', at: 'shoulderFront', r: 9 }, { t: 'floor' }],
  },
  hinge: {
    a: D({ hip: [100, 80], torso: 86, hand: [104, 87] }),
    b: D({ hip: [76, 92], torso: 32, hand: [103, 114] }),
    props: [{ t: 'bar', at: 'hand' }, { t: 'floor' }],
  },
  horizPush: {
    a: D({ hip: [110, 100], torso: 177, ankle: [142, FLOOR], hand: [80, 86], elbowS: 1 }),
    b: D({ hip: [110, 100], torso: 177, ankle: [142, FLOOR], hand: [76, 60], elbowS: 1 }),
    props: [{ t: 'bench', from: [56, 106], to: [124, 106] }, { t: 'bar', at: 'hand' }, { t: 'floor' }],
  },
  inclinePush: {
    a: D({ hip: [116, 104], torso: 160, ankle: [142, FLOOR], hand: [82, 80], elbowS: 1 }),
    b: D({ hip: [116, 104], torso: 160, ankle: [142, FLOOR], hand: [76, 54], elbowS: 1 }),
    props: [{ t: 'benchInc', from: [124, 112], to: [66, 76] }, { t: 'bar', at: 'hand' }, { t: 'floor' }],
  },
  pushup: {
    a: D({ hip: [88, 96], torso: -6, ankle: [42, 124], hand: [124, FLOOR], elbowS: 1, kneeS: -1 }),
    b: D({ hip: [88, 112], torso: -6, ankle: [42, 124], hand: [124, FLOOR], elbowS: 1, kneeS: -1 }),
    props: [{ t: 'floor' }],
  },
  dip: {
    a: D({ hip: [100, 82], torso: 84, ankle: [80, 114], hand: [114, 86], elbowS: 1 }),
    b: D({ hip: [100, 102], torso: 80, ankle: [80, 126], hand: [114, 86], elbowS: 1 }),
    props: [{ t: 'rail', at: [114, 86] }],
  },
  vertPull: {
    a: D({ hip: [100, 98], torso: 88, ankle: [84, 124], hand: [106, 24], kneeS: -1 }),
    b: D({ hip: [100, 78], torso: 86, ankle: [84, 108], hand: [106, 24], kneeS: -1 }),
    props: [{ t: 'bar-fixed', y: 24 }],
  },
  pulldown: {
    a: D({ hip: [96, 98], torso: 96, ankle: [126, FLOOR], hand: [108, 34], kneeS: 1 }),
    b: D({ hip: [96, 98], torso: 100, ankle: [126, FLOOR], hand: [112, 62], kneeS: 1 }),
    props: [{ t: 'cable', from: [104, 10], to: 'hand' }, { t: 'bar', at: 'hand', w: 16 }, { t: 'seat', at: [96, 104] }, { t: 'floor' }],
  },
  horizPull: {
    a: D({ hip: [92, 100], torso: 80, ankle: [132, 124], hand: [152, 86], elbowS: 1, kneeS: 1 }),
    b: D({ hip: [92, 100], torso: 94, ankle: [132, 124], hand: [110, 86], elbowS: 1, kneeS: 1 }),
    props: [{ t: 'cable', from: [184, 90], to: 'hand' }, { t: 'seat', at: [92, 106] }, { t: 'floor' }],
  },
  bentRow: {
    a: D({ hip: [86, 86], torso: 36, ankle: [92, FLOOR], hand: [118, 106] }),
    b: D({ hip: [86, 86], torso: 36, ankle: [92, FLOOR], hand: [112, 80] }),
    props: [{ t: 'bar', at: 'hand' }, { t: 'floor' }],
  },
  oneArmRow: {
    a: D({ hip: [84, 88], torso: 32, ankle: [88, FLOOR], hand: [118, 110], hand2: [140, 96], elbowS2: 1 }),
    b: D({ hip: [84, 88], torso: 32, ankle: [88, FLOOR], hand: [110, 84], hand2: [140, 96], elbowS2: 1 }),
    props: [{ t: 'bench', from: [124, 98], to: [168, 98] }, { t: 'db', at: 'hand' }, { t: 'floor' }],
  },
  vertPush: {
    a: D({ hip: [100, 80], torso: 90, hand: [112, 62], elbowS: 1 }),
    b: D({ hip: [100, 78], torso: 90, hand: [104, 14], elbowS: 1 }),
    props: [{ t: 'bar', at: 'hand' }, { t: 'floor' }],
  },
  lateralRaise: {
    a: D({ sw: 26, hw: 16, hip: [100, 80], hand: [116, 84], hand2: [84, 84], ankle: [108, FLOOR], ankle2: [92, FLOOR], elbowS: 1, elbowS2: -1 }),
    b: D({ sw: 26, hw: 16, hip: [100, 80], hand: [142, 46], hand2: [58, 46], ankle: [108, FLOOR], ankle2: [92, FLOOR], elbowS: 1, elbowS2: -1 }),
    props: [{ t: 'db', at: 'hand' }, { t: 'db', at: 'hand2' }, { t: 'floor' }],
  },
  frontRaise: {
    a: D({ hip: [100, 80], hand: [106, 86] }),
    b: D({ hip: [100, 80], hand: [128, 44] }),
    props: [{ t: 'db', at: 'hand' }, { t: 'floor' }],
  },
  rearDelt: {
    a: D({ sw: 26, hw: 16, hip: [100, 92], torso: 74, hand: [112, 104], hand2: [88, 104], ankle: [112, FLOOR], ankle2: [88, FLOOR], elbowS: 1, elbowS2: -1, kneeS: 1, kneeS2: -1 }),
    b: D({ sw: 26, hw: 16, hip: [100, 92], torso: 74, hand: [148, 72], hand2: [52, 72], ankle: [112, FLOOR], ankle2: [88, FLOOR], elbowS: 1, elbowS2: -1, kneeS: 1, kneeS2: -1 }),
    props: [{ t: 'db', at: 'hand' }, { t: 'db', at: 'hand2' }, { t: 'floor' }],
  },
  facePull: {
    a: D({ hip: [100, 80], hand: [148, 54], elbowS: 1 }),
    b: D({ hip: [100, 80], hand: [112, 44], elbowS: 1 }),
    props: [{ t: 'cable', from: [188, 40], to: 'hand' }, { t: 'floor' }],
  },
  uprightRow: {
    a: D({ sw: 26, hw: 16, hip: [100, 80], hand: [110, 88], hand2: [90, 88], ankle: [108, FLOOR], ankle2: [92, FLOOR], elbowS: 1, elbowS2: -1 }),
    b: D({ sw: 26, hw: 16, hip: [100, 80], hand: [108, 50], hand2: [92, 50], ankle: [108, FLOOR], ankle2: [92, FLOOR], elbowS: 1, elbowS2: -1 }),
    props: [{ t: 'bar2', a: 'hand', b: 'hand2' }, { t: 'floor' }],
  },
  shrug: {
    a: D({ hip: [100, 82], hand: [104, 90] }),
    b: D({ hip: [100, 78], hand: [104, 84] }),
    props: [{ t: 'bar', at: 'hand' }, { t: 'floor' }],
  },
  curl: {
    a: D({ hip: [100, 80], hand: [104, 86], elbowS: -1 }),
    b: D({ hip: [100, 80], hand: [108, 54], elbowS: -1 }),
    props: [{ t: 'bar', at: 'hand', w: 14 }, { t: 'floor' }],
  },
  skull: {
    a: D({ hip: [110, 100], torso: 177, ankle: [142, FLOOR], hand: [60, 74], elbowS: 1 }),
    b: D({ hip: [110, 100], torso: 177, ankle: [142, FLOOR], hand: [74, 58], elbowS: 1 }),
    props: [{ t: 'bench', from: [56, 106], to: [124, 106] }, { t: 'bar', at: 'hand', w: 14 }, { t: 'floor' }],
  },
  tricepsExt: {
    a: D({ hip: [100, 80], hand: [82, 36], elbowS: 1 }),
    b: D({ hip: [100, 80], hand: [104, 14], elbowS: 1 }),
    props: [{ t: 'db', at: 'hand' }, { t: 'floor' }],
  },
  pushdown: {
    a: D({ hip: [100, 80], hand: [110, 64], elbowS: 1 }),
    b: D({ hip: [100, 80], hand: [112, 92], elbowS: 1 }),
    props: [{ t: 'cable', from: [124, 12], to: 'hand' }, { t: 'floor' }],
  },
  kickback: {
    a: D({ hip: [88, 88], torso: 34, ankle: [92, FLOOR], hand: [112, 94], elbowS: 1 }),
    b: D({ hip: [88, 88], torso: 34, ankle: [92, FLOOR], hand: [88, 80], elbowS: 1 }),
    props: [{ t: 'db', at: 'hand' }, { t: 'floor' }],
  },
  legPress: {
    a: D({ hip: [78, 98], torso: 203, ankle: [112, 72], ankle2: [112, 86], kneeS: -1, kneeS2: -1, hand: [96, 112], elbowS: 1 }),
    b: D({ hip: [78, 98], torso: 203, ankle: [146, 44], ankle2: [146, 58], kneeS: -1, kneeS2: -1, hand: [96, 112], elbowS: 1 }),
    props: [{ t: 'pad', from: [86, 108], to: [48, 124] }, { t: 'plate', at: 'ankle', w: 30 }],
  },
  legExtension: {
    a: D({ hip: [92, 94], torso: 96, ankle: [114, 124], hand: [78, 100], kneeS: 1, elbowS: 1 }),
    b: D({ hip: [92, 94], torso: 96, ankle: [148, 98], hand: [78, 100], kneeS: 1, elbowS: 1 }),
    props: [{ t: 'seat', at: [92, 100] }, { t: 'roll', at: 'ankle' }, { t: 'floor' }],
  },
  legCurl: {
    a: D({ hip: [104, 102], torso: 186, ankle: [150, 104], hand: [68, 108], kneeS: -1, elbowS: 1 }),
    b: D({ hip: [104, 102], torso: 186, ankle: [122, 70], hand: [68, 108], kneeS: -1, elbowS: 1 }),
    props: [{ t: 'bench', from: [58, 110], to: [120, 110] }, { t: 'roll', at: 'ankle' }, { t: 'floor' }],
  },
  calfRaise: {
    a: D({ hip: [100, 80], ankle: [100, FLOOR], hand: [104, 88], foot: 0 }),
    b: D({ hip: [100, 68], ankle: [100, 118], hand: [104, 76], foot: -38 }),
    props: [{ t: 'floor' }],
  },
  lunge: {
    a: D({ hip: [100, 84], torso: 86, ankle: [126, FLOOR], ankle2: [74, FLOOR], hand: [104, 90], hand2: [96, 90] }),
    b: D({ hip: [100, 104], torso: 84, ankle: [126, FLOOR], ankle2: [70, 126], kneeS2: -1, hand: [104, 110], hand2: [96, 110] }),
    props: [{ t: 'db', at: 'hand' }, { t: 'db', at: 'hand2' }, { t: 'floor' }],
  },
  stepUp: {
    a: D({ hip: [92, 90], torso: 86, ankle: [120, 108], ankle2: [76, FLOOR], hand: [96, 96], hand2: [88, 96] }),
    b: D({ hip: [110, 70], torso: 88, ankle: [120, 108], ankle2: [104, 112], kneeS2: -1, hand: [114, 76], hand2: [106, 76] }),
    props: [{ t: 'box', at: [120, 108] }, { t: 'db', at: 'hand' }, { t: 'db', at: 'hand2' }, { t: 'floor' }],
  },
  hipThrust: {
    a: D({ hip: [112, 116], torso: 158, ankle: [148, FLOOR], hand: { rel: 'shoulder', d: [6, -6] }, kneeS: -1, elbowS: 1 }),
    b: D({ hip: [112, 92], torso: 178, ankle: [148, FLOOR], hand: { rel: 'shoulder', d: [6, -6] }, kneeS: -1, elbowS: 1 }),
    props: [{ t: 'bench', from: [52, 100], to: [92, 100] }, { t: 'disc', at: 'hip', r: 9 }, { t: 'floor' }],
  },
  hyperextension: {
    a: D({ hip: [100, 92], torso: 22, ankle: [74, 122], hand: { rel: 'shoulder', d: [2, 10] }, kneeS: -1, elbowS: 1 }),
    b: D({ hip: [100, 92], torso: 76, ankle: [74, 122], hand: { rel: 'shoulder', d: [2, 10] }, kneeS: -1, elbowS: 1 }),
    props: [{ t: 'pad', from: [96, 98], to: [78, 118] }, { t: 'floor' }],
  },
  abduction: {
    a: D({ sw: 24, hw: 18, hip: [100, 94], ankle: [108, 124], ankle2: [92, 124], hand: [114, 100], hand2: [86, 100], elbowS: 1, elbowS2: -1, kneeS: 1, kneeS2: -1 }),
    b: D({ sw: 24, hw: 18, hip: [100, 94], ankle: [138, 122], ankle2: [62, 122], hand: [114, 100], hand2: [86, 100], elbowS: 1, elbowS2: -1, kneeS: 1, kneeS2: -1 }),
    props: [{ t: 'seat', at: [100, 102] }, { t: 'floor' }],
  },
  adduction: {
    a: D({ sw: 24, hw: 18, hip: [100, 94], ankle: [138, 122], ankle2: [62, 122], hand: [114, 100], hand2: [86, 100], elbowS: 1, elbowS2: -1, kneeS: 1, kneeS2: -1 }),
    b: D({ sw: 24, hw: 18, hip: [100, 94], ankle: [108, 124], ankle2: [92, 124], hand: [114, 100], hand2: [86, 100], elbowS: 1, elbowS2: -1, kneeS: 1, kneeS2: -1 }),
    props: [{ t: 'seat', at: [100, 102] }, { t: 'floor' }],
  },
  fly: {
    a: D({ hip: [110, 100], torso: 177, ankle: [142, FLOOR], hand: [92, 92], elbowS: 1 }),
    b: D({ hip: [110, 100], torso: 177, ankle: [142, FLOOR], hand: [74, 56], elbowS: 1 }),
    props: [{ t: 'bench', from: [56, 106], to: [124, 106] }, { t: 'db', at: 'hand' }, { t: 'floor' }],
  },
  flyCable: {
    a: D({ sw: 26, hw: 16, hip: [100, 82], hand: [154, 48], hand2: [46, 48], ankle: [108, FLOOR], ankle2: [92, FLOOR], elbowS: 1, elbowS2: -1 }),
    b: D({ sw: 26, hw: 16, hip: [100, 82], hand: [106, 86], hand2: [94, 86], ankle: [108, FLOOR], ankle2: [92, FLOOR], elbowS: 1, elbowS2: -1 }),
    props: [{ t: 'cable', from: [186, 20], to: 'hand' }, { t: 'cable', from: [14, 20], to: 'hand2' }, { t: 'floor' }],
  },
  pullover: {
    a: D({ hip: [110, 100], torso: 177, ankle: [142, FLOOR], hand: [48, 72], elbowS: 1 }),
    b: D({ hip: [110, 100], torso: 177, ankle: [142, FLOOR], hand: [78, 56], elbowS: 1 }),
    props: [{ t: 'bench', from: [56, 106], to: [124, 106] }, { t: 'db', at: 'hand' }, { t: 'floor' }],
  },
  crunch: {
    a: D({ hip: [112, 112], torso: 188, ankle: [146, 126], hand: { rel: 'shoulder', d: [10, -4] }, kneeS: -1, elbowS: 1 }),
    b: D({ hip: [112, 112], torso: 148, ankle: [146, 126], hand: { rel: 'shoulder', d: [10, -4] }, kneeS: -1, elbowS: 1 }),
    props: [{ t: 'floor' }],
  },
  legRaise: {
    a: D({ hip: [100, 94], torso: 88, ankle: [96, 126], hand: [106, 24], kneeS: -1 }),
    b: D({ hip: [100, 94], torso: 88, ankle: [148, 74], hand: [106, 24], kneeS: 1 }),
    props: [{ t: 'bar-fixed', y: 24 }],
  },
  plank: {
    a: D({ hip: [96, 104], torso: -8, ankle: [46, 124], hand: [136, 126], elbowS: 1, kneeS: -1 }),
    b: D({ hip: [96, 107], torso: -8, ankle: [46, 126], hand: [136, 126], elbowS: 1, kneeS: -1 }),
    props: [{ t: 'floor' }],
  },
  mountain: {
    a: D({ hip: [96, 104], torso: -8, ankle: [46, 124], ankle2: [50, 126], hand: [136, 128], elbowS: 1, kneeS: -1, kneeS2: -1 }),
    b: D({ hip: [96, 104], torso: -8, ankle: [92, 118], ankle2: [50, 126], hand: [136, 128], elbowS: 1, kneeS: -1, kneeS2: -1 }),
    props: [{ t: 'floor' }],
  },
  twist: {
    a: D({ sw: 24, hw: 18, hip: [100, 100], torso: 66, ankle: [128, 118], ankle2: [134, 122], hand: [70, 84], hand2: [78, 86], elbowS: 1, elbowS2: 1, kneeS: -1, kneeS2: -1 }),
    b: D({ sw: 24, hw: 18, hip: [100, 100], torso: 66, ankle: [128, 118], ankle2: [134, 122], hand: [128, 84], hand2: [136, 86], elbowS: -1, elbowS2: -1, kneeS: -1, kneeS2: -1 }),
    props: [{ t: 'floor' }],
  },
  abwheel: {
    a: D({ hip: [104, 110], torso: 52, ankle: [86, 126], hand: [126, 124], kneeS: -1, elbowS: 1 }),
    b: D({ hip: [104, 112], torso: 14, ankle: [86, 126], hand: [172, 126], kneeS: -1, elbowS: 1 }),
    props: [{ t: 'wheel', at: 'hand' }, { t: 'floor' }],
  },
  wristCurl: {
    a: D({ hip: [94, 98], torso: 92, ankle: [122, 126], hand: [130, 100], kneeS: 1, elbowS: 1 }),
    b: D({ hip: [94, 98], torso: 92, ankle: [122, 126], hand: [130, 90], kneeS: 1, elbowS: 1 }),
    props: [{ t: 'seat', at: [94, 104] }, { t: 'bar', at: 'hand', w: 14 }, { t: 'floor' }],
  },
  farmer: {
    a: D({ sw: 22, hw: 16, hip: [100, 80], hand: [116, 88], hand2: [84, 88], ankle: [112, 124], ankle2: [88, FLOOR], kneeS2: 1 }),
    b: D({ sw: 22, hw: 16, hip: [100, 80], hand: [116, 88], hand2: [84, 88], ankle: [88, FLOOR], ankle2: [112, 124], kneeS2: 1 }),
    props: [{ t: 'db', at: 'hand' }, { t: 'db', at: 'hand2' }, { t: 'floor' }],
  },
  cardio: {
    a: D({ hip: [100, 76], torso: 82, ankle: [124, 122], ankle2: [76, 112], hand: [82, 72], hand2: [120, 80], kneeS2: 1, elbowS: 1, elbowS2: 1 }),
    b: D({ hip: [100, 76], torso: 82, ankle: [78, 114], ankle2: [122, 120], hand: [120, 80], hand2: [82, 72], kneeS2: 1, elbowS: 1, elbowS2: 1 }),
    props: [{ t: 'floor' }],
  },
  bike: {
    a: D({ hip: [88, 92], torso: 68, ankle: [118, 102], ankle2: [104, 120], hand: [136, 76], kneeS: 1, kneeS2: 1, elbowS: 1 }),
    b: D({ hip: [88, 92], torso: 68, ankle: [104, 120], ankle2: [118, 102], hand: [136, 76], kneeS: 1, kneeS2: 1, elbowS: 1 }),
    props: [{ t: 'seat', at: [88, 98] }, { t: 'wheel', at: [112, 112], r: 13 }, { t: 'floor' }],
  },
  rowErg: {
    a: D({ hip: [92, 102], torso: 62, ankle: [128, 116], hand: [152, 92], kneeS: 1, elbowS: 1 }),
    b: D({ hip: [86, 100], torso: 108, ankle: [152, 118], hand: [102, 92], kneeS: 1, elbowS: 1 }),
    props: [{ t: 'cable', from: [188, 110], to: 'hand' }, { t: 'floor' }],
  },
  rope: {
    a: D({ sw: 22, hw: 16, hip: [100, 82], hand: [120, 86], hand2: [80, 86], ankle: [108, FLOOR], ankle2: [92, FLOOR], elbowS: 1, elbowS2: -1, kneeS: 1, kneeS2: -1 }),
    b: D({ sw: 22, hw: 16, hip: [100, 74], hand: [120, 78], hand2: [80, 78], ankle: [108, 120], ankle2: [92, 120], elbowS: 1, elbowS2: -1, kneeS: 1, kneeS2: -1 }),
    props: [{ t: 'floor' }],
  },
  burpee: {
    a: D({ hip: [100, 78], torso: 88, hand: [104, 84] }),
    b: D({ hip: [96, 108], torso: -8, ankle: [48, 126], hand: [136, 128], elbowS: 1, kneeS: -1 }),
    props: [{ t: 'floor' }],
  },
  clean: {
    a: D({ hip: [80, 94], torso: 42, ankle: [98, FLOOR], hand: [104, 114] }),
    b: D({ hip: [100, 80], torso: 90, hand: [111, 47], elbowS: 1 }),
    props: [{ t: 'bar', at: 'hand' }, { t: 'floor' }],
  },
  thruster: {
    a: D({ hip: [99, 104], torso: 72, hand: [120, 73], elbowS: 1 }),
    b: D({ hip: [100, 78], torso: 90, hand: [104, 14], elbowS: 1 }),
    props: [{ t: 'bar', at: 'hand' }, { t: 'floor' }],
  },
  sled: {
    a: D({ hip: [92, 88], torso: 40, ankle: [68, 124], ankle2: [104, FLOOR], hand: [136, 76], elbowS: 1, kneeS2: 1 }),
    b: D({ hip: [92, 88], torso: 40, ankle: [104, FLOOR], ankle2: [68, 124], hand: [136, 76], elbowS: 1, kneeS2: 1 }),
    props: [{ t: 'sledBox', at: [152, 112] }, { t: 'floor' }],
  },
  misc: {
    a: D({ hip: [100, 80], hand: [100, 86] }),
    b: D({ hip: [100, 76], hand: [100, 82] }),
    props: [{ t: 'floor' }],
  },
};

/* alias di pattern che condividono la stessa animazione */
const ALIAS = { jump: 'squat', hang: 'vertPull' };

export function patternOf(key) {
  const k = ALIAS[key] || key;
  return PATTERNS[k] || PATTERNS.misc;
}

/* ---------------------------------------------------------- scheletro ---- */

function skeleton(pose) {
  const hip = pose.hip;
  const rad = (pose.torso * Math.PI) / 180;
  const sh = [hip[0] + Math.cos(rad) * L.torso, hip[1] - Math.sin(rad) * L.torso];
  const neck = [hip[0] + Math.cos(rad) * (L.torso + L.neck), hip[1] - Math.sin(rad) * (L.torso + L.neck)];
  const head = [
    neck[0] + Math.cos(rad + (pose.head * Math.PI) / 180) * L.head,
    neck[1] - Math.sin(rad + (pose.head * Math.PI) / 180) * L.head,
  ];

  const shR = [sh[0] + pose.sw / 2, sh[1]];
  const shL = [sh[0] - pose.sw / 2, sh[1]];
  const hipR = [hip[0] + pose.hw / 2, hip[1]];
  const hipL = [hip[0] - pose.hw / 2, hip[1]];

  const hand = resolveHand(pose.hand, sh) || [shR[0], shR[1] + L.arm + L.fore];
  const hand2 = resolveHand(pose.hand2, sh) || (pose.sw ? [shL[0], shL[1] + L.arm + L.fore] : hand);
  const ankle = pose.ankle;
  const ankle2 = pose.ankle2 || (pose.hw ? [ankle[0] - pose.hw, ankle[1]] : ankle);

  const [ex, ey, hx, hy] = ik(shR, hand, L.arm, L.fore, pose.elbowS);
  const [ex2, ey2, hx2, hy2] = ik(shL, hand2, L.arm, L.fore, pose.elbowS2);
  const [kx, ky, ax, ay] = ik(hipR, ankle, L.thigh, L.shin, pose.kneeS);
  const [kx2, ky2, ax2, ay2] = ik(hipL, ankle2, L.thigh, L.shin, pose.kneeS2);

  const footEnd = (a, deg) => [a[0] + Math.cos((deg * Math.PI) / 180) * L.foot, a[1] - Math.sin((deg * Math.PI) / 180) * L.foot];

  return {
    hip, sh, neck, head, shR, shL, hipR, hipL,
    elbow: [ex, ey], hand: [hx, hy], elbow2: [ex2, ey2], hand2: [hx2, hy2],
    knee: [kx, ky], ankle: [ax, ay], knee2: [kx2, ky2], ankle2: [ax2, ay2],
    toe: footEnd([ax, ay], pose.foot), toe2: footEnd([ax2, ay2], pose.foot2),
    shoulder: sh,
    shoulderFront: [sh[0] + 9, sh[1] + 1],
  };
}

function blendPose(a, b, t) {
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

const PROP_STATIC = new Set(['floor', 'bar-fixed', 'bench', 'benchInc', 'seat', 'rail', 'box', 'pad', 'sledBox']);

/** Crea il nodo SVG di un prop; ritorna {node, update(sk)}. */
function makeProp(g, spec) {
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
    case 'wheel': {
      const c = circ(g, 'p-w', spec.r || 8);
      if (Array.isArray(spec.at)) { setC(c, spec.at); return null; }
      return (sk) => setC(c, at(sk, spec.at));
    }
    case 'plate': {
      const e = line(g, 'p-w-l', 8);
      return (sk) => { const p = at(sk, spec.at); setLine(e, [p[0] - 4, p[1] - 14], [p[0] + 4, p[1] + 16]); };
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
 * @returns {{destroy:()=>void, setPattern:(p:string)=>void}}
 */
export function mountFigure(host, patternKey, { period = 2600, cls = 'exfig' } = {}) {
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
  const gWeights = document.createElementNS(NS, 'g');
  svg.append(gProps, gBack, gBody, gFront, gWeights);

  let pat = patternOf(patternKey);
  let propUpd = [];

  // arti posteriori (tenui)
  const bUpper = line(gBack, 'b-limb-d', 7), bFore = line(gBack, 'b-limb-d', 6.2);
  const bThigh = line(gBack, 'b-limb-d', 8), bShin = line(gBack, 'b-limb-d', 7), bFoot = line(gBack, 'b-limb-d', 5.5);
  // tronco + testa
  const torso = line(gBody, 'b-torso', 12);
  const shoulderBar = line(gBody, 'b-torso', 9);
  const hipBar = line(gBody, 'b-torso', 9);
  const neckL = line(gBody, 'b-limb', 6);
  const headC = circ(gBody, 'b-head', L.head);
  // arti anteriori
  const fUpper = line(gFront, 'b-limb', 7.4), fFore = line(gFront, 'b-limb', 6.6);
  const fThigh = line(gFront, 'b-limb', 8.6), fShin = line(gFront, 'b-limb', 7.4), fFoot = line(gFront, 'b-limb', 5.8);

  function build() {
    gProps.innerHTML = '';
    gWeights.innerHTML = '';
    propUpd = [];
    for (const spec of pat.props || []) {
      const target = ['disc', 'bar', 'bar2', 'db', 'plate', 'wheel'].includes(spec.t) ? gWeights : gProps;
      const u = makeProp(target, spec);
      if (u) propUpd.push(u);
    }
  }
  build();

  const start = performance.now() + Math.random() * 400;

  function frame(now) {
    const p = (((now - start) % period) + period) % period / period;
    // concentrica 42% / isometrica breve / eccentrica
    let t;
    if (p < 0.42) t = easeIO(p / 0.42);
    else if (p < 0.5) t = 1;
    else if (p < 0.94) t = 1 - easeIO((p - 0.5) / 0.44);
    else t = 0;

    const pose = blendPose(pat.a, pat.b, t);
    const sk = skeleton(pose);

    setLine(torso, sk.hip, sk.sh);
    setLine(neckL, sk.sh, sk.neck);
    setC(headC, sk.head);
    if (pose.sw) { setLine(shoulderBar, sk.shL, sk.shR); shoulderBar.style.display = ''; } else shoulderBar.style.display = 'none';
    if (pose.hw) { setLine(hipBar, sk.hipL, sk.hipR); hipBar.style.display = ''; } else hipBar.style.display = 'none';

    setLine(fUpper, sk.shR, sk.elbow); setLine(fFore, sk.elbow, sk.hand);
    setLine(bUpper, sk.shL, sk.elbow2); setLine(bFore, sk.elbow2, sk.hand2);
    setLine(fThigh, sk.hipR, sk.knee); setLine(fShin, sk.knee, sk.ankle); setLine(fFoot, sk.ankle, sk.toe);
    setLine(bThigh, sk.hipL, sk.knee2); setLine(bShin, sk.knee2, sk.ankle2); setLine(bFoot, sk.ankle2, sk.toe2);

    for (const u of propUpd) u(sk);
  }

  const entry = { frame };
  registry.add(entry);
  ensureLoop();
  frame(performance.now());

  return {
    el: svg,
    setPattern(k) { pat = patternOf(k); build(); },
    destroy() { registry.delete(entry); host.innerHTML = ''; },
  };
}

/** Smonta tutte le figure (chiamato ai cambi di schermata). */
export function clearFigures() { registry.clear(); }
