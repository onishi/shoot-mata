import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultSaveData,
  decodeSaveData,
  encodeSaveData,
  markTutorialSeen,
  recordStageClear,
  updateSettings,
  validateSaveData,
} from "../../src/core/save-data.mjs";

function result(stageIndex, difficulty, score) {
  return {
    stageIndex,
    difficulty,
    score,
    breakdown: { enemies: score - 60, cores: 20, streak: 30, noDamage: 10 },
    coreQueue: ["red", "blue", "yellow"],
  };
}

test("PROG-01: 初期状態、説明済み状態、面クリアごとの解放を分離して更新する", () => {
  const initial = createDefaultSaveData();
  assert.equal(initial.progress.maxUnlockedStage, 0);
  assert.equal(initial.progress.tutorialSeen, false);
  assert.ok(initial.progress.stages.every((stage) => !stage.cleared.standard));

  const tutorialSeen = markTutorialSeen(initial);
  const stageOneClear = recordStageClear(tutorialSeen, result(0, "standard", 100));
  assert.equal(stageOneClear.progress.tutorialSeen, true);
  assert.equal(stageOneClear.progress.maxUnlockedStage, 1);
  assert.equal(stageOneClear.progress.stages[0].cleared.standard, true);
  assert.equal(initial.progress.tutorialSeen, false);
  assert.equal(initial.progress.maxUnlockedStage, 0);
});

test("PROG-02/A11Y-01/02: 難度、音量、ミュート、表示設定を検査して保存モデルへ反映する", () => {
  const initial = createDefaultSaveData();
  const updated = updateSettings(initial, {
    difficulty: "assist",
    bgmVolume: 0.25,
    sfxVolume: 0,
    bgmMuted: true,
    reducedMotion: true,
    reducedFlashes: true,
    highContrast: true,
  });
  assert.equal(updated.settings.difficulty, "assist");
  assert.equal(updated.settings.bgmVolume, 0.25);
  assert.equal(updated.settings.sfxMuted, false);
  assert.equal(updated.settings.reducedMotion, true);
  assert.throws(() => updateSettings(updated, { bgmVolume: 1.1 }), /invalid settings/);
  assert.throws(() => updateSettings(updated, { unknown: true }), /settings patch/);
});

test("PROG-04: 面・難度別のクリアとbestを分離し、低い再記録でbestを失わない", () => {
  let data = createDefaultSaveData();
  data = recordStageClear(data, result(0, "standard", 300));
  data = recordStageClear(data, result(0, "standard", 200));
  data = recordStageClear(data, result(0, "assist", 500));
  data = recordStageClear(data, result(1, "standard", 400));

  assert.equal(data.progress.stages[0].best.standard.score, 300);
  assert.equal(data.progress.stages[0].best.assist.score, 500);
  assert.equal(data.progress.stages[1].best.standard.score, 400);
  assert.deepEqual(data.progress.stages[0].best.standard.breakdown,
    { enemies: 240, cores: 20, streak: 30, noDamage: 10 });
  assert.deepEqual(data.progress.stages[0].best.standard.coreQueue, ["red", "blue", "yellow"]);
  assert.equal(data.progress.maxUnlockedStage, 2);
});

test("PROG-05: version 1を往復し、破損・未来versionを初期値へ送れる結果にする", () => {
  const data = recordStageClear(createDefaultSaveData(), result(0, "standard", 100));
  const decoded = decodeSaveData(encodeSaveData(data));
  assert.equal(decoded.ok, true);
  assert.equal(decoded.migrated, false);
  assert.deepEqual(decoded.data, data);

  assert.deepEqual(decodeSaveData("{"), { ok: false, reason: "invalid-json" });
  assert.deepEqual(decodeSaveData('{"version":99}'), { ok: false, reason: "future-version" });
  assert.equal(validateSaveData({ ...data, extra: true }), false);
});

test("PROG-05: version 0から進行と有効な設定を移行する", () => {
  const legacy = JSON.stringify({
    version: 0,
    tutorialSeen: true,
    unlockedStage: 2,
    settings: { difficulty: "assist", bgmVolume: 0.4, reducedMotion: true },
  });
  const decoded = decodeSaveData(legacy);
  assert.equal(decoded.ok, true);
  assert.equal(decoded.migrated, true);
  assert.equal(decoded.data.version, 1);
  assert.equal(decoded.data.progress.maxUnlockedStage, 2);
  assert.equal(decoded.data.settings.difficulty, "assist");
  assert.equal(decoded.data.settings.bgmVolume, 0.4);
  assert.equal(decoded.data.settings.sfxVolume, 0.8);

  const invalid = JSON.stringify({ ...JSON.parse(legacy), settings: { bgmVolume: 4 } });
  assert.deepEqual(decodeSaveData(invalid), { ok: false, reason: "migration-failed" });
});
