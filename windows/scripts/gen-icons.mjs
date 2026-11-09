// Draws Plume into the PNG/ICO set Tauri needs. No dependencies: the icons are
// rasterised here and encoded with node:zlib, so the app icon stays "drawn in
// code" like the character itself.
//
//   node scripts/gen-icons.mjs

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src-tauri", "icons");

// ── Plume ─────────────────────────────────────────────────────────────────────
//
// Same geometry as src/plume/engine.ts, so the icon is the character: a soft
// superellipse of exponent 3.6 with a crest pinched into the top, two pill eyes
// on a sphere, and the three feathers each side folded at rest. The outline is
// a polygon here rather than an implicit test, because the crest is a
// deformation of the path and not of the equation.

const BASE_TOP = [237, 239, 244]; // #EDEFF4
const BASE_BOTTOM = [194, 200, 212]; // #C2C8D4
const INK = [26, 20, 18]; // #1A1412
const RIM = [97, 107, 125]; // #616B7D — Plume's slate, the engine's RIM
const WING = [107, 120, 140]; // #6B788C — the engine's WING

const SS = 4; // supersampling factor

/** Plume's outline as a polygon, in body-local coordinates. */
function outline(rx, ry, steps = 128) {
  const expN = 2.0 / 3.6;
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const x = rx * (ca >= 0 ? Math.pow(ca, expN) : -Math.pow(-ca, expN));
    let y = ry * (sa >= 0 ? Math.pow(sa, expN) : -Math.pow(-sa, expN));
    if (sa < -0.5) y -= ry * 0.14 * ((-sa - 0.5) / 0.5);
    pts.push([x, y]);
  }
  return pts;
}

function insidePolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function insidePill(x, y, w, h) {
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(hw, hh);
  const cx = Math.max(-hw + r, Math.min(hw - r, x));
  const cy = Math.max(-hh + r, Math.min(hh - r, y));
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/** A feather, as a chain of capsules along the engine's quadratic curve. */
function insideCapsule(x, y, ax, ay, bx, by, r) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
  const px = ax + dx * t - x;
  const py = ay + dy * t - y;
  return px * px + py * py <= r * r;
}

