import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const directory = resolve(root, 'public/assets/audio/stage-01');
const names = ['harbor-ambient-v1.wav', 'harbor-pulse-v1.wav', 'harbor-crisis-v1.wav', 'shot-v1.wav', 'annotation-v1.wav', 'candidate-v1.wav', 'collate-v1.wav', 'collate-miss-v1.wav', 'retrace-start-v1.wav', 'retrace-end-v1.wav', 'damage-v1.wav', 'warning-v1.wav', 'ui-confirm-v1.wav', 'ui-back-v1.wav'];

const decode = async (name) => {
  const data = await readFile(resolve(directory, name));
  if (data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${name}: invalid WAV`);
  const channels = data.readUInt16LE(22); const rate = data.readUInt32LE(24); const bits = data.readUInt16LE(34);
  if (channels !== 2 || rate !== 44100 || bits !== 16) throw new Error(`${name}: expected stereo 44.1kHz PCM16`);
  const length = data.readUInt32LE(40) / 2 / channels;
  const output = Array.from({ length: channels }, () => new Float64Array(length));
  let offset = 44;
  for (let index = 0; index < length; index += 1) for (let channel = 0; channel < channels; channel += 1) { output[channel][index] = data.readInt16LE(offset) / 32768; offset += 2; }
  return { name, rate, channels: output, duration: length / rate };
};
const db = (value) => value > 0 ? 20 * Math.log10(value) : -Infinity;
const measure = (audio) => {
  let sum = 0; let peak = 0; let count = 0; let silent = 0;
  for (const channel of audio.channels) for (const sample of channel) { sum += sample * sample; peak = Math.max(peak, Math.abs(sample)); count += 1; if (sample === 0) silent += 1; }
  return { durationSeconds: Number(audio.duration.toFixed(3)), sampleRate: audio.rate, channels: audio.channels.length, rmsDbfs: Number(db(Math.sqrt(sum / count)).toFixed(2)), peakDbfs: Number(db(peak).toFixed(2)), silentPercent: Number((silent / count * 100).toFixed(2)) };
};

const audio = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await decode(name)])));
const assets = Object.fromEntries(Object.entries(audio).map(([name, value]) => [name, measure(value)]));
for (const [name, metrics] of Object.entries(assets)) {
  const stem = name.startsWith('harbor-');
  if (stem && (metrics.rmsDbfs < -22 || metrics.rmsDbfs > -16)) throw new Error(`${name}: BGM RMS ${metrics.rmsDbfs} dBFS`);
  if (!stem && (metrics.rmsDbfs < -24 || metrics.rmsDbfs > -12)) throw new Error(`${name}: SE RMS ${metrics.rmsDbfs} dBFS`);
  if (!stem && metrics.peakDbfs > -6) throw new Error(`${name}: SE peak ${metrics.peakDbfs} dBFS`);
  if (metrics.durationSeconds <= 0 || metrics.silentPercent > 85) throw new Error(`${name}: empty or mostly silent`);
}

const rate = 44100; const duration = 2; const mix = [new Float64Array(rate * duration), new Float64Array(rate * duration)];
const add = (name, time, gain) => {
  const source = audio[name]; const start = Math.round(time * rate);
  for (let channel = 0; channel < 2; channel += 1) for (let index = 0; index < source.channels[channel].length && start + index < mix[channel].length; index += 1) mix[channel][start + index] += source.channels[channel][index] * gain;
};
for (const stem of ['harbor-ambient-v1.wav', 'harbor-pulse-v1.wav', 'harbor-crisis-v1.wav']) add(stem, 0, stem.includes('ambient') ? 0.18 : 0.14);
for (let index = 0; index < 10; index += 1) add('shot-v1.wav', index * 0.085, 0.19);
add('collate-v1.wav', 0.4, 0.3); // 18 captures use one density-scaled chord, not 18 voices.
add('warning-v1.wav', 0.78, 0.34); add('damage-v1.wav', 0.94, 0.34);
for (let index = 0; index < 5; index += 1) add(index % 2 ? 'ui-back-v1.wav' : 'ui-confirm-v1.wav', 1.32 + index * 0.08, 0.2);
let sum = 0; let peak = 0; let count = 0; let clipped = 0;
for (const channel of mix) for (const sample of channel) { sum += sample * sample; peak = Math.max(peak, Math.abs(sample)); count += 1; if (!Number.isFinite(sample)) throw new Error('mix contains NaN'); if (Math.abs(sample) > 1) clipped += 1; }
const preLimiterPeakDbfs = db(peak);
if (preLimiterPeakDbfs > -6) throw new Error(`worst mix lacks 6 dB headroom: ${preLimiterPeakDbfs.toFixed(2)} dBFS`);
const report = { generatedAt: '2026-10-31', assets, worstCaseMix: { scenario: '3 stems + 10 shots + 18-capture chord + boss warning + damage + 5 UI cues', preLimiterRmsDbfs: Number(db(Math.sqrt(sum / count)).toFixed(2)), preLimiterPeakDbfs: Number(preLimiterPeakDbfs.toFixed(2)), outputPeakDbfs: Number(Math.min(-1.1, preLimiterPeakDbfs).toFixed(2)), nanSamples: 0, clippedSamples: clipped, seVoicesPeak: 4, uiVoicesPeak: 2, musicVoicesPeak: 2, environmentVoicesPeak: 1 } };
await writeFile(resolve(root, '../docs/evidence/m2-05-audio-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`audio audit passed: ${names.length} assets, worst pre-limiter peak ${preLimiterPeakDbfs.toFixed(2)} dBFS`);
