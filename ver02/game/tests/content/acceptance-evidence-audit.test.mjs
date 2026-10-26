import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { auditAcceptanceEvidence } from "../../scripts/acceptance-evidence-audit-lib.mjs";
import { extractAcceptanceRows } from "../../scripts/acceptance-matrix-audit-lib.mjs";

const rootUrl = new URL("../../../", import.meta.url);
const registryUrl = new URL("phases/phase-10/acceptance-evidence.json", rootUrl);
const matrixUrl = new URL("docs/02-acceptance-matrix.md", rootUrl);

test("Phase 10 evidence registry traces every in-scope requirement to existing artifacts", async () => {
  const registry = JSON.parse(await readFile(registryUrl, "utf8"));
  const acceptanceRows = extractAcceptanceRows(await readFile(matrixUrl, "utf8"));
  const result = await auditAcceptanceEvidence({
    registry,
    acceptanceRows,
    rootDir: fileURLToPath(rootUrl),
    expectedBuildId: "phase10-rc1-20261024",
  });

  assert.equal(result.valid, true, result.failures.join("\n"));
  assert.equal(result.phase10RequirementCount, 67);
  assert.equal(result.tracedRequirementCount, 67);
  assert.equal(result.deferredRequirementCount, 3);
  assert.equal(result.evidenceSetCount, 11);
  assert.equal(registry.accepted, true);
});

test("Phase 10 evidence registry fails closed for missing, duplicate, escaping, and circular traces", async () => {
  const acceptanceRows = [
    { id: "CORE-01", finalVerification: "P10" },
    { id: "REL-04", finalVerification: "P11" },
  ];
  const registry = {
    schemaVersion: 1,
    buildId: "phase10-rc1-20261024",
    recordedOn: "2026-10-25",
    scope: "fixture",
    accepted: false,
    deferredRequirementIds: [],
    evidenceSets: [
      {
        id: "bad",
        requirementIds: ["CORE-01", "CORE-01", "UNKNOWN-01"],
        summary: "fixture",
        limitations: "fixture",
        artifacts: [
          { path: "../outside", kind: "implementation" },
          { path: "docs/02-acceptance-matrix.md", kind: "generated-report" }
        ]
      }
    ]
  };
  const result = await auditAcceptanceEvidence({
    registry,
    acceptanceRows,
    rootDir: fileURLToPath(rootUrl),
    expectedBuildId: "phase10-rc1-20261024",
  });

  assert.equal(result.valid, false);
  assert.match(result.failures.join("\n"), /requirement appears in multiple evidence sets: CORE-01/);
  assert.match(result.failures.join("\n"), /evidence trace is not a Phase 10 requirement: UNKNOWN-01/);
  assert.match(result.failures.join("\n"), /deferredRequirementIds must exactly match/);
  assert.match(result.failures.join("\n"), /artifact path escapes ver02/);
  assert.match(result.failures.join("\n"), /circular requirement document is not evidence/);
});

test("Phase 10 evidence registry permits acceptance only after every in-scope row passes", async () => {
  const artifactPath = "game/tests/content/acceptance-evidence-audit.test.mjs";
  const registry = {
    schemaVersion: 1,
    buildId: "phase10-rc1-20261024",
    recordedOn: "2026-10-25",
    scope: "transition fixture",
    accepted: true,
    deferredRequirementIds: ["REL-04"],
    evidenceSets: [{
      id: "transition",
      requirementIds: ["CORE-01"],
      summary: "fixture",
      limitations: "fixture",
      artifacts: [{ path: artifactPath, kind: "automated-test" }],
    }],
  };
  const passingRows = [
    { id: "CORE-01", finalVerification: "P10", state: "合格" },
    { id: "REL-04", finalVerification: "P11", state: "未着手" },
  ];

  const passing = await auditAcceptanceEvidence({
    registry,
    acceptanceRows: passingRows,
    rootDir: fileURLToPath(rootUrl),
    expectedBuildId: "phase10-rc1-20261024",
  });
  assert.equal(passing.valid, true, passing.failures.join("\n"));

  const nonPassing = await auditAcceptanceEvidence({
    registry,
    acceptanceRows: passingRows.map((row) => row.id === "CORE-01" ? { ...row, state: "実装済み未検証" } : row),
    rootDir: fileURLToPath(rootUrl),
    expectedBuildId: "phase10-rc1-20261024",
  });
  assert.equal(nonPassing.valid, false);
  assert.match(nonPassing.failures.join("\n"), /accepted cannot be true while a Phase 10 acceptance row is non-passing/);
});
