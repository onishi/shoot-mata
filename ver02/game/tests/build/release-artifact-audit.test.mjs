import assert from "node:assert/strict";
import test from "node:test";
import { auditReleaseArtifact } from "../../scripts/release-artifact-audit-lib.mjs";

test("Phase 10 RC: static artifact, notices, rights ledger, and dependencies match one build", async () => {
  const result = await auditReleaseArtifact();
  assert.deepEqual(result.failures, []);
  assert.equal(result.buildId, "phase10-rc1-20261024");
  assert.equal(result.fileCount, 100);
  assert.equal(result.imageCount, 32);
  assert.equal(result.audioCount, 29);
  assert.equal(result.dependencyCount, 0);
});
