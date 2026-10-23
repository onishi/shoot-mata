import test from "node:test";
import assert from "node:assert/strict";
import { STAGE_01_ORBITAL_WRECK } from "../../src/content/stages/stage-01-orbital-wreck.mjs";
import { STAGE_02_CLOUD_REFINERY } from "../../src/content/stages/stage-02-cloud-refinery.mjs";
import { STAGE_03_LIVING_ARK } from "../../src/content/stages/stage-03-living-ark.mjs";
import { STAGE_04_STELLAR_FURNACE } from "../../src/content/stages/stage-04-stellar-furnace.mjs";
import { auditStageCoreSupply } from "../../src/core/core-supply-audit.mjs";
import { MAX_CORE_DROUGHT_DROPS } from "../../src/core/stage-schedule.mjs";

const STAGES = [
  STAGE_01_ORBITAL_WRECK,
  STAGE_02_CLOUD_REFINERY,
  STAGE_03_LIVING_ARK,
  STAGE_04_STELLAR_FURNACE,
];

test("CORE-07: 4面の各色は複数seedで欠落せず、連続10ドロップを超えて枯渇しない", () => {
  for (const stage of STAGES) {
    const audit = auditStageCoreSupply(stage, { seedCount: 4096 });
    assert.equal(audit.violations.length, 0, stage.id);
    for (const color of ["red", "blue", "yellow"]) {
      assert.ok(audit.minimumCount[color] > 0, `${stage.id} ${color}`);
      assert.ok(audit.maximumMissedDrops[color].value <= MAX_CORE_DROUGHT_DROPS, `${stage.id} ${color}`);
      assert.ok(audit.maximumGapTicks[color].value <= 1600, `${stage.id} ${color}`);
    }
  }
});

test("CORE-07: auditは不正なseed範囲を拒否する", () => {
  assert.throws(() => auditStageCoreSupply(STAGES[0], { seedCount: 0 }), /seedCount/);
  assert.throws(() => auditStageCoreSupply(STAGES[0], { seedStart: 0xffffffff, seedCount: 2 }), /seed range/);
});
