import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const RATE = 44100;
const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'public/assets/audio/stage-01');
await mkdir(output, { recursive: true });

let noiseState = 0x50414c49;
const noise = () => {
  noiseState ^= noiseState << 13; noiseState ^= noiseState >>> 17; noiseState ^= noiseState << 5;
  return ((noiseState >>> 0) / 0xffffffff) * 2 - 1;
};
const env = (t, duration, attack = 0.012, release = 0.12) => Math.min(1, t / attack, (duration - t) / release);
const pan = (value, position) => [value * Math.sqrt((1 - position) / 2), value * Math.sqrt((1 + position) / 2)];
const tone = (frequency, t, phase = 0) => Math.sin(Math.PI * 2 * frequency * t + phase);

const normalize = (channels, targetRmsDb, peakDb = -6.4) => {
  let sum = 0; let count = 0; let peak = 0;
  for (const channel of channels) for (const sample of channel) { sum += sample * sample; count += 1; peak = Math.max(peak, Math.abs(sample)); }
  const rms = Math.sqrt(sum / count) || 1;
  const target = 10 ** (targetRmsDb / 20);
  const peakLimit = 10 ** (peakDb / 20);
  const gain = Math.min(target / rms, peakLimit / peak);
  for (const channel of channels) for (let index = 0; index < channel.length; index += 1) channel[index] *= gain;
  return channels;
};

const render = (duration, synth, targetRmsDb, peakDb) => {
  const left = new Float32Array(Math.round(duration * RATE));
  const right = new Float32Array(left.length);
  for (let index = 0; index < left.length; index += 1) {
    const [l, r] = synth(index / RATE, duration, index);
    left[index] = l; right[index] = r;
  }
  return normalize([left, right], targetRmsDb, peakDb);
};

const wav = (channels) => {
  const samples = channels[0].length;
  const bytes = Buffer.alloc(44 + samples * channels.length * 2);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(channels.length, 22);
  bytes.writeUInt32LE(RATE, 24); bytes.writeUInt32LE(RATE * channels.length * 2, 28);
  bytes.writeUInt16LE(channels.length * 2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36);
  bytes.writeUInt32LE(samples * channels.length * 2, 40);
  let offset = 44;
  for (let index = 0; index < samples; index += 1) for (const channel of channels) {
    bytes.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(channel[index] * 32767))), offset); offset += 2;
  }
  return bytes;
};

const stems = {
  'harbor-ambient-v1.wav': render(16, (t) => {
    const breath = noise() * (0.18 + 0.09 * tone(0.071, t)) + noise() * 0.06 * tone(118, t);
    const hull = tone(55, t) * 0.16 + tone(82.5, t, 0.4) * 0.08 + tone(165, t) * 0.03;
    return [breath * (0.8 + 0.2 * tone(0.043, t)) + hull, breath * (0.8 - 0.2 * tone(0.043, t)) + hull * 0.92];
  }, -20),
  'harbor-pulse-v1.wav': render(16, (t) => {
    const beat = t % 1.6; const sub = t % 0.8;
    const click = (beat < 0.055 ? (noise() * 0.32 + tone(410, beat) * 0.45) * Math.exp(-beat * 48) : 0)
      + tone(205, beat) * Math.exp(-beat * 2.4) * 0.34
      + tone(307.5, beat, 0.5) * Math.exp(-beat * 3.2) * 0.18
      + tone(102.5, t, 0.2) * 0.24
      + (sub < 0.025 ? tone(680, sub) * Math.exp(-sub * 90) * 0.16 : 0);
    const position = Math.sin(Math.floor(t / 1.6) * 2.17) * 0.55;
    return pan(click, position);
  }, -20, -1),
  'harbor-crisis-v1.wav': render(16, (t) => {
    const swell = 0.18 + 0.82 * Math.sin(Math.PI * ((t % 4) / 4)) ** 2;
    const bow = tone(110, t) * 0.3 + tone(220, t, 0.3) * 0.22 + tone(330, t, 1.1) * 0.13 + tone(550, t, 0.7) * 0.07;
    const grit = noise() * tone(880 + 25 * tone(0.17, t), t) * 0.035;
    return [swell * (bow + grit), swell * (bow * 0.91 - grit)];
  }, -19)
};

// A short zero crossing at the 16-second seam prevents broadband wind and bow
// grain from clicking when Web Audio loops the stems.
for (const channels of Object.values(stems)) for (const channel of channels) {
  const fade = Math.round(RATE * 0.04);
  for (let index = 0; index < fade; index += 1) {
    const gain = Math.sin(index / fade * Math.PI / 2) ** 2;
    channel[index] *= gain;
    channel[channel.length - 1 - index] *= gain;
  }
}

const sfx = {
  'shot-v1.wav': [0.12, (t, d) => pan(env(t, d, 0.002, 0.08) * (tone(780 - 260 * t / d, t) + tone(1560, t) * 0.22), -0.18)],
  'annotation-v1.wav': [0.18, (t, d) => pan(env(t, d, 0.003, 0.12) * (tone(980 + 640 * t / d, t) * 0.7 + tone(1470, t) * 0.25), 0.12)],
  'candidate-v1.wav': [0.34, (t, d) => pan(env(t, d, 0.018, 0.18) * (tone(440, t) + tone(660, t) * 0.42), 0)],
  'collate-v1.wav': [0.72, (t, d) => pan(env(t, d, 0.004, 0.3) * (tone(220 + 520 * t / d, t) * 0.7 + tone(440 + 1040 * t / d, t) * 0.34 + noise() * Math.exp(-t * 12) * 0.12), 0)],
  'collate-miss-v1.wav': [0.22, (t, d) => pan(env(t, d, 0.003, 0.1) * (tone(190 - 70 * t / d, t) + noise() * 0.16), 0)],
  'retrace-start-v1.wav': [0.42, (t, d) => pan(env(t, d, 0.004, 0.18) * (tone(720 - 410 * t / d, t) + tone(360, t) * 0.3), -0.25 + 0.5 * t / d)],
  'retrace-end-v1.wav': [0.3, (t, d) => pan(env(t, d, 0.005, 0.16) * (tone(330 + 300 * t / d, t) + tone(660, t) * 0.24), 0.25 - 0.5 * t / d)],
  'damage-v1.wav': [0.55, (t, d) => pan(env(t, d, 0.002, 0.28) * (tone(74, t) * 0.85 + tone(111, t) * 0.32 + noise() * Math.exp(-t * 8) * 0.45), 0)],
  'warning-v1.wav': [0.66, (t, d) => pan(env(t, d, 0.006, 0.22) * (tone(246, t) * 0.62 + tone(369, t) * 0.46 + (t > 0.31 ? tone(277, t) * 0.6 : 0)), 0.1)],
  'ui-confirm-v1.wav': [0.16, (t, d) => pan(env(t, d, 0.002, 0.09) * (tone(620, t) + tone(930, t) * 0.35), 0)],
  'ui-back-v1.wav': [0.18, (t, d) => pan(env(t, d, 0.002, 0.1) * (tone(510 - 190 * t / d, t) + tone(255, t) * 0.32), 0)]
};

for (const [name, channels] of Object.entries(stems)) await writeFile(resolve(output, name), wav(channels));
for (const [name, [duration, synth]] of Object.entries(sfx)) await writeFile(resolve(output, name), wav(render(duration, synth, -18, -6.4)));
console.log(`generated ${Object.keys(stems).length} stems and ${Object.keys(sfx).length} effects at 44.1 kHz stereo`);