/** The six feathers folded (spread 0), mirrored, in body-local coordinates. */
function feathers(R, rx, ry) {
  const span = R * 1.05 * 0.86; // spread 0
  const out = [];
  for (const side of [-1, 1]) {
    for (let f = 0; f < 3; f++) {
      const len = span * (1 - f * 0.15);
      const angle = -0.58 + f * 0.22;
      const tipX = len * Math.cos(angle);
      const tipY = -len * Math.sin(angle);
      // The engine's quadraticCurveTo, sampled: the droop is what tells a
      // feather from a whisker.
      const ctlX = tipX * 0.42;
      const ctlY = tipY * 0.92 + len * 0.13;
      const at = (t) => [
        (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * ctlX + t * t * tipX,
        (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * ctlY + t * t * tipY,
      ];
      const steps = 6;
      for (let s = 0; s < steps; s++) {
        const [ax, ay] = at(s / steps);
        const [bx, by] = at((s + 1) / steps);
        out.push({
          ax: side * (rx * 0.88 + ax),
          ay: -ry * 0.16 + ay,
          bx: side * (rx * 0.88 + bx),
          by: -ry * 0.16 + by,
          r: Math.max(0.6, R * 1.05 * 0.86 * 0.075),
          alpha: 0.92 - f * 0.17,
        });
      }
    }
  }
  return out;
}

function renderPlume(size) {
  const px = new Uint8Array(size * size * 4);
  // A touch smaller than the engine's R: the icon has to fit the wings in.
  const R = size * 0.25;
  const rx = R * 1.02;
  const ry = R * 0.98;
  const cx = size / 2;
  const cy = size / 2 + R * 0.06;
  const rim = R * 0.05; // the state rim, slate when no state colours it

  const body = outline(rx, ry);
  const halo = outline(rx + rim, ry + rim);
  const wings = feathers(R, rx, ry);

  // Eyes — same geometry as the engine (yaw ±0.37, pitch −0.12)
  const eyeYaw = 0.37;
  const eyePitch = -0.12;
  const cp = Math.cos(eyePitch);
  const ex = Math.sin(eyeYaw) * cp * rx;
  const ey = -Math.sin(eyePitch) * ry;
  const fx = Math.max(0.18, Math.cos(eyeYaw));
  const fy = Math.max(0.18, cp);
  const ew = R * 0.25 * fx;
  const eh = R * 0.27 * fy;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bodyHits = 0;
      let rimHits = 0;
      let eyeHits = 0;
      let wingHits = 0;
      let wingAlpha = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px0 = x + (sx + 0.5) / SS - cx;
          const py0 = y + (sy + 0.5) / SS - cy;
          if (!insidePolygon(px0, py0, halo)) {
            for (const w of wings) {
              if (insideCapsule(px0, py0, w.ax, w.ay, w.bx, w.by, w.r)) {
                wingHits++;
                wingAlpha = Math.max(wingAlpha, w.alpha);
                break;
              }
            }
            continue;
          }
          rimHits++;
          if (!insidePolygon(px0, py0, body)) continue;
          bodyHits++;
          if (insidePill(px0 + ex, py0 - ey, ew, eh) || insidePill(px0 - ex, py0 - ey, ew, eh)) {
            eyeHits++;
          }
        }
      }
      const total = SS * SS;
      if (rimHits === 0 && wingHits === 0) continue;

      const rimA = rimHits / total;
      const bodyA = bodyHits / total;
      const eyeA = eyeHits / total;
      const wingA = (wingHits / total) * wingAlpha;

      let col;
      let alpha;
      if (rimA > 0) {
        // Body gradient: top-right → bottom-left, like the Canvas gradient.
        const t = Math.min(1, Math.max(0, ((x - cx) * -0.6 + (y - cy) * 0.8) / (2 * ry) + 0.5));
        const fill = [0, 1, 2].map((i) => BASE_TOP[i] + (BASE_BOTTOM[i] - BASE_TOP[i]) * t);
        col = RIM.slice();
        alpha = rimA;
        if (bodyA > 0) col = col.map((c, i) => c * (1 - bodyA / rimA) + fill[i] * (bodyA / rimA));
        if (eyeA > 0) col = col.map((c, i) => c * (1 - eyeA) + INK[i] * eyeA);
      } else {
        col = WING.slice();
        alpha = wingA;
      }

      const o = (y * size + x) * 4;
      px[o] = Math.round(col[0]);
      px[o + 1] = Math.round(col[1]);
      px[o + 2] = Math.round(col[2]);
      px[o + 3] = Math.round(Math.min(1, alpha) * 255);
    }
  }
  return px;
}

// ── PNG ───────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── ICO (PNG-in-ICO, Vista and later) ─────────────────────────────────────────

function encodeICO(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = header.length + dir.length;
  entries.forEach((e, i) => {
    const o = i * 16;
    dir[o] = e.size >= 256 ? 0 : e.size;
    dir[o + 1] = e.size >= 256 ? 0 : e.size;
    dir[o + 2] = 0;
    dir[o + 3] = 0;
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(e.png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.png.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)]);
}

// ── Go ────────────────────────────────────────────────────────────────────────

mkdirSync(OUT, { recursive: true });

const png = (size) => encodePNG(size, renderPlume(size));

const files = {
  "32x32.png": png(32),
  "128x128.png": png(128),
  "128x128@2x.png": png(256),
  "icon.png": png(512),
};
for (const [name, data] of Object.entries(files)) {
  writeFileSync(join(OUT, name), data);
  console.log(`${name} — ${data.length} bytes`);
}

const ico = encodeICO([16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, png: png(size) })));
writeFileSync(join(OUT, "icon.ico"), ico);
console.log(`icon.ico — ${ico.length} bytes`);
