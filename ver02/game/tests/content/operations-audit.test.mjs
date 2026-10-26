import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { auditOperations } from "../../scripts/operations-audit-lib.mjs";

test("Phase 12 operations registry covers the published release and required domains", async () => {
  const result = await auditOperations();
  assert.deepEqual(result.failures, []);
  assert.equal(result.buildId, "phase10-rc1-20261024");
  assert.equal(result.controlCount, 6);
  assert.equal(result.riskCount, 7);
  assert.equal(result.workItemCount, 5);
});

test("Phase 12 operations registry rejects release drift and missing monitoring domains", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "shoot-mata-operations-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourcePath = resolve(process.cwd(), "../phases/phase-12/operations.json");
  const fixturePath = join(directory, "operations.json");
  const operations = JSON.parse(await readFile(sourcePath, "utf8"));
  operations.release.buildId = "unpublished-build";
  operations.controls = operations.controls.filter(({ domain }) => domain !== "dependencies");
  await writeFile(fixturePath, JSON.stringify(operations));

  const result = await auditOperations({ operationsPath: fixturePath });
  assert.match(result.failures.join("\n"), /buildId differs from published release/);
  assert.match(result.failures.join("\n"), /controls omit dependencies/);
});

test("Phase 12 operations registry rejects closing unverified residual risks", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "shoot-mata-risks-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourcePath = resolve(process.cwd(), "../phases/phase-12/operations.json");
  const fixturePath = join(directory, "operations.json");
  const operations = JSON.parse(await readFile(sourcePath, "utf8"));
  operations.residualRisks[0].status = "resolved";
  operations.residualRisks[0].verified = true;
  await writeFile(fixturePath, JSON.stringify(operations));

  const result = await auditOperations({ operationsPath: fixturePath });
  assert.match(result.failures.join("\n"), /unresolved residual risk must remain monitoring/);
  assert.match(result.failures.join("\n"), /cannot be marked verified without evidence/);
});
