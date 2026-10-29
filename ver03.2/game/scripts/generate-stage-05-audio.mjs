import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 48_000;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "assets", "audio", "stage-05");

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

const scale = [110, 138.59, 164.81, 220, 277.18, 329.63, 440, 554.37];
const recipes = [
  ["stage-05-crystal-sea-rhythm-v1.wav", 3, (t) => {
    const step = Math.floor(t * 8) % 8;
    const click = (t * 8) % 1 < 0.08 ? tone(t, step % 2 ? 880 : 440, "square") * 0.08 : 0;
    return envelope(t, 3, 0.01, 0.08) * (tone(t, 55, "triangle") * (step % 4 === 0 ? 0.18 : 0.08) + click);
  }],
  ["stage-05-crystal-sea-melody-v1.wav", 3, (t) => {
    const note = scale[Math.floor(t * 4) % scale.length];
    const local = (t * 4) % 1;
    return envelope(local, 1, 0.03, 0.22) * (tone(t, note) * 0.16 + tone(t, note * 2.01) * 0.055);
  }],
  ["stage-05-crystal-sea-danger-v1.wav", 3, (t) => {
    const step = Math.floor(t * 6) % 6;
    const note = [220, 233.08, 277.18, 311.13, 277.18, 233.08][step];
    return envelope((t * 6) % 1, 1, 0.02, 0.18) * tone(t, note, "triangle") * 0.14;
  }],
  ["stage-05-crystal-sea-intro-v1.wav", 0.72, (t, d) => envelope(t, d, 0.01, 0.18) * (tone(t, 360 + t * 620) * 0.22 + tone(t, 720 + t * 1240) * 0.08)],
  ["stage-05-crystal-sea-clear-v1.wav", 1.1, (t, d) => {
    const note = [277.18, 369.99, 440, 554.37][Math.min(3, Math.floor(t * 4))];
    return envelope(t, d, 0.01, 0.18) * (tone(t, note) * 0.2 + tone(t, note * 2) * 0.06);
  }]
];

await mkdir(output, { recursive: true });
for (const [name, duration, synthesize] of recipes) await writeFile(path.join(output, name), wave(duration, synthesize));
console.log(`Generated ${recipes.length} Stage 5 audio assets`);
