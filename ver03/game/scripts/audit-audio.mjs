import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AUDIO_ASSETS } from "../src/browser/audio.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BGM_VOLUME = 0.65;
const SFX_VOLUME = 0.45;
const FIRE_RATES = Object.freeze({ pulse: 7.5, lance: 5, spread: 4, seeker: 3 });

function readWave(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WAVE");
  let offset = 12;
  let format;
  let data;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") format = {
      encoding: buffer.readUInt16LE(body), channels: buffer.readUInt16LE(body + 2),
      sampleRate: buffer.readUInt32LE(body + 4), bits: buffer.readUInt16LE(body + 14)
    };
    if (id === "data") data = buffer.subarray(body, body + size);
    offset = body + size + (size % 2);
  }
  assert.deepEqual({ encoding: format?.encoding, bits: format?.bits }, { encoding: 1, bits: 16 });
  assert.ok(data?.length > 0);
  let power = 0;
  let peak = 0;
  const samples = data.length / 2;
  for (let index = 0; index < samples; index += 1) {
    const value = data.readInt16LE(index * 2) / 32_768;
    power += value * value;
    peak = Math.max(peak, Math.abs(value));
  }
  return { rms: Math.sqrt(power / samples), peak, duration: samples / format.channels / format.sampleRate };
}

function db(value) {
  return 20 * Math.log10(Math.max(value, 1e-12));
}

const measurements = new Map();
for (const asset of AUDIO_ASSETS) {
  const file = path.join(root, asset.url.replace(/^\.\//, ""));
  measurements.set(asset.id, await readWave(await readFile(file)));
}

function combinedRms(ids, groupVolume, duty = {}) {
  const power = ids.reduce((sum, id) => {
    const asset = AUDIO_ASSETS.find((candidate) => candidate.id === id);
    const measured = measurements.get(id);
    const activeRatio = Math.min(1, duty[id] ?? 1);
    return sum + measured.rms ** 2 * asset.level ** 2 * groupVolume ** 2 * activeRatio;
  }, 0);
  return Math.sqrt(power);
}

const normalBgm = combinedRms(["stage-rhythm", "stage-melody"], BGM_VOLUME);
const bossBgm = combinedRms(["stage-rhythm", "stage-melody", "stage-danger"], BGM_VOLUME);
let loudestFire = { weapon: "pulse", rms: 0 };
for (const weapon of ["lance", "spread", "seeker"]) {
  const ids = ["pulse", weapon];
  const duty = Object.fromEntries(ids.map((id) => [id, FIRE_RATES[id] * measurements.get(id).duration]));
  const rms = combinedRms(ids, SFX_VOLUME, duty);
  if (rms > loudestFire.rms) loudestFire = { weapon, rms };
}

const marginDb = db(loudestFire.rms) - db(normalBgm);
const hottestAssetPeak = Math.max(...AUDIO_ASSETS.map((asset) => (
  measurements.get(asset.id).peak * asset.level * (asset.group === "bgm" ? BGM_VOLUME : SFX_VOLUME)
)));

assert.ok(marginDb <= 3, `continuous fire exceeds BGM by ${marginDb.toFixed(2)} dB`);
assert.ok(hottestAssetPeak < 1, `single asset clips at ${hottestAssetPeak.toFixed(3)}`);
assert.equal(AUDIO_ASSETS.filter(({ group }) => group === "bgm").length, 3);
assert.ok(AUDIO_ASSETS.filter(({ group }) => group === "sfx").length >= 10);

console.log(`Audio audit passed: normal BGM ${db(normalBgm).toFixed(1)} dBFS RMS, boss ${db(bossBgm).toFixed(1)} dBFS RMS`);
console.log(`Loudest continuous fire: PULSE + ${loudestFire.weapon.toUpperCase()} ${db(loudestFire.rms).toFixed(1)} dBFS RMS (${marginDb.toFixed(1)} dB vs BGM)`);
console.log(`Hottest single-source peak: ${db(hottestAssetPeak).toFixed(1)} dBFS; master limiter ceiling -1.0 dBFS`);
