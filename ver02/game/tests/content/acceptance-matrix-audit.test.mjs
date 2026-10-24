import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { auditAcceptanceMatrix } from "../../scripts/acceptance-matrix-audit-lib.mjs";

const requirementsUrl = new URL("../../../docs/02-product-requirements.md", import.meta.url);
const matrixUrl = new URL("../../../docs/02-acceptance-matrix.md", import.meta.url);
const baselineUrl = new URL("../../../phases/phase-10/acceptance-baseline.json", import.meta.url);

test("Phase 10 acceptance audit rejects missing, duplicate, unknown, and malformed rows", () => {
  const requirements = "| ID | 必須要件 |\n| --- | --- |\n| CORE-01 | one |\n| CORE-02 | two |";
  const matrix = [
    "| ID | 実装 | 最終検証 | 合格条件・証拠 | 状態 |",
    "| --- | --- | --- | --- | --- |",
    "| CORE-01 | P03 | P10 | evidence | 合格 |",
    "| CORE-01 | P03 | P10 | evidence | 合格 |",
    "| EXTRA-01 | P03 | P10 | | 未知状態 |",
  ].join("\n");

  const result = auditAcceptanceMatrix(requirements, matrix);
  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /duplicate acceptance row: CORE-01/);
  assert.match(result.failures.join("\n"), /missing acceptance row: CORE-02/);
  assert.match(result.failures.join("\n"), /unknown acceptance row: EXTRA-01/);
  assert.match(result.failures.join("\n"), /EXTRA-01: evidence description is required/);
  assert.match(result.failures.join("\n"), /EXTRA-01: invalid state 未知状態/);
});

test("requirement families with digits are included in coverage and state counts", () => {
  const requirements = [
    "| ID | 必須要件 |",
    "| --- | --- |",
    "| A11Y-01 | accessible audio |",
    "| CORE-01 | core identity |",
  ].join("\n");
  const matrix = [
    "| ID | 実装 | 最終検証 | 合格条件・証拠 | 状態 |",
    "| --- | --- | --- | --- | --- |",
    "| A11Y-01 | P05 | P08, P10 | evidence | 実装済み未検証 |",
    "| CORE-01 | P03 | P10 | evidence | 合格 |",
  ].join("\n");

  const result = auditAcceptanceMatrix(requirements, matrix);

  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(result.requirementCount, 2);
  assert.equal(result.acceptanceRowCount, 2);
  assert.equal(result.phase10RequiredCount, 2);
  assert.equal(result.stateCounts.実装済み未検証, 1);
  assert.equal(result.stateCounts.合格, 1);
});

test("a missing requirement family with digits fails closed", () => {
  const requirements = "| ID | 必須要件 |\n| --- | --- |\n| A11Y-01 | accessible audio |";
  const matrix = "| ID | 実装 | 最終検証 | 合格条件・証拠 | 状態 |\n| --- | --- | --- | --- | --- |";

  const result = auditAcceptanceMatrix(requirements, matrix);

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /missing acceptance row: A11Y-01/);
});

test("Phase 10 entry baseline stays immutable while the current matrix progresses", async () => {
  const requirements = await readFile(requirementsUrl, "utf8");
  const matrix = await readFile(matrixUrl, "utf8");
  const baseline = JSON.parse(await readFile(baselineUrl, "utf8"));
  const result = auditAcceptanceMatrix(requirements, matrix);

  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(result.requirementCount, 70);
  assert.equal(result.acceptanceRowCount, 70);
  assert.equal(result.phase10RequiredCount, baseline.phase10RequiredCount);
  assert.equal(result.postPhase10Count, baseline.postPhase10Count);
  assert.deepEqual(baseline.stateCounts, {
    未着手: 4,
    実装中: 19,
    実装済み未検証: 47,
    合格: 0,
    不合格: 0,
    ブロック: 0,
  });
  assert.equal(Object.values(result.stateCounts).reduce((sum, count) => sum + count, 0), 70);
  assert.equal(baseline.accepted, false);
  assert.equal(baseline.stateCounts.合格, 0);
});
