import assert from "node:assert/strict";
import test from "node:test";
import { auditAudioRuntime } from "../../scripts/audio-runtime-audit-lib.mjs";

test("AV-05/06・A11Y-01: 全4面の音量、音層遷移、6分同期、欠落縮退を監査する", async () => {
  const first = await auditAudioRuntime();
  const replay = await auditAudioRuntime();
  assert.deepEqual(replay, first);
  assert.equal(first.violations.length, 0);
  assert.equal(first.soakSeconds >= first.thresholds.minimumSoakSeconds, true);
  assert.equal(first.stages.length, 4);
  for (const stage of first.stages) {
    assert.equal(stage.sampleRate, 48_000);
    assert.equal(stage.driftSamples, 0);
    assert.equal(stage.mixedPeakDb.bossAtUnity <= -first.thresholds.minimumBossMixHeadroomDb, true);
    assert.equal(stage.transition.retainedLayerCount, 2);
    assert.equal(stage.transition.addedLayerCount, 1);
    assert.equal(stage.transition.addedLayerOffsetSeconds, stage.transition.expectedOffsetSeconds);
    assert.deepEqual(stage.transition.missingDanger, {
      stagePlaybackContinues: true,
      bossPlaybackRejected: true,
      warning: "audio-source-missing",
    });
  }
  assert.deepEqual(first.volumeProfiles.map(({ actualGains }) => actualGains), [
    [0.8, 0.8], [0, 0.8], [0.8, 0], [0.45, 0.65],
  ]);
});
