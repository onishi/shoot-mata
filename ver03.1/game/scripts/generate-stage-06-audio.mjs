import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 48_000;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "assets", "audio", "stage-06");

function tone(time, frequency, type = "sine") {
  const phase = Math.PI * 2 * frequency * time;
  if (type === "triangle") return 2 * Math.asin(Math.sin(phase)) / Math.PI;
  if (type === "square") return Math.sin(phase) >= 0 ? 1 : -1;
  return Math.sin(phase);
}

function envelope(time, duration, attack = 0.02, release = 0.12) {
  return Math.min(1, time / attack, Math.max(0, (duration - time) / release));
}

function wave(duration, synthesize) {
  const samples = Math.ceil(duration * SAMPLE_RATE);
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + samples * 2, 4); buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24); buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index += 1) {
    const time = index / SAMPLE_RATE;
    const sample = Math.max(-0.96, Math.min(0.96, synthesize(time, duration)));
    buffer.writeInt16LE(Math.round(sample * 32_767), 44 + index * 2);
  }
  return buffer;
}

const relayScale = [82.41, 98, 123.47, 146.83, 164.81, 196, 246.94, 293.66];
const recipes = [
  ["stage-06-zero-point-relay-rhythm-v1.wav", 3, (t) => {
    const step = Math.floor(t * 8) % 8;
    const gate = (t * 8) % 1 < 0.07 ? tone(t, step % 3 ? 660 : 330, "square") * 0.055 : 0;
    return envelope(t, 3, 0.01, 0.08) * (tone(t, 41.2, "triangle") * (step % 4 === 0 ? 0.2 : 0.08) + gate);
  }],
  ["stage-06-zero-point-relay-melody-v1.wav", 3, (t) => {
    const note = relayScale[Math.floor(t * 4) % relayScale.length];
    const local = (t * 4) % 1;
    return envelope(local, 1, 0.025, 0.2) * (tone(t, note, "triangle") * 0.14 + tone(t, note * 2.005) * 0.05);
  }],
  ["stage-06-zero-point-relay-danger-v1.wav", 3, (t) => {
    const note = [164.81, 174.61, 196, 207.65, 233.08, 196][Math.floor(t * 6) % 6];
    return envelope((t * 6) % 1, 1, 0.018, 0.17) * (tone(t, note, "square") * 0.075 + tone(t, note / 2, "triangle") * 0.08);
  }],
  ["stage-06-zero-point-relay-intro-v1.wav", 0.8, (t, d) => envelope(t, d, 0.01, 0.2) * (tone(t, 160 + t * 720, "triangle") * 0.2 + tone(t, 480 + t * 980) * 0.07)],
  ["stage-06-zero-point-relay-clear-v1.wav", 1.35, (t, d) => {
    const note = [164.81, 220, 277.18, 329.63, 440][Math.min(4, Math.floor(t * 4))];
    return envelope(t, d, 0.01, 0.22) * (tone(t, note) * 0.19 + tone(t, note * 2) * 0.055);
  }]
];

await mkdir(output, { recursive: true });
for (const [name, duration, synthesize] of recipes) await writeFile(path.join(output, name), wave(duration, synthesize));
console.log(`Generated ${recipes.length} Stage 6 audio assets`);
