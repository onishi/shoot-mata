import { readFileSync } from "node:fs";

export function inspectWav(filePath, silenceThresholdDb = -60) {
  const data = readFileSync(filePath);
  if (data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WAVE") {
    throw new TypeError(`${filePath} is not a RIFF/WAVE file`);
  }
  const format = data.readUInt16LE(20);
  const channels = data.readUInt16LE(22);
  const sampleRate = data.readUInt32LE(24);
  const bitDepth = data.readUInt16LE(34);
  if (format !== 1 || channels !== 1 || bitDepth !== 16 || data.toString("ascii", 36, 40) !== "data") {
    throw new TypeError(`${filePath} must be mono PCM16 with a canonical header`);
  }

  const dataBytes = data.readUInt32LE(40);
  const sampleCount = dataBytes / 2;
  const samples = Array.from({ length: sampleCount }, (_, index) => data.readInt16LE(44 + index * 2) / 32768);
  const peak = samples.reduce((value, sample) => Math.max(value, Math.abs(sample)), 0);
  const threshold = 10 ** (silenceThresholdDb / 20);
  const firstActive = samples.findIndex((sample) => Math.abs(sample) >= threshold);
  const lastActive = samples.findLastIndex((sample) => Math.abs(sample) >= threshold);

  return {
    channels,
    sampleRate,
    bitDepth,
    sampleCount,
    durationMs: sampleCount / sampleRate * 1000,
    peakDb: 20 * Math.log10(peak),
    clippedSamples: samples.filter((sample) => Math.abs(sample) >= 1).length,
    leadingSilenceMs: firstActive < 0 ? Infinity : firstActive / sampleRate * 1000,
    trailingSilenceMs: lastActive < 0 ? Infinity : (sampleCount - 1 - lastActive) / sampleRate * 1000,
    loopSeamDelta: Math.abs(samples[0] - samples.at(-1)),
  };
}
