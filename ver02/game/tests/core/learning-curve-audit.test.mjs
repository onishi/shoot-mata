import test from "node:test";
import assert from "node:assert/strict";
import { auditLearningCurve } from "../../src/core/learning-curve-audit.mjs";

test("PROG-06/STG-06: 予告、段階導入、被弾位置、最終面の武器判断を再現する", () => {
  const first = auditLearningCurve();
  const replay = auditLearningCurve();
  assert.deepEqual(replay, first);
  assert.equal(first.violations.length, 0);
  assert.equal(first.stages.length, 4);
  assert.equal(first.stages.flatMap(({ runs }) => runs).length, 12);
  assert.ok(first.stages.every(({ runs }) => runs.every(({ status }) => status === "cleared")));
  assert.ok(first.stages.every(({ runs }) => runs.every(({ telegraphs }) => (
    telegraphs.every(({ leadTicks }) => leadTicks === first.thresholds.telegraphTicks)
  ))));
  assert.ok(first.stages.every(({ sectionHits, verticalBandHits }) => (
    sectionHits.total === verticalBandHits.total
  )));
  assert.deepEqual(first.finale.weaponsUsed, ["blue", "red", "yellow"]);
  assert.ok(first.finale.exchanges > 0);
});
