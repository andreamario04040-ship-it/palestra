/**
 * Genera icone PWA + splash screen iOS senza dipendenze esterne.
 * Rasterizzazione via SDF (anti-aliasing analitico), encoding PNG con zlib nativo.
 *
 *   node tools/make-assets.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------------------------------------------------------------- PNG ---- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ----------------------------------------------------------- geometria --- */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

function sdCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}

function sdCapsule(px, py, ax, ay, bx, by, r) {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay), 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
}

/* --------------------------------------------------------------- stile --- */

const INK = [10, 11, 15];           // sfondo quasi nero
const INK_HI = [26, 30, 40];        // alto del gradiente
const LIME = [215, 255, 62];        // accento
const LIME_DEEP = [154, 230, 48];

/** Scrive un pixel con alpha-blend sopra il buffer. */
function blend(buf, i, rgb, a) {
  if (a <= 0) return;
  const inv = 1 - a;
  buf[i] = rgb[0] * a + buf[i] * inv;
  buf[i + 1] = rgb[1] * a + buf[i + 1] * inv;
  buf[i + 2] = rgb[2] * a + buf[i + 2] * inv;
  buf[i + 3] = Math.max(buf[i + 3], 255 * a);
}

/**
 * Disegna il logo (manubrio) centrato in (cx,cy) con dimensione `size` (lato).
 * `glow` aggiunge un alone lime dietro al glifo.
 */
function drawLogo(buf, W, cx, cy, size, { glow = true, rounded = false, bg = true } = {}) {
  const s = size / 2;               // mezzo lato
  const x0 = Math.max(0, Math.floor(cx - s * 1.9));
  const x1 = Math.min(W - 1, Math.ceil(cx + s * 1.9));
  const y0 = Math.max(0, Math.floor(cy - s * 1.9));
  const y1 = Math.min(buf.length / (W * 4) - 1, Math.ceil(cy + s * 1.9));
  const px = 1 / s;                 // un pixel in coordinate normalizzate

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const u = (x + 0.5 - cx) / s;  // [-1,1]
      const v = (y + 0.5 - cy) / s;
      const i = (y * W + x) * 4;

      // --- sfondo squircle ---
      if (bg) {
        const dBg = sdRoundRect(u, v, 0, 0, 1, 1, rounded ? 0.46 : 0.001);
        const aBg = clamp(0.5 - dBg / px, 0, 1);
        if (aBg > 0) {
          const t = smoothstep(-1, 1, v * 0.9 + u * 0.25);
          const rgb = [mix(INK_HI[0], INK[0], t), mix(INK_HI[1], INK[1], t), mix(INK_HI[2], INK[2], t)];
          blend(buf, i, rgb, aBg);
        }
      }

      // --- alone ---
      if (glow) {
        const g = Math.exp(-((u * u) / 0.42 + (v * v) / 0.24)) * 0.3;
        if (g > 0.004) blend(buf, i, LIME, g * (bg ? 1 : 0.55));
      }

      // --- manubrio ---
      const k = 0.78;                       // scala glifo
      const uu = u / k, vv = v / k;
      const bar = sdCapsule(uu, vv, -0.56, 0, 0.56, 0, 0.1);
      const inA = sdRoundRect(uu, vv, -0.6, 0, 0.13, 0.46, 0.075);
      const inB = sdRoundRect(uu, vv, 0.6, 0, 0.13, 0.46, 0.075);
      const outA = sdRoundRect(uu, vv, -0.84, 0, 0.11, 0.3, 0.06);
      const outB = sdRoundRect(uu, vv, 0.84, 0, 0.11, 0.3, 0.06);
      const d = Math.min(bar, inA, inB, outA, outB) * k;
      const a = clamp(0.5 - d / px, 0, 1);
      if (a > 0) {
        const t = smoothstep(-0.9, 0.9, v);
        const rgb = [mix(LIME[0], LIME_DEEP[0], t), mix(LIME[1], LIME_DEEP[1], t), mix(LIME[2], LIME_DEEP[2], t)];
        blend(buf, i, rgb, a);
      }
    }
  }
}

function newBuf(w, h, fill) {
  const b = Buffer.alloc(w * h * 4);
  if (fill) {
    for (let i = 0; i < w * h; i++) {
      b[i * 4] = fill[0]; b[i * 4 + 1] = fill[1]; b[i * 4 + 2] = fill[2]; b[i * 4 + 3] = 255;
    }
  }
  return b;
}

function save(rel, buf) {
  const p = join(ROOT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, buf);
  console.log('  ✓', rel, (buf.length / 1024).toFixed(1) + ' KB');
}

/* ---------------------------------------------------------------- icone -- */

console.log('Icone:');
for (const size of [32, 180, 192, 512]) {
  const buf = newBuf(size, size, null);
  drawLogo(buf, size, size / 2, size / 2, size, { glow: size >= 180, rounded: false });
  save(`icons/icon-${size}.png`, encodePNG(size, size, buf));
}

// maskable: logo al 62% per rispettare la safe-zone circolare di Android
{
  const size = 512;
  const buf = newBuf(size, size, INK);
  drawLogo(buf, size, size / 2, size / 2, size * 0.6, { glow: true, bg: false });
  save('icons/icon-maskable-512.png', encodePNG(size, size, buf));
}

/* -------------------------------------------------------------- splash --- */

console.log('Splash iOS:');
const SPLASH = [
  [1320, 2868], [1206, 2622], [1290, 2796], [1179, 2556],
  [1170, 2532], [1242, 2688], [1125, 2436], [1080, 2340], [828, 1792], [750, 1334],
];
for (const [w, h] of SPLASH) {
  const buf = newBuf(w, h, INK);
  drawLogo(buf, w, w / 2, h / 2, Math.min(w, h) * 0.34, { glow: true, bg: false });
  save(`icons/splash-${w}x${h}.png`, encodePNG(w, h, buf));
}

/* ----------------------------------------------------------- favicon.svg -- */

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a1e28"/><stop offset="1" stop-color="#0a0b0f"/>
    </linearGradient>
    <linearGradient id="l" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d7ff3e"/><stop offset="1" stop-color="#9ae630"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#b)"/>
  <g fill="url(#l)">
    <rect x="28" y="45" width="44" height="10" rx="5"/>
    <rect x="17.8" y="32" width="10.2" height="36" rx="3"/>
    <rect x="72" y="32" width="10.2" height="36" rx="3"/>
    <rect x="9.5" y="38.3" width="8.6" height="23.4" rx="2.5"/>
    <rect x="81.9" y="38.3" width="8.6" height="23.4" rx="2.5"/>
  </g>
</svg>`;
save('icons/favicon.svg', Buffer.from(svg));
console.log('\nFatto.');
