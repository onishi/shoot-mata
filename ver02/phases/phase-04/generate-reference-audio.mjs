import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AUDIO_BIT_DEPTH, AUDIO_CHANNELS, AUDIO_SAMPLE_RATE, REFERENCE_AUDIO } from "./audio-model.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../assets/audio/reference");
const TAU = Math.PI * 2;

function envelope(time, duration, attack = 0.006, release = 0.03) {
  return Math.min(1, time / attack, (duration - time) / release);
}

function noise(index) {
  let value = (index + 1) * 0x9e3779b1;
  value ^= value >>> 16;
  value = Math.imul(value, 0x21f0aaad);
  value ^= value >>> 15;
  return ((value >>> 0) / 0xffffffff) * 2 - 1;
}

const synths = {
  "weapon-lance-shot": (time, duration, index) => envelope(time, duration, 0.002, 0.045) * (
    0.82 * Math.sin(TAU * (880 - 510 * time / duration) * time) + 0.18 * noise(index)
  ),
  "weapon-spread-shot": (time, duration, index) => envelope(time, duration, 0.004, 0.055) * (
    0.28 * Math.sin(TAU * 190 * time) + 0.24 * Math.sin(TAU * 247 * time) +
    0.2 * Math.sin(TAU * 311 * time) + 0.28 * noise(index)
  ),
  "weapon-seeker-launch": (time, duration) => envelope(time, duration, 0.008, 0.065) * (
    0.72 * Math.sin(TAU * (280 + 520 * time / duration) * time) +
    0.28 * Math.sin(TAU * 70 * time)
  ),
  "core-collect": (time, duration) => envelope(time, duration, 0.005, 0.06) * (
    0.58 * Math.sin(TAU * (440 + 440 * time / duration) * time) +
    0.42 * Math.sin(TAU * (660 + 330 * time / duration) * time)
  ),
  "core-load": (time, duration) => envelope(time, duration, 0.003, 0.04) * (
    0.65 * Math.sin(TAU * (time < duration / 2 ? 220 : 330) * time) +
    0.35 * Math.sin(TAU * 55 * time)
  ),
  "ui-confirm": (time, duration) => envelope(time, duration, 0.003, 0.025) * (
    0.7 * Math.sin(TAU * 880 * time) + 0.3 * Math.sin(TAU * 1320 * time)
  ),
  "stage-01-rhythm-loop": (time) => {
    const pulse = 0.55 + 0.45 * Math.cos(TAU * 2 * time);
    return pulse * (0.62 * Math.sin(TAU * 55 * time) + 0.24 * Math.sin(TAU * 110 * time)) +
      0.14 * Math.sin(TAU * 220 * time);
  },
};

function normalize(samples, targetPeakDb) {
  const currentPeak = samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0);
  const targetPeak = 10 ** (targetPeakDb / 20);
  return samples.map((sample) => sample * targetPeak / currentPeak);
}

function encodePcm16(samples) {
  const dataBytes = samples.length * 2;
  const output = Buffer.alloc(44 + dataBytes);
  output.write("RIFF", 0);
  output.writeUInt32LE(36 + dataBytes, 4);
  output.write("WAVEfmt ", 8);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(AUDIO_CHANNELS, 22);
  output.writeUInt32LE(AUDIO_SAMPLE_RATE, 24);
  output.writeUInt32LE(AUDIO_SAMPLE_RATE * AUDIO_CHANNELS * AUDIO_BIT_DEPTH / 8, 28);
  output.writeUInt16LE(AUDIO_CHANNELS * AUDIO_BIT_DEPTH / 8, 32);
  output.writeUInt16LE(AUDIO_BIT_DEPTH, 34);
  output.write("data", 36);
  output.writeUInt32LE(dataBytes, 40);
  samples.forEach((sample, index) => output.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2));
  return output;
}

mkdirSync(root, { recursive: true });
const manifest = [];
for (const asset of REFERENCE_AUDIO) {
  const duration = asset.durationMs / 1000;
  const sampleCount = Math.round(AUDIO_SAMPLE_RATE * duration);
  const synth = synths[asset.id];
  const samples = Array.from({ length: sampleCount }, (_, index) => synth(index / AUDIO_SAMPLE_RATE, duration, index));
  const encoded = encodePcm16(normalize(samples, asset.targetPeakDb));
  writeFileSync(resolve(root, asset.file), encoded);
  manifest.push({
    ...asset,
    bytes: encoded.length,
    sha256: createHash("sha256").update(encoded).digest("hex"),
    creation: "deterministic original synthesis in generate-reference-audio.mjs",
    rights: "project-authored; no third-party samples",
  });
}
writeFileSync(resolve(root, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
