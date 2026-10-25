import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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

test("Phase 10 RC: release evidence rejects contradictory duplicate JSON keys", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "shoot-mata-release-audit-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourcePath = resolve(process.cwd(), "../phases/phase-10/release-artifact-audit.json");
  const fixturePath = join(directory, "release-artifact-audit.json");
  const source = await readFile(sourcePath, "utf8");
  await writeFile(fixturePath, source.replace(
    '"status": "pass",',
    '"status": "fail",\n  "status": "pass",',
  ));

  await assert.rejects(
    auditReleaseArtifact({ evidencePath: fixturePath }),
    /duplicate key "status" at \$\.automatedSuite\.status/,
  );
});
