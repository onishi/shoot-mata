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
  assert.equal(result.monitoringRunCount, 1);
  assert.equal(result.successfulRunCount, 1);
  assert.equal(result.rightsReviewCount, 1);
  assert.equal(result.improvementTriageCount, 1);
  assert.equal(result.phaseReviewStatus, "completed");
});

test("Phase 12 operations registry rejects an unsupported completion review", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "shoot-mata-phase-review-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourcePath = resolve(process.cwd(), "../phases/phase-12/operations.json");
  const fixturePath = join(directory, "operations.json");
  const operations = JSON.parse(await readFile(sourcePath, "utf8"));
  operations.phaseReview.status = "in-progress";
  operations.phaseReview.successfulMonitoringRuns = 0;
  operations.phaseReview.residualRiskIds = operations.phaseReview.residualRiskIds.slice(1);
  await writeFile(fixturePath, JSON.stringify(operations));

  const result = await auditOperations({ operationsPath: fixturePath });
  assert.match(result.failures.join("\n"), /review status must be completed/);
  assert.match(result.failures.join("\n"), /monitoring run count differs/);
  assert.match(result.failures.join("\n"), /residual risks differ from registry/);
});

test("Phase 12 operations registry rejects incomplete rights review evidence", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "shoot-mata-rights-review-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourcePath = resolve(process.cwd(), "../phases/phase-12/operations.json");
  const fixturePath = join(directory, "operations.json");
  const operations = JSON.parse(await readFile(sourcePath, "utf8"));
  operations.rightsReviews[0].serviceTerms.updated = "2026-01-01";
  operations.rightsReviews[0].nonInfringementGuaranteed = true;
  operations.rightsReviews[0].nextReviewOn = operations.rightsReviews[0].reviewedOn;
  await writeFile(fixturePath, JSON.stringify(operations));

  const result = await auditOperations({ operationsPath: fixturePath });
  assert.match(result.failures.join("\n"), /Service Terms update differs/);
  assert.match(result.failures.join("\n"), /must not guarantee non-infringement/);
  assert.match(result.failures.join("\n"), /next review must follow review date/);
});

test("Phase 12 operations registry rejects incomplete improvement triage", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "shoot-mata-improvement-triage-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourcePath = resolve(process.cwd(), "../phases/phase-12/operations.json");
  const fixturePath = join(directory, "operations.json");
  const operations = JSON.parse(await readFile(sourcePath, "utf8"));
  operations.improvementTriages[0].reviewedBacklogIds = ["R-001", "R-002"];
  operations.improvementTriages[0].issueSource.openCount = -1;
  operations.improvementTriages[0].decision = "";
  await writeFile(fixturePath, JSON.stringify(operations));

  const result = await auditOperations({ operationsPath: fixturePath });
  assert.match(result.failures.join("\n"), /invalid open issue count/);
  assert.match(result.failures.join("\n"), /reviewed backlog IDs differ/);
  assert.match(result.failures.join("\n"), /decision is missing/);
});

test("Phase 12 operations registry rejects incomplete or mismatched successful run evidence", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "shoot-mata-monitoring-run-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourcePath = resolve(process.cwd(), "../phases/phase-12/operations.json");
  const fixturePath = join(directory, "operations.json");
  const operations = JSON.parse(await readFile(sourcePath, "utf8"));
  operations.monitoringRuns[0].url = "https://github.com/onishi/shoot-mata/actions/runs/1";
  operations.monitoringRuns[0].productionAudit.fileCount = 99;
  operations.monitoringRuns[0].dependencyAudit.vulnerabilities = 1;
  await writeFile(fixturePath, JSON.stringify(operations));

  const result = await auditOperations({ operationsPath: fixturePath });
  assert.match(result.failures.join("\n"), /run URL differs from ID/);
  assert.match(result.failures.join("\n"), /production file count differs/);
  assert.match(result.failures.join("\n"), /dependency vulnerabilities must be zero/);
});

test("Phase 12 operations registry rejects a failed or out-of-order latest monitoring run", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "shoot-mata-latest-monitoring-run-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourcePath = resolve(process.cwd(), "../phases/phase-12/operations.json");
  const fixturePath = join(directory, "operations.json");
  const operations = JSON.parse(await readFile(sourcePath, "utf8"));
  const latestRun = structuredClone(operations.monitoringRuns[0]);
  latestRun.id += 1;
  latestRun.runNumber = 1;
  latestRun.status = "failed";
  latestRun.startedAt = "2026-10-26T05:49:00Z";
  latestRun.completedAt = "2026-10-26T05:50:00Z";
  latestRun.url = `https://github.com/onishi/shoot-mata/actions/runs/${latestRun.id}`;
  operations.monitoringRuns.push(latestRun);
  operations.phaseReview.successfulMonitoringRuns = 1;
  await writeFile(fixturePath, JSON.stringify(operations));

  const result = await auditOperations({ operationsPath: fixturePath });
  assert.match(result.failures.join("\n"), /run numbers must increase/);
  assert.match(result.failures.join("\n"), /run starts before the previous run completed/);
  assert.match(result.failures.join("\n"), /latest monitoring run must pass/);
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
