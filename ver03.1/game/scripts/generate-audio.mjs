import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 48_000;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "assets", "audio", "generated");

const recipes = [
  ["pulse-shot-v1.wav", 0.075, ({ time, duration }) => envelope(time, duration, 0.004, 0.045) * (0.34 * sine(time, 920 - time * 2_800) + 0.08 * noise(time))],
  ["enemy-shot-v1.wav", 0.13, ({ time, duration }) => envelope(time, duration, 0.008, 0.07) * (0.27 * square(time, 260 + time * 420) + 0.08 * noise(time + 3))],
  ["impact-v1.wav", 0.16, ({ time, duration }) => envelope(time, duration, 0.002, 0.12) * (0.3 * noise(time + 7) + 0.18 * sine(time, 150 - time * 400))],
  ["explosion-v1.wav", 0.34, ({ time, duration }) => envelope(time, duration, 0.003, 0.28) * (0.38 * noise(time + 13) + 0.16 * sine(time, 92 - time * 120))],
  ["miss-v1.wav", 0.46, ({ time, duration }) => envelope(time, duration, 0.01, 0.36) * (0.25 * saw(time, 330 - time * 470) + 0.2 * sine(time, 165 - time * 210))],
  ["warning-v1.wav", 0.42, ({ time, duration }) => envelope(time, duration, 0.005, 0.12) * (time < 0.18 || time > 0.24 ? 0.27 * square(time, 740) : 0)]
];

function sine(time, frequency) {
  return Math.sin(Math.PI * 2 * Math.max(35, frequency) * time);
}

function square(time, frequency) {
  return sine(time, frequency) >= 0 ? 1 : -1;
}

function saw(time, frequency) {
  return 2 * ((time * Math.max(35, frequency)) % 1) - 1;
}

function noise(time) {
  const sample = Math.floor(time * SAMPLE_RATE);
  const value = Math.sin((sample + 1) * 12.9898) * 43_758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

function envelope(time, duration, attack, release) {
  return Math.min(1, time / attack, Math.max(0, (duration - time) / release));
}

function createWave(duration, synthesize) {
  const sampleCount = Math.ceil(duration * SAMPLE_RATE);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / SAMPLE_RATE;
    const sample = Math.max(-0.98, Math.min(0.98, synthesize({ time, duration })));
    buffer.writeInt16LE(Math.round(sample * 32_767), 44 + index * 2);
  }
  return buffer;
}

await mkdir(outputDirectory, { recursive: true });
for (const [filename, duration, synthesize] of recipes) {
  await writeFile(path.join(outputDirectory, filename), createWave(duration, synthesize));
}
console.log(`Generated ${recipes.length} deterministic SFX in ${path.relative(root, outputDirectory)}`);
