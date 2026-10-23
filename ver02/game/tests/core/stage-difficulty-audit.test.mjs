import test from "node:test";
import assert from "node:assert/strict";
import { auditStageDifficulty } from "../../src/core/stage-difficulty-audit.mjs";

test("STG-06: 4面の負荷曲線と複数seed完走を同じ入力方針で再現する", () => {
  const first = auditStageDifficulty();
  const replay = auditStageDifficulty();
  assert.deepEqual(replay, first);
  assert.equal(first.violations.length, 0);
  assert.deepEqual(first.stages.map(({ pressure }) => ({
    durationTicks: pressure.durationTicks,
    enemyCount: pressure.enemyCount,
    totalHostileHitPoints: pressure.totalHostileHitPoints,
    cumulativeMechanics: pressure.cumulativeMechanics,
  })), [
    { durationTicks: 3600, enemyCount: 22, totalHostileHitPoints: 360, cumulativeMechanics: 7 },
    { durationTicks: 3720, enemyCount: 24, totalHostileHitPoints: 404, cumulativeMechanics: 16 },
    { durationTicks: 4080, enemyCount: 30, totalHostileHitPoints: 486, cumulativeMechanics: 25 },
    { durationTicks: 4440, enemyCount: 32, totalHostileHitPoints: 623, cumulativeMechanics: 34 },
  ]);
  assert.equal(first.stages.flatMap(({ runs }) => runs).length, 12);
  assert.ok(first.stages.every(({ runs }) => runs.every(({ status, bossTicks }) => (
    status === "cleared" && Number.isInteger(bossTicks) && bossTicks > 0
  ))));
  assert.deepEqual(first.finale.coreColors, ["core-red", "core-blue", "core-yellow"]);
  assert.equal(first.finale.requiredBehaviors.length, 8);
});
