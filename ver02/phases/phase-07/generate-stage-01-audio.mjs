import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STAGE_01_AUDIO,
  STAGE_01_AUDIO_BIT_DEPTH,
  STAGE_01_AUDIO_CHANNELS,
  STAGE_01_AUDIO_SAMPLE_RATE,
} from "./stage-01-audio-model.mjs";

const outputDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../../assets/audio/stage-01");
const TAU = Math.PI * 2;

function eventEnvelope(localTime, duration, attack = 0.008, release = 0.05) {
  return Math.max(0, Math.min(1, localTime / attack, (duration - localTime) / release));
}

function wreckNote(time) {
  const stepDuration = 0.375;
  const frequencies = [110, 131, 165, 147, 196, 165, 131, 98];
  const step = Math.floor(time / stepDuration) % frequencies.length;
  const localTime = time % stepDuration;
  const envelope = eventEnvelope(localTime, stepDuration, 0.006, 0.11);
  const frequency = frequencies[step];
  return envelope * (
    0.7 * Math.sin(TAU * frequency * localTime) +
    0.2 * Math.sin(TAU * frequency * 2.01 * localTime) +
    0.1 * Math.sin(TAU * frequency * 4.03 * localTime)
  );
}

const synths = {
  "audio-stg01-rhythm": (time) => {
    const localBeat = time % 0.375;
    const impact = eventEnvelope(localBeat, 0.375, 0.002, 0.075) *
      Math.sin(TAU * (92 - 48 * localBeat) * localBeat);
    const relay = eventEnvelope(time % 0.75, 0.75, 0.002, 0.04) * Math.sin(TAU * 660 * time);
    return 0.8 * impact + 0.2 * relay;
  },
  "audio-stg01-melody": (time) => (
    0.86 * wreckNote(time) +
    0.14 * Math.sin(TAU * 55 * time) * (0.65 + 0.35 * Math.cos(TAU * 2 * time))
  ),
  "audio-stg01-danger": (time) => {
    const localPulse = time % 0.25;
    const scan = eventEnvelope(localPulse, 0.25, 0.002, 0.06);
    return 0.68 * scan * (
      0.62 * Math.sin(TAU * 220 * localPulse) +
      0.38 * Math.sin(TAU * 277 * localPulse)
    ) + 0.32 * Math.sin(TAU * 49 * time) * Math.cos(TAU * 6 * time);
  },
  "audio-stg01-intro": (time, duration) => {
    const envelope = eventEnvelope(time, duration, 0.003, 0.08);
    const frequency = time < 0.14 ? 110 : time < 0.27 ? 165 : 247;
    return envelope * (0.75 * Math.sin(TAU * frequency * time) + 0.25 * Math.sin(TAU * frequency * 2.02 * time));
  },
  "audio-stg01-clear": (time, duration) => {
    const envelope = eventEnvelope(time, duration, 0.004, 0.14);
    const step = Math.min(3, Math.floor(time / 0.16));
    const frequency = [131, 165, 220, 330][step];
    return envelope * (0.82 * Math.sin(TAU * frequency * time) + 0.18 * Math.sin(TAU * frequency * 2 * time));
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
  output.writeUInt16LE(STAGE_01_AUDIO_CHANNELS, 22);
  output.writeUInt32LE(STAGE_01_AUDIO_SAMPLE_RATE, 24);
  output.writeUInt32LE(STAGE_01_AUDIO_SAMPLE_RATE * STAGE_01_AUDIO_CHANNELS * STAGE_01_AUDIO_BIT_DEPTH / 8, 28);
  output.writeUInt16LE(STAGE_01_AUDIO_CHANNELS * STAGE_01_AUDIO_BIT_DEPTH / 8, 32);
  output.writeUInt16LE(STAGE_01_AUDIO_BIT_DEPTH, 34);
  output.write("data", 36);
  output.writeUInt32LE(dataBytes, 40);
  samples.forEach((sample, index) => output.writeInt16LE(
    Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2,
  ));
  return output;
}

mkdirSync(outputDirectory, { recursive: true });
const manifest = [];
for (const asset of STAGE_01_AUDIO) {
  const duration = asset.durationMs / 1000;
  const sampleCount = Math.round(STAGE_01_AUDIO_SAMPLE_RATE * duration);
  const samples = Array.from(
    { length: sampleCount },
    (_, index) => synths[asset.id](index / STAGE_01_AUDIO_SAMPLE_RATE, duration),
  );
  const encoded = encodePcm16(normalize(samples, asset.targetPeakDb));
  writeFileSync(resolve(outputDirectory, asset.file), encoded);
  manifest.push({
    ...asset,
    bytes: encoded.length,
    sha256: createHash("sha256").update(encoded).digest("hex"),
    creation: "deterministic original synthesis in generate-stage-01-audio.mjs",
    rights: "project-authored; no third-party samples",
  });
}
writeFileSync(resolve(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
