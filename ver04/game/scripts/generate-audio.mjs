import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const RATE = 44100;
const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'public/assets/audio/stage-01');
const outputStageTwo = resolve(root, 'public/assets/audio/stage-02');
const outputStageThree = resolve(root, 'public/assets/audio/stage-03');
const outputStageFour = resolve(root, 'public/assets/audio/stage-04');
await mkdir(output, { recursive: true });
await mkdir(outputStageTwo, { recursive: true });
await mkdir(outputStageThree, { recursive: true });
await mkdir(outputStageFour, { recursive: true });

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
const stageOneEffectNoiseState = noiseState;

const stageTwoStems = {
  'crosswind-ambient-v1.wav': render(16, (t) => {
    const direction = Math.floor(t / 2) % 2 === 0 ? -1 : 1;
    const gust = noise() * (0.2 + 0.1 * Math.sin(Math.PI * (t % 2) / 2) ** 2);
    const fiber = noise() * tone(1260 + 90 * tone(0.125, t), t) * 0.045;
    const lowAir = tone(62, t) * 0.1 + tone(93, t, 0.7) * 0.055;
    const [l, r] = pan(gust + fiber, direction * 0.72 * Math.sin(Math.PI * (t % 2) / 2));
    return [l + lowAir, r + lowAir * 0.92];
  }, -20),
  'crosswind-pulse-v1.wav': render(16, (t) => {
    const beatThree = t % (1.6 / 3); const beatFour = t % 0.4;
    const vane = beatThree < 0.065 ? (tone(510, beatThree) * 0.4 + noise() * 0.08) * Math.exp(-beatThree * 42) : 0;
    const teeth = beatFour < 0.04 ? (tone(765, beatFour) * 0.3 + tone(255, beatFour) * 0.12) * Math.exp(-beatFour * 58) : 0;
    const drone = tone(127.5, t) * 0.32 + tone(191.25, t, 0.4) * 0.14;
    return pan(vane + teeth + drone, Math.sin(t * Math.PI / 2) * 0.58);
  }, -19.5, -1),
  'crosswind-crisis-v1.wav': render(16, (t) => {
    const rotation = Math.sin(Math.PI * 2 * t / 3.2);
    const blades = tone(85 + rotation * 4, t) * 0.3 + tone(170 - rotation * 6, t, 0.5) * 0.22 + tone(255, t, 1.2) * 0.12;
    const ratchet = (t % 0.32) < 0.045 ? noise() * Math.exp(-(t % 0.32) * 54) * 0.18 : 0;
    const [l, r] = pan(blades + ratchet, rotation * 0.62);
    return [l, r];
  }, -19)
};
const stageThreeStems = {
  'rain-ambient-v1.wav': render(16, (t) => {
    const shower = noise() * (0.16 + 0.1 * tone(0.19, t)) + noise() * tone(1800 + 240 * tone(0.11, t), t) * 0.045;
    const dropPhase = t % 0.18; const drops = dropPhase < 0.018 ? tone(1480 - dropPhase * 22000, dropPhase) * Math.exp(-dropPhase * 120) * 0.28 : 0;
    const water = tone(48, t) * 0.13 + tone(72, t, 0.6) * 0.075;
    const [l, r] = pan(shower + drops, Math.sin(t * 1.71) * 0.7);
    return [l + water, r + water * 0.94];
  }, -20),
  'rain-pulse-v1.wav': render(16, (t) => {
    const fine = t % 0.25; const heavy = t % 1;
    const bead = fine < 0.032 ? (tone(920, fine) * 0.34 + noise() * 0.1) * Math.exp(-fine * 70) : 0;
    const gutter = heavy < 0.12 ? (tone(96 - heavy * 180, heavy) * 0.5 + tone(192, heavy) * 0.17) * Math.exp(-heavy * 18) : 0;
    const resonance = tone(64, t) * 0.27 + tone(128, t, 0.35) * 0.11;
    return pan(bead + gutter + resonance, Math.sin(Math.floor(t * 4) * 1.37) * 0.52);
  }, -19.5, -1),
  'rain-crisis-v1.wav': render(16, (t) => {
    const swell = 0.35 + Math.sin(Math.PI * ((t % 2.4) / 2.4)) ** 2 * 0.65;
    const eel = tone(46 + 3 * tone(0.13, t), t) * 0.38 + tone(92, t, 0.7) * 0.25 + tone(138, t, 1.4) * 0.14;
    const rush = noise() * tone(420 + 80 * tone(0.21, t), t) * 0.06;
    const [l, r] = pan((eel + rush) * swell, Math.sin(t * Math.PI / 2.4) * 0.48);
    return [l, r];
  }, -19)
};
const stageFourStems = {
  'furnace-ambient-v1.wav': render(16, (t) => {
    const furnace = tone(41, t) * 0.22 + tone(61.5, t, 0.4) * 0.12 + tone(82, t, 1.1) * 0.07;
    const draft = noise() * (0.13 + 0.07 * tone(0.125, t)) + noise() * tone(360 + 35 * tone(0.18, t), t) * 0.04;
    const ash = t % 0.73 < 0.025 ? noise() * Math.exp(-(t % 0.73) * 95) * 0.16 : 0;
    const [l, r] = pan(draft + ash, Math.sin(t * 0.83) * 0.62);
    return [l + furnace, r + furnace * 0.94];
  }, -20),
  'furnace-pulse-v1.wav': render(16, (t) => {
    const typeBeat = t % 0.4; const pressBeat = t % 1.6;
    const type = typeBeat < 0.035 ? (tone(1180 - typeBeat * 9000, typeBeat) * 0.3 + noise() * 0.18) * Math.exp(-typeBeat * 75) : 0;
    const press = pressBeat < 0.13 ? (tone(74 - pressBeat * 120, pressBeat) * 0.55 + tone(148, pressBeat) * 0.18) * Math.exp(-pressBeat * 16) : 0;
    const rail = tone(123, t) * 0.26 + tone(184.5, t, 0.5) * 0.11;
    return pan(type + press + rail, Math.sin(Math.floor(t * 2.5) * 1.91) * 0.5);
  }, -19.5, -1),
  'furnace-crisis-v1.wav': render(16, (t) => {
    const hearing = 0.32 + 0.68 * Math.sin(Math.PI * ((t % 2) / 2)) ** 2;
    const metal = tone(52 + 2.5 * tone(0.1, t), t) * 0.38 + tone(104, t, 0.6) * 0.25 + tone(156, t, 1.3) * 0.13;
    const scrape = noise() * tone(520 + 110 * tone(0.16, t), t) * 0.055;
    return pan((metal + scrape) * hearing, Math.sin(t * Math.PI / 2) * 0.46);
  }, -19)
};
// Stage 1 is a frozen completed slice. Keep its noise-based effects bit-for-bit
// stable even though later-stage stems are rendered by the same deterministic tool.
noiseState = stageOneEffectNoiseState;

