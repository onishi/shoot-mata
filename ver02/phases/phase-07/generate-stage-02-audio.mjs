import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STAGE_02_AUDIO,
  STAGE_02_AUDIO_BIT_DEPTH,
  STAGE_02_AUDIO_CHANNELS,
  STAGE_02_AUDIO_SAMPLE_RATE,
} from "./stage-02-audio-model.mjs";

const outputDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../../assets/audio/stage-02");
const TAU = Math.PI * 2;

function eventEnvelope(localTime, duration, attack = 0.008, release = 0.05) {
  return Math.max(0, Math.min(1, localTime / attack, (duration - localTime) / release));
}

function note(time, stepDuration, frequencies, harmonic = 0.2) {
  const step = Math.floor(time / stepDuration) % frequencies.length;
  const localTime = time % stepDuration;
  const frequency = frequencies[step];
  const envelope = eventEnvelope(localTime, stepDuration, 0.015, 0.08);
  return envelope * (
    Math.sin(TAU * frequency * localTime) +
    harmonic * Math.sin(TAU * frequency * 2 * localTime)
  );
}

const synths = {
  "audio-stg02-rhythm": (time) => {
    const localBeat = time % 0.5;
    const kick = eventEnvelope(localBeat, 0.5, 0.003, 0.11) *
      Math.sin(TAU * (64 - 20 * localBeat) * localBeat);
    const turbine = 0.25 * Math.sin(TAU * 48 * time) * (0.65 + 0.35 * Math.cos(TAU * 0.5 * time));
    return 0.78 * kick + turbine;
  },
  "audio-stg02-melody": (time) => (
    0.78 * note(time, 0.5, [132, 164, 196, 164, 220, 196, 164, 132]) +
    0.22 * Math.sin(TAU * 88 * time)
  ),
  "audio-stg02-danger": (time) => {
    const localPulse = time % 0.25;
    const pulse = eventEnvelope(localPulse, 0.25, 0.003, 0.055);
    return 0.62 * pulse * Math.sin(TAU * 224 * localPulse) +
      0.38 * Math.sin(TAU * 56 * time) * Math.cos(TAU * 1.5 * time);
  },
  "audio-stg02-intro": (time, duration) => {
    const envelope = eventEnvelope(time, duration, 0.004, 0.08);
    const step = time < 0.18 ? 196 : time < 0.34 ? 264 : 352;
    return envelope * (0.72 * Math.sin(TAU * step * time) + 0.28 * Math.sin(TAU * 48 * time));
  },
  "audio-stg02-clear": (time, duration) => {
    const envelope = eventEnvelope(time, duration, 0.005, 0.14);
    const step = Math.min(3, Math.floor(time / 0.2));
    const frequency = [264, 328, 396, 528][step];
    return envelope * (0.76 * Math.sin(TAU * frequency * time) + 0.24 * Math.sin(TAU * frequency * 1.5 * time));
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
  output.writeUInt16LE(STAGE_02_AUDIO_CHANNELS, 22);
  output.writeUInt32LE(STAGE_02_AUDIO_SAMPLE_RATE, 24);
  output.writeUInt32LE(STAGE_02_AUDIO_SAMPLE_RATE * STAGE_02_AUDIO_CHANNELS * STAGE_02_AUDIO_BIT_DEPTH / 8, 28);
  output.writeUInt16LE(STAGE_02_AUDIO_CHANNELS * STAGE_02_AUDIO_BIT_DEPTH / 8, 32);
  output.writeUInt16LE(STAGE_02_AUDIO_BIT_DEPTH, 34);
  output.write("data", 36);
  output.writeUInt32LE(dataBytes, 40);
  samples.forEach((sample, index) => {
    output.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2);
  });
  return output;
}

mkdirSync(outputDirectory, { recursive: true });
const manifest = [];
for (const asset of STAGE_02_AUDIO) {
  const duration = asset.durationMs / 1000;
  const sampleCount = Math.round(STAGE_02_AUDIO_SAMPLE_RATE * duration);
  const synth = synths[asset.id];
  const samples = Array.from(
    { length: sampleCount },
    (_, index) => synth(index / STAGE_02_AUDIO_SAMPLE_RATE, duration, index),
  );
  const encoded = encodePcm16(normalize(samples, asset.targetPeakDb));
  writeFileSync(resolve(outputDirectory, asset.file), encoded);
  manifest.push({
    ...asset,
    bytes: encoded.length,
    sha256: createHash("sha256").update(encoded).digest("hex"),
    creation: "deterministic original synthesis in generate-stage-02-audio.mjs",
    rights: "project-authored; no third-party samples",
  });
}
writeFileSync(resolve(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
