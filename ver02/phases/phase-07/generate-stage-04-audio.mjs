import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STAGE_04_AUDIO,
  STAGE_04_AUDIO_BIT_DEPTH,
  STAGE_04_AUDIO_CHANNELS,
  STAGE_04_AUDIO_SAMPLE_RATE,
} from "./stage-04-audio-model.mjs";

const outputDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../../assets/audio/stage-04");
const TAU = Math.PI * 2;

function eventEnvelope(localTime, duration, attack = 0.008, release = 0.05) {
  return Math.max(0, Math.min(1, localTime / attack, (duration - localTime) / release));
}

function furnaceNote(time) {
  const stepDuration = 0.375;
  const frequencies = [123, 147, 165, 220, 185, 165, 147, 110];
  const step = Math.floor(time / stepDuration) % frequencies.length;
  const localTime = time % stepDuration;
  const envelope = eventEnvelope(localTime, stepDuration, 0.012, 0.08);
  const frequency = frequencies[step];
  return envelope * (
    0.68 * Math.sin(TAU * frequency * localTime) +
    0.22 * Math.sin(TAU * frequency * 2 * localTime) +
    0.1 * Math.sin(TAU * frequency * 3 * localTime)
  );
}

const synths = {
  "audio-stg04-rhythm": (time) => {
    const localBeat = time % 0.5;
    const hammer = eventEnvelope(localBeat, 0.5, 0.003, 0.11) *
      Math.sin(TAU * (76 - 38 * localBeat) * localBeat);
    const machinery = Math.sin(TAU * 48 * time) * (0.65 + 0.35 * Math.cos(TAU * 2 * time));
    return 0.82 * hammer + 0.18 * machinery;
  },
  "audio-stg04-melody": (time) => (
    0.88 * furnaceNote(time) +
    0.12 * Math.sin(TAU * 72 * time) * (0.7 + 0.3 * Math.cos(TAU * 2 * time))
  ),
  "audio-stg04-danger": (time) => {
    const localPulse = time % 0.25;
    const alarm = eventEnvelope(localPulse, 0.25, 0.002, 0.055);
    return 0.72 * alarm * (
      0.65 * Math.sin(TAU * 247 * localPulse) +
      0.35 * Math.sin(TAU * 330 * localPulse)
    ) + 0.28 * Math.sin(TAU * 54 * time) * Math.cos(TAU * 4 * time);
  },
  "audio-stg04-intro": (time, duration) => {
    const envelope = eventEnvelope(time, duration, 0.003, 0.07);
    const frequency = time < 0.12 ? 147 : time < 0.24 ? 220 : 330;
    return envelope * (0.72 * Math.sin(TAU * frequency * time) + 0.28 * Math.sin(TAU * frequency * 2 * time));
  },
  "audio-stg04-clear": (time, duration) => {
    const envelope = eventEnvelope(time, duration, 0.004, 0.13);
    const step = Math.min(3, Math.floor(time / 0.15));
    const frequency = [165, 220, 294, 440][step];
    return envelope * (0.8 * Math.sin(TAU * frequency * time) + 0.2 * Math.sin(TAU * frequency * 2 * time));
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
  output.writeUInt16LE(STAGE_04_AUDIO_CHANNELS, 22);
  output.writeUInt32LE(STAGE_04_AUDIO_SAMPLE_RATE, 24);
  output.writeUInt32LE(STAGE_04_AUDIO_SAMPLE_RATE * STAGE_04_AUDIO_CHANNELS * STAGE_04_AUDIO_BIT_DEPTH / 8, 28);
  output.writeUInt16LE(STAGE_04_AUDIO_CHANNELS * STAGE_04_AUDIO_BIT_DEPTH / 8, 32);
  output.writeUInt16LE(STAGE_04_AUDIO_BIT_DEPTH, 34);
  output.write("data", 36);
  output.writeUInt32LE(dataBytes, 40);
  samples.forEach((sample, index) => {
    output.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2);
  });
  return output;
}

mkdirSync(outputDirectory, { recursive: true });
const manifest = [];
for (const asset of STAGE_04_AUDIO) {
  const duration = asset.durationMs / 1000;
  const sampleCount = Math.round(STAGE_04_AUDIO_SAMPLE_RATE * duration);
  const samples = Array.from(
    { length: sampleCount },
    (_, index) => synths[asset.id](index / STAGE_04_AUDIO_SAMPLE_RATE, duration),
  );
  const encoded = encodePcm16(normalize(samples, asset.targetPeakDb));
  writeFileSync(resolve(outputDirectory, asset.file), encoded);
  manifest.push({
    ...asset,
    bytes: encoded.length,
    sha256: createHash("sha256").update(encoded).digest("hex"),
    creation: "deterministic original synthesis in generate-stage-04-audio.mjs",
    rights: "project-authored; no third-party samples",
  });
}
writeFileSync(resolve(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
