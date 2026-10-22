import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STAGE_03_AUDIO,
  STAGE_03_AUDIO_BIT_DEPTH,
  STAGE_03_AUDIO_CHANNELS,
  STAGE_03_AUDIO_SAMPLE_RATE,
} from "./stage-03-audio-model.mjs";

const outputDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../../assets/audio/stage-03");
const TAU = Math.PI * 2;

function eventEnvelope(localTime, duration, attack = 0.008, release = 0.05) {
  return Math.max(0, Math.min(1, localTime / attack, (duration - localTime) / release));
}

function organicNote(time, stepDuration, frequencies) {
  const step = Math.floor(time / stepDuration) % frequencies.length;
  const localTime = time % stepDuration;
  const frequency = frequencies[step];
  const envelope = eventEnvelope(localTime, stepDuration, 0.02, 0.1);
  const vibrato = 1 + 0.012 * Math.sin(TAU * 5 * localTime);
  return envelope * (
    Math.sin(TAU * frequency * vibrato * localTime) +
    0.26 * Math.sin(TAU * frequency * 1.5 * localTime)
  );
}

const synths = {
  "audio-stg03-rhythm": (time) => {
    const localBeat = time % 0.425;
    const heartbeat = eventEnvelope(localBeat, 0.425, 0.004, 0.13) *
      Math.sin(TAU * (58 - 24 * localBeat) * localBeat);
    const membrane = 0.18 * Math.sin(TAU * 50 * time) * (0.7 + 0.3 * Math.cos(TAU * (10 / 3.4) * time));
    return 0.82 * heartbeat + membrane;
  },
  "audio-stg03-melody": (time) => (
    0.82 * organicNote(time, 0.425, [110, 147, 131, 196, 165, 147, 131, 98]) +
    0.18 * Math.sin(TAU * 75 * time)
  ),
  "audio-stg03-danger": (time) => {
    const localPulse = time % 0.2125;
    const nervePulse = eventEnvelope(localPulse, 0.2125, 0.003, 0.065);
    return 0.68 * nervePulse * Math.sin(TAU * (220 + 18 * Math.sin(TAU * 8 * localPulse)) * localPulse) +
      0.32 * Math.sin(TAU * 60 * time) * Math.cos(TAU * (6 / 3.4) * time);
  },
  "audio-stg03-intro": (time, duration) => {
    const envelope = eventEnvelope(time, duration, 0.004, 0.09);
    const frequency = time < 0.15 ? 110 : time < 0.3 ? 165 : 220;
    return envelope * (0.7 * Math.sin(TAU * frequency * time) + 0.3 * Math.sin(TAU * frequency * 1.5 * time));
  },
  "audio-stg03-clear": (time, duration) => {
    const envelope = eventEnvelope(time, duration, 0.005, 0.15);
    const step = Math.min(3, Math.floor(time / 0.18));
    const frequency = [147, 196, 247, 330][step];
    return envelope * (0.78 * Math.sin(TAU * frequency * time) + 0.22 * Math.sin(TAU * frequency * 2 * time));
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
  output.writeUInt16LE(STAGE_03_AUDIO_CHANNELS, 22);
  output.writeUInt32LE(STAGE_03_AUDIO_SAMPLE_RATE, 24);
  output.writeUInt32LE(STAGE_03_AUDIO_SAMPLE_RATE * STAGE_03_AUDIO_CHANNELS * STAGE_03_AUDIO_BIT_DEPTH / 8, 28);
  output.writeUInt16LE(STAGE_03_AUDIO_CHANNELS * STAGE_03_AUDIO_BIT_DEPTH / 8, 32);
  output.writeUInt16LE(STAGE_03_AUDIO_BIT_DEPTH, 34);
  output.write("data", 36);
  output.writeUInt32LE(dataBytes, 40);
  samples.forEach((sample, index) => {
    output.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2);
  });
  return output;
}

mkdirSync(outputDirectory, { recursive: true });
const manifest = [];
for (const asset of STAGE_03_AUDIO) {
  const duration = asset.durationMs / 1000;
  const sampleCount = Math.round(STAGE_03_AUDIO_SAMPLE_RATE * duration);
  const synth = synths[asset.id];
  const samples = Array.from(
    { length: sampleCount },
    (_, index) => synth(index / STAGE_03_AUDIO_SAMPLE_RATE, duration, index),
  );
  const encoded = encodePcm16(normalize(samples, asset.targetPeakDb));
  writeFileSync(resolve(outputDirectory, asset.file), encoded);
  manifest.push({
    ...asset,
    bytes: encoded.length,
    sha256: createHash("sha256").update(encoded).digest("hex"),
    creation: "deterministic original synthesis in generate-stage-03-audio.mjs",
    rights: "project-authored; no third-party samples",
  });
}
writeFileSync(resolve(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
