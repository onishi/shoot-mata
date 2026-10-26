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

test("Phase 10 RC: recorded verification, asset, and rights claims must match audited facts", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "shoot-mata-release-claims-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourcePath = resolve(process.cwd(), "../phases/phase-10/release-artifact-audit.json");
  const fixturePath = join(directory, "release-artifact-audit.json");
  const evidence = JSON.parse(await readFile(sourcePath, "utf8"));
  evidence.automatedSuite.status = "fail";
  evidence.automatedSuite.testCount = 1;
  evidence.automatedSuite.scope = "partial suite";
  evidence.staticAudit.status = "fail";
  evidence.staticAudit.unexpectedFileTypeCount = 1;
  evidence.assets.finalCount -= 1;
  evidence.assets.missingRuntimeAssetCount = 1;
  evidence.assets.thirdPartyAssetCount = 1;
  evidence.assets.noticePath = "game/public/WRONG.html";
  evidence.rights.noticeMatchesLedger = false;
  evidence.rights.legalAdvice = true;
  evidence.rights.nonInfringementGuaranteed = true;
  await writeFile(fixturePath, JSON.stringify(evidence));

  const result = await auditReleaseArtifact({ evidencePath: fixturePath });
  assert.match(result.failures.join("\n"), /automated suite is not recorded as pass/);
  assert.match(result.failures.join("\n"), /automated suite test count must be 229/);
  assert.match(result.failures.join("\n"), /automated suite scope differs from the audited suite/);
  assert.match(result.failures.join("\n"), /static audit is not recorded as pass/);
  assert.match(result.failures.join("\n"), /unexpected file type result differs from evidence/);
  assert.match(result.failures.join("\n"), /final asset count differs from evidence/);
  assert.match(result.failures.join("\n"), /missing runtime asset count differs from evidence/);
  assert.match(result.failures.join("\n"), /third-party asset count differs from evidence/);
  assert.match(result.failures.join("\n"), /rights notice path differs from evidence/);
  assert.match(result.failures.join("\n"), /rights notice is not recorded as matching the ledger/);
  assert.match(result.failures.join("\n"), /legal-advice limitation/);
  assert.match(result.failures.join("\n"), /must not claim a non-infringement guarantee/);
});