// A short zero crossing at the 16-second seam prevents broadband wind and bow
// grain from clicking when Web Audio loops the stems.
for (const channels of [...Object.values(stems), ...Object.values(stageTwoStems), ...Object.values(stageThreeStems), ...Object.values(stageFourStems)]) for (const channel of channels) {
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

const stageTwoSfx = {
  'crosswind-left-v1.wav': [0.52, (t, d) => pan(env(t, d, 0.008, 0.16) * (noise() * 0.5 + tone(290 - 95 * t / d, t) * 0.25), -0.88 + 0.24 * t / d)],
  'crosswind-right-v1.wav': [0.52, (t, d) => pan(env(t, d, 0.008, 0.16) * (noise() * 0.5 + tone(290 - 95 * t / d, t) * 0.25), 0.88 - 0.24 * t / d)],
  'wind-lock-v1.wav': [0.68, (t, d) => pan(env(t, d, 0.004, 0.28) * (tone(172 + 520 * t / d, t) * 0.62 + tone(344, t) * 0.3 + noise() * Math.exp(-t * 16) * 0.15), 0)],
  'seam-exposed-v1.wav': [0.74, (t, d) => pan(env(t, d, 0.006, 0.34) * (tone(430 + 180 * t / d, t) * 0.55 + tone(645 + 270 * t / d, t) * 0.34), 0.18)],
  'seam-hit-v1.wav': [0.2, (t, d) => pan(env(t, d, 0.002, 0.1) * (tone(1080 - 290 * t / d, t) * 0.74 + noise() * Math.exp(-t * 22) * 0.22), -0.12)],
  'compiler-phase-v1.wav': [0.86, (t, d) => pan(env(t, d, 0.006, 0.34) * (tone(92, t) * 0.5 + tone(184 + 130 * t / d, t) * 0.4 + tone(276 + 195 * t / d, t) * 0.24 + noise() * Math.exp(-t * 8) * 0.16), 0)]
};
const stageThreeSfx = {
  'rain-wet-v1.wav': [0.24, (t, d) => pan(env(t, d, 0.002, 0.15) * (tone(1320 - 620 * t / d, t) * 0.32 + noise() * Math.exp(-t * 24) * 0.26), -0.18 + 0.36 * t / d)],
  'basin-surge-v1.wav': [0.72, (t, d) => pan(env(t, d, 0.006, 0.3) * (tone(76 - 18 * t / d, t) * 0.55 + tone(152, t) * 0.2 + noise() * Math.exp(-t * 7) * 0.34), -0.25 + 0.5 * t / d)],
  'wet-annotation-v1.wav': [0.22, (t, d) => pan(env(t, d, 0.003, 0.12) * (tone(760 + 430 * t / d, t) * 0.62 + tone(1140 + 645 * t / d, t) * 0.24 + noise() * Math.exp(-t * 24) * 0.1), 0.14)],
  'eel-marked-v1.wav': [0.78, (t, d) => pan(env(t, d, 0.008, 0.34) * (tone(168 + 310 * t / d, t) * 0.5 + tone(336 + 620 * t / d, t) * 0.3 + tone(84, t) * 0.18), 0)],
  'eel-hit-v1.wav': [0.24, (t, d) => pan(env(t, d, 0.002, 0.12) * (tone(940 - 270 * t / d, t) * 0.7 + tone(470, t) * 0.26 + noise() * Math.exp(-t * 26) * 0.18), -0.1)],
  'eel-phase-v1.wav': [0.9, (t, d) => pan(env(t, d, 0.008, 0.38) * (tone(58, t) * 0.58 + tone(116 + 88 * t / d, t) * 0.4 + tone(174 + 132 * t / d, t) * 0.22 + noise() * Math.exp(-t * 8) * 0.14), 0)]
};
const stageFourSfx = {
  'heat-wave-v1.wav': [0.46, (t, d) => pan(env(t, d, 0.006, 0.22) * (noise() * 0.38 + tone(94 - 24 * t / d, t) * 0.42), -0.7 + 1.4 * t / d)],
  'cooling-field-v1.wav': [0.68, (t, d) => pan(env(t, d, 0.008, 0.3) * (tone(330 + 420 * t / d, t) * 0.48 + tone(660 + 840 * t / d, t) * 0.22 + noise() * Math.exp(-t * 12) * 0.1), 0)],
  'courier-convert-v1.wav': [0.62, (t, d) => pan(env(t, d, 0.004, 0.28) * (tone(210 + 650 * t / d, t) * 0.55 + tone(420 + 1300 * t / d, t) * 0.24 + noise() * Math.exp(-t * 18) * 0.12), 0.18)],
  'ember-cooled-v1.wav': [0.54, (t, d) => pan(env(t, d, 0.004, 0.26) * (tone(520 + 780 * t / d, t) * 0.5 + tone(260 + 390 * t / d, t) * 0.28 + noise() * Math.exp(-t * 20) * 0.1), -0.12)],
  'wall-hit-v1.wav': [0.25, (t, d) => pan(env(t, d, 0.002, 0.13) * (tone(118 - 34 * t / d, t) * 0.62 + tone(236, t) * 0.2 + noise() * Math.exp(-t * 28) * 0.3), 0.22)],
  'advocate-phase-v1.wav': [0.9, (t, d) => pan(env(t, d, 0.007, 0.38) * (tone(52, t) * 0.56 + tone(104 + 96 * t / d, t) * 0.38 + tone(156 + 144 * t / d, t) * 0.22 + noise() * Math.exp(-t * 9) * 0.14), 0)]
};

for (const [name, channels] of Object.entries(stems)) await writeFile(resolve(output, name), wav(channels));
for (const [name, [duration, synth]] of Object.entries(sfx)) await writeFile(resolve(output, name), wav(render(duration, synth, -18, -6.4)));
for (const [name, channels] of Object.entries(stageTwoStems)) await writeFile(resolve(outputStageTwo, name), wav(channels));
for (const [name, [duration, synth]] of Object.entries(stageTwoSfx)) await writeFile(resolve(outputStageTwo, name), wav(render(duration, synth, -18, -6.4)));
for (const [name, channels] of Object.entries(stageThreeStems)) await writeFile(resolve(outputStageThree, name), wav(channels));
for (const [name, [duration, synth]] of Object.entries(stageThreeSfx)) await writeFile(resolve(outputStageThree, name), wav(render(duration, synth, -18, -6.4)));
for (const [name, channels] of Object.entries(stageFourStems)) await writeFile(resolve(outputStageFour, name), wav(channels));
for (const [name, [duration, synth]] of Object.entries(stageFourSfx)) await writeFile(resolve(outputStageFour, name), wav(render(duration, synth, -18, -6.4)));
console.log(`generated ${Object.keys(stems).length + Object.keys(stageTwoStems).length + Object.keys(stageThreeStems).length + Object.keys(stageFourStems).length} stems and ${Object.keys(sfx).length + Object.keys(stageTwoSfx).length + Object.keys(stageThreeSfx).length + Object.keys(stageFourSfx).length} effects at 44.1 kHz stereo`);
