import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AUDIO_BIT_DEPTH, AUDIO_CHANNELS, AUDIO_LIMITS, AUDIO_SAMPLE_RATE, REFERENCE_AUDIO } from "./audio-model.mjs";
import { inspectWav } from "./audio-audit.mjs";

const assetsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../assets/audio/reference");
const manifest = JSON.parse(readFileSync(resolve(assetsRoot, "manifest.json"), "utf8"));

test("reference audio roles and filenames are unique", () => {
  assert.equal(new Set(REFERENCE_AUDIO.map(({ id }) => id)).size, REFERENCE_AUDIO.length);
  assert.equal(new Set(REFERENCE_AUDIO.map(({ file }) => file)).size, REFERENCE_AUDIO.length);
  assert.equal(new Set(REFERENCE_AUDIO.map(({ role }) => role)).size, REFERENCE_AUDIO.length);
  assert.ok(REFERENCE_AUDIO.some(({ loop }) => loop));
  assert.deepEqual(manifest.map(({ id }) => id), REFERENCE_AUDIO.map(({ id }) => id));
});

for (const asset of REFERENCE_AUDIO) {
  test(`${asset.id} meets the PCM, peak, clipping, and silence budget`, () => {
    const result = inspectWav(resolve(assetsRoot, asset.file), AUDIO_LIMITS.silenceThresholdDb);
    assert.equal(result.channels, AUDIO_CHANNELS);
    assert.equal(result.sampleRate, AUDIO_SAMPLE_RATE);
    assert.equal(result.bitDepth, AUDIO_BIT_DEPTH);
    assert.ok(Math.abs(result.durationMs - asset.durationMs) < 0.01);
    assert.ok(result.peakDb >= asset.peakRangeDb[0] && result.peakDb <= asset.peakRangeDb[1], `${result.peakDb} dBFS`);
    assert.equal(result.clippedSamples, AUDIO_LIMITS.maxClippedSamples);
    assert.ok(result.leadingSilenceMs <= AUDIO_LIMITS.maxLeadingSilenceMs, `${result.leadingSilenceMs}ms leading silence`);
    assert.ok(result.trailingSilenceMs <= AUDIO_LIMITS.maxTrailingSilenceMs, `${result.trailingSilenceMs}ms trailing silence`);
    if (asset.loop) {
      assert.ok(result.loopSeamDelta <= AUDIO_LIMITS.maxLoopSeamDelta, `${result.loopSeamDelta} seam delta`);
    }
    const file = readFileSync(resolve(assetsRoot, asset.file));
    const manifestEntry = manifest.find(({ id }) => id === asset.id);
    assert.equal(manifestEntry.bytes, file.length);
    assert.equal(manifestEntry.sha256, createHash("sha256").update(file).digest("hex"));
    assert.equal(manifestEntry.rights, "project-authored; no third-party samples");
  });
}

test("audio inspector rejects a non-WAVE file", () => {
  assert.throws(() => inspectWav(fileURLToPath(import.meta.url)), /not a RIFF\/WAVE/);
});
