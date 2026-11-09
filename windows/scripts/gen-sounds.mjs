// Synthesises the 29 WAVs hi-wings plays into sounds/. No dependencies and no
// recordings: the sounds are written here, the way gen-icons.mjs draws the icon
// and the way Plume herself is drawn in code.
//
//   node scripts/gen-sounds.mjs
//
// Every voice is a sine, soft-attacked and exponentially decayed, on a
// pentatonic set so two that overlap never clash. A sound is a list of layers:
//   f: [from, to] Hz   t: start in seconds   d: length   g: gain
//   noise: 0..1 mixed in   vib: vibrato Hz
// A file of the user's own in the sounds folder still wins at runtime
// (src-tauri/src/sounds.rs); these are the built-ins.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "sounds");
const SR = 44100;

/** The 29 names src/core/sound.ts asks for, each as its layers. */
const SOUNDS = {
  peek:     [{ f: [880, 1320], t: 0, d: 0.09 }],
  open:     [{ f: [659, 988], t: 0, d: 0.12 }, { f: [988, 1319], t: 0.06, d: 0.14 }],
  close:    [{ f: [988, 659], t: 0, d: 0.13 }],
  hover:    [{ f: [1319, 1319], t: 0, d: 0.045, g: 0.45 }],
  blip:     [{ f: [1047, 1047], t: 0, d: 0.05, g: 0.7 }],
  slap:     [{ f: [220, 90], t: 0, d: 0.10, noise: 0.55 }],
  annoyed:  [{ f: [392, 330], t: 0, d: 0.10 }, { f: [330, 262], t: 0.09, d: 0.16 }],
  dizzy:    [{ f: [880, 440], t: 0, d: 0.34, vib: 13 }],
  greet:    [{ f: [784, 1047], t: 0, d: 0.12 }, { f: [1047, 1319], t: 0.09, d: 0.16 }],
  greeting: [{ f: [523, 659], t: 0, d: 0.12 }, { f: [784, 784], t: 0.11, d: 0.12 },
             { f: [1047, 1047], t: 0.22, d: 0.14 }, { f: [1319, 1319], t: 0.33, d: 0.34 }],
  work:     [{ f: [523, 659], t: 0, d: 0.09, g: 0.8 }],
  finish:   [{ f: [659, 988], t: 0, d: 0.10 }, { f: [988, 1319], t: 0.09, d: 0.26 }],
  error:    [{ f: [330, 196], t: 0, d: 0.24 }],
  approval: [{ f: [880, 880], t: 0, d: 0.08 }, { f: [1175, 1175], t: 0.11, d: 0.16 }],
  question: [{ f: [698, 932], t: 0, d: 0.17 }],
  approve:  [{ f: [1047, 1568], t: 0, d: 0.14 }],
  gulp:     [{ f: [300, 120], t: 0, d: 0.12, noise: 0.2 }],
  tick:     [{ f: [2093, 2093], t: 0, d: 0.022, g: 0.35 }],
  send:     [{ f: [784, 1568], t: 0, d: 0.12 }],
  love:     [{ f: [880, 1047], t: 0, d: 0.10 }, { f: [1047, 1319], t: 0.08, d: 0.20 }],
  pop:      [{ f: [180, 720], t: 0, d: 0.07 }],
  proud:    [{ f: [523, 659], t: 0, d: 0.10 }, { f: [659, 784], t: 0.09, d: 0.10 },
             { f: [784, 1047], t: 0.18, d: 0.24 }],
  wink:     [{ f: [1319, 1760], t: 0, d: 0.07 }],
  yawn:     [{ f: [330, 220], t: 0, d: 0.46, vib: 3 }],
  attach:   [{ f: [587, 880], t: 0, d: 0.09 }],
  think:    [{ f: [659, 659], t: 0, d: 0.055, g: 0.5 }, { f: [659, 659], t: 0.15, d: 0.055, g: 0.5 }],
  search:   [{ f: [880, 1319], t: 0, d: 0.10 }, { f: [1319, 880], t: 0.10, d: 0.13 }],
  rate:     [{ f: [440, 392], t: 0, d: 0.19 }],
  sleep:    [{ f: [262, 196], t: 0, d: 0.52, vib: 2 }],
};

/** One layer into a float buffer, added in place. */
function layer(buf, { f, t, d, g = 1, noise = 0, vib = 0 }) {
  const start = Math.round(t * SR);
  const n = Math.round(d * SR);
  // 8 ms raised-cosine attack: a square start clicks.
  const attack = Math.min(Math.round(0.008 * SR), Math.floor(n / 2));
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const freq = f[0] + (f[1] - f[0]) * p + (vib ? Math.sin((2 * Math.PI * vib * i) / SR) * f[0] * 0.03 : 0);
    phase += (2 * Math.PI * freq) / SR;
    const env = (i < attack ? 0.5 - 0.5 * Math.cos((Math.PI * i) / attack) : 1) * Math.exp(-3.2 * p);
    const tone = Math.sin(phase);
    const sample = noise ? tone * (1 - noise) + (Math.random() * 2 - 1) * noise : tone;
    const o = start + i;
    if (o < buf.length) buf[o] += sample * env * g * 0.62;
  }
}

/** 16-bit mono PCM WAV. */
function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

export function render(layers) {
  const end = Math.max(...layers.map((l) => l.t + l.d)) + 0.02;
  const buf = new Float32Array(Math.round(end * SR));
  for (const l of layers) layer(buf, l);
  // Normalise to −3 dBFS: the player's own volume (0.12) does the quiet part.
  let peak = 0;
  for (const s of buf) peak = Math.max(peak, Math.abs(s));
  if (peak > 0) for (let i = 0; i < buf.length; i++) buf[i] = (buf[i] / peak) * 0.707;
  return buf;
}

function main() {
  mkdirSync(OUT, { recursive: true });
  let total = 0;
  for (const [name, layers] of Object.entries(SOUNDS)) {
    const bytes = wav(render(layers));
    writeFileSync(join(OUT, `${name}.wav`), bytes);
    total += bytes.length;
  }
  console.log(`Wrote ${Object.keys(SOUNDS).length} sounds to sounds/ — ${Math.round(total / 1024)} kB`);
}

/** Self-check: every name the player asks for exists, and no sound is silent. */
export function demo() {
  const expected = [
    "peek", "open", "close", "hover", "blip", "slap", "annoyed", "dizzy", "greet",
    "work", "finish", "error", "approval", "question", "approve", "gulp", "tick",
    "send", "love", "pop", "proud", "wink", "yawn", "attach", "think", "search",
    "rate", "sleep", "greeting",
  ];
  const names = Object.keys(SOUNDS);
  for (const n of expected) {
    if (!names.includes(n)) throw new Error(`missing sound: ${n}`);
    const buf = render(SOUNDS[n]);
    if (buf.length < SR * 0.02) throw new Error(`${n} is too short`);
    if (!buf.some((s) => Math.abs(s) > 0.2)) throw new Error(`${n} is silent`);
    if (buf.some((s) => !Number.isFinite(s))) throw new Error(`${n} has a bad sample`);
  }
  if (names.length !== expected.length) throw new Error(`${names.length} sounds for ${expected.length} names`);
  console.log(`${names.length} sounds, all audible`);
}

if (process.argv.includes("--demo")) demo();
else main();
