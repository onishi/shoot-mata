import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inspectWav } from "../phase-04/audio-audit.mjs";
import {
  STAGE_01_AUDIO,
  STAGE_01_AUDIO_BIT_DEPTH,
  STAGE_01_AUDIO_CHANNELS,
  STAGE_01_AUDIO_LIMITS,
  STAGE_01_AUDIO_SAMPLE_RATE,
} from "./stage-01-audio-model.mjs";

const assetsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../assets/audio/stage-01");
const manifest = JSON.parse(readFileSync(resolve(assetsRoot, "manifest.json"), "utf8"));

function pcmSamples(file) {
  return Array.from(
    { length: file.readUInt32LE(40) / 2 },
    (_, index) => file.readInt16LE(44 + index * 2) / 32768,
  );
}

test("AV-05/07: 第1面音声は3音楽層と導入・クリア通知を一意に台帳化する", () => {
  assert.equal(new Set(STAGE_01_AUDIO.map(({ id }) => id)).size, STAGE_01_AUDIO.length);
  assert.equal(new Set(STAGE_01_AUDIO.map(({ file }) => file)).size, STAGE_01_AUDIO.length);
  assert.deepEqual(STAGE_01_AUDIO.filter(({ loop }) => loop).map(({ role }) => role), [
    "rhythm music layer", "melody music layer", "danger and boss music layer",
  ]);
  assert.deepEqual(manifest.map(({ id }) => id), STAGE_01_AUDIO.map(({ id }) => id));
});

for (const asset of STAGE_01_AUDIO) {
  test(`${asset.id} meets the PCM, peak, clipping, silence, and manifest budget`, () => {
    const path = resolve(assetsRoot, asset.file);
    const result = inspectWav(path, STAGE_01_AUDIO_LIMITS.silenceThresholdDb);
    assert.equal(result.channels, STAGE_01_AUDIO_CHANNELS);
    assert.equal(result.sampleRate, STAGE_01_AUDIO_SAMPLE_RATE);
    assert.equal(result.bitDepth, STAGE_01_AUDIO_BIT_DEPTH);
    assert.ok(Math.abs(result.durationMs - asset.durationMs) < 0.01);
    assert.ok(result.peakDb >= asset.peakRangeDb[0] && result.peakDb <= asset.peakRangeDb[1], `${result.peakDb} dBFS`);
    assert.equal(result.clippedSamples, STAGE_01_AUDIO_LIMITS.maxClippedSamples);
    assert.ok(result.leadingSilenceMs <= STAGE_01_AUDIO_LIMITS.maxLeadingSilenceMs);
    assert.ok(result.trailingSilenceMs <= STAGE_01_AUDIO_LIMITS.maxTrailingSilenceMs);
    if (asset.loop) assert.ok(result.loopSeamDelta <= STAGE_01_AUDIO_LIMITS.maxLoopSeamDelta, `${result.loopSeamDelta} seam delta`);
    const file = readFileSync(path);
    const entry = manifest.find(({ id }) => id === asset.id);
    assert.equal(entry.bytes, file.length);
    assert.equal(entry.sha256, createHash("sha256").update(file).digest("hex"));
    assert.equal(entry.rights, "project-authored; no third-party samples");
  });
}

test("AV-05: 第1面の同期3層を等倍合成してもピーク余裕を保つ", () => {
  const layers = STAGE_01_AUDIO.filter(({ loop }) => loop).map(({ file }) => (
    pcmSamples(readFileSync(resolve(assetsRoot, file)))
  ));
  const peak = layers[0].reduce((maximum, _, index) => (
    Math.max(maximum, Math.abs(layers.reduce((sum, samples) => sum + samples[index], 0)))
  ), 0);
  const peakDb = 20 * Math.log10(peak);
  assert.ok(peakDb <= STAGE_01_AUDIO_LIMITS.maxMixedPeakDb, `${peakDb} dBFS mixed peak`);
});
