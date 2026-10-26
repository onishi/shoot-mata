import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseJsonWithUniqueKeys } from "./strict-json.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = resolve(SCRIPT_DIR, "..");
const VER02_DIR = resolve(GAME_DIR, "..");
const ROOT_DIR = resolve(VER02_DIR, "..");
const OPERATIONS_PATH = resolve(VER02_DIR, "phases", "phase-12", "operations.json");
const RELEASE_PATH = resolve(VER02_DIR, "phases", "phase-11", "release.json");
const REQUIRED_DOMAINS = new Set([
  "availability-integrity",
  "compatibility",
  "performance",
  "dependencies",
  "rights",
  "improvements",
]);
const REQUIRED_RISKS = new Set([
  "RISK-SAFARI",
  "RISK-IOS",
  "RISK-ANDROID",
  "RISK-LOW-END",
  "RISK-SUBJECTIVE",
  "RISK-GENERATED-RIGHTS",
  "RISK-FUTURE-COMPAT",
]);
const PRIORITIES = new Set(["P0", "P1", "P2", "P3"]);

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function duplicates(values) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

export async function auditOperations({ operationsPath = OPERATIONS_PATH, releasePath = RELEASE_PATH } = {}) {
  const failures = [];
  const readJson = async (path) => parseJsonWithUniqueKeys(await readFile(path, "utf8"), path);
  const [operations, release] = await Promise.all([readJson(operationsPath), readJson(releasePath)]);

  assert(operations.schemaVersion === 1, "operations schemaVersion must be 1", failures);
  assert(operations.phase === "12", "operations phase must be 12", failures);
  assert(operations.release?.version === release.version, "operations version differs from published release", failures);
  assert(operations.release?.buildId === release.buildId, "operations buildId differs from published release", failures);
  assert(operations.release?.manifestSha256 === release.releaseCandidate?.manifestSha256, "operations manifest hash differs from published release", failures);
  assert(operations.release?.fileCount === release.releaseCandidate?.fileCount, "operations file count differs from published release", failures);
  assert(operations.release?.totalBytes === release.releaseCandidate?.totalBytes, "operations byte count differs from published release", failures);
  assert(operations.release?.siteUrl === release.production?.siteUrl, "operations site URL differs from published release", failures);
  assert(operations.release?.entrypointUrl === release.production?.entrypointUrl, "operations entrypoint URL differs from published release", failures);

  const controls = Array.isArray(operations.controls) ? operations.controls : [];
  const controlIds = controls.map(({ id }) => id);
  const domains = new Set(controls.map(({ domain }) => domain));
  assert(duplicates(controlIds).length === 0, "operations controls contain duplicate IDs", failures);
  for (const domain of REQUIRED_DOMAINS) assert(domains.has(domain), `operations controls omit ${domain}`, failures);
  for (const control of controls) {
    assert(typeof control.id === "string" && control.id.length > 0, "operations control has no ID", failures);
    assert(typeof control.cadence === "string" && control.cadence.length > 0, `${control.id}: cadence is missing`, failures);
    assert(typeof control.command === "string" && control.command.length > 0, `${control.id}: command is missing`, failures);
    assert(PRIORITIES.has(control.failurePriority), `${control.id}: invalid failure priority`, failures);
  }

  const risks = Array.isArray(operations.residualRisks) ? operations.residualRisks : [];
  const riskIds = risks.map(({ id }) => id);
  assert(duplicates(riskIds).length === 0, "operations residual risks contain duplicate IDs", failures);
  for (const id of REQUIRED_RISKS) assert(riskIds.includes(id), `operations residual risks omit ${id}`, failures);
  for (const risk of risks) {
    assert(PRIORITIES.has(risk.priority), `${risk.id}: invalid risk priority`, failures);
    assert(risk.status === "monitoring", `${risk.id}: unresolved residual risk must remain monitoring`, failures);
    assert(risk.verified === false, `${risk.id}: residual risk cannot be marked verified without evidence`, failures);
    assert(typeof risk.trigger === "string" && risk.trigger.length > 0, `${risk.id}: trigger is missing`, failures);
  }

  const workItems = Array.isArray(operations.workItems) ? operations.workItems : [];
  const workIds = workItems.map(({ id }) => id);
  assert(workItems.length > 0, "operations work items are missing", failures);
  assert(duplicates(workIds).length === 0, "operations work items contain duplicate IDs", failures);
  for (const item of workItems) {
    assert(PRIORITIES.has(item.priority), `${item.id}: invalid work priority`, failures);
    assert(["active", "monitoring", "open"].includes(item.status), `${item.id}: invalid work status`, failures);
    assert(typeof item.trigger === "string" && item.trigger.length > 0, `${item.id}: trigger is missing`, failures);
    assert(typeof item.nextAction === "string" && item.nextAction.length > 0, `${item.id}: next action is missing`, failures);
  }

  const monitoringRuns = Array.isArray(operations.monitoringRuns) ? operations.monitoringRuns : [];
  const runIds = monitoringRuns.map(({ id }) => id);
  const runNumbers = monitoringRuns.map(({ runNumber }) => runNumber);
  assert(monitoringRuns.length > 0, "operations monitoring runs are missing", failures);
  assert(duplicates(runIds).length === 0, "operations monitoring runs contain duplicate IDs", failures);
  assert(duplicates(runNumbers).length === 0, "operations monitoring runs contain duplicate run numbers", failures);
  let successfulRunCount = 0;
  for (const run of monitoringRuns) {
    const label = `monitoring run ${run.id ?? "unknown"}`;
    assert(Number.isSafeInteger(run.id) && run.id > 0, `${label}: invalid run ID`, failures);
    assert(Number.isSafeInteger(run.runNumber) && run.runNumber > 0, `${label}: invalid run number`, failures);
    assert(["workflow_dispatch", "schedule"].includes(run.event), `${label}: invalid event`, failures);
    assert(run.branch === "main", `${label}: default branch must be main`, failures);
    assert(/^[0-9a-f]{40}$/.test(run.commit ?? ""), `${label}: invalid commit`, failures);
    assert(["passed", "failed"].includes(run.status), `${label}: invalid status`, failures);
    assert(!Number.isNaN(Date.parse(run.startedAt)), `${label}: invalid start time`, failures);
    assert(!Number.isNaN(Date.parse(run.completedAt)), `${label}: invalid completion time`, failures);
    assert(Date.parse(run.completedAt) >= Date.parse(run.startedAt), `${label}: completion precedes start`, failures);
    assert(run.url === `https://github.com/onishi/shoot-mata/actions/runs/${run.id}`, `${label}: run URL differs from ID`, failures);
    if (run.status === "passed") {
      successfulRunCount += 1;
      assert(run.operationsAudit?.status === "passed", `${label}: operations audit did not pass`, failures);
      assert(run.operationsAudit?.controls === controls.length, `${label}: operations control count differs`, failures);
      assert(run.operationsAudit?.residualRisks === risks.length, `${label}: residual risk count differs`, failures);
      assert(run.operationsAudit?.workItems === workItems.length, `${label}: work item count differs`, failures);
      assert(run.productionAudit?.status === "passed", `${label}: production audit did not pass`, failures);
      assert(run.productionAudit?.buildId === release.buildId, `${label}: production build ID differs`, failures);
      assert(run.productionAudit?.fileCount === release.releaseCandidate?.fileCount, `${label}: production file count differs`, failures);
      assert(run.productionAudit?.totalBytes === release.releaseCandidate?.totalBytes, `${label}: production byte count differs`, failures);
      assert(run.dependencyAudit?.status === "passed", `${label}: dependency audit did not pass`, failures);
      assert(run.dependencyAudit?.vulnerabilities === 0, `${label}: dependency vulnerabilities must be zero`, failures);
    }
  }
  assert(successfulRunCount > 0, "operations have no successful monitoring run", failures);

  const workflowPath = resolve(ROOT_DIR, operations.workflow?.path ?? "");
  const runbookPath = resolve(ROOT_DIR, operations.runbook ?? "");
  const [workflow, runbook] = await Promise.all([
    readFile(workflowPath, "utf8").catch(() => ""),
    readFile(runbookPath, "utf8").catch(() => ""),
  ]);
  assert(operations.workflow?.scheduled === true, "production monitoring must be scheduled", failures);
  assert(operations.workflow?.manual === true, "production monitoring must support manual dispatch", failures);
  assert(operations.workflow?.automaticDeploy === false, "production monitoring must not deploy automatically", failures);
  assert(workflow.includes("schedule:"), "production monitoring workflow has no schedule", failures);
  assert(workflow.includes("workflow_dispatch:"), "production monitoring workflow has no manual dispatch", failures);
  for (const command of ["npm run build", "npm run audit:operations", "npm run audit:production", "npm audit --omit=dev --audit-level=high"]) {
    assert(workflow.includes(command), `production monitoring workflow omits ${command}`, failures);
  }
  for (const section of ["## 監視", "## 重大度と初動", "## ロールバック", "## 修正版の更新", "## 互換性と性能", "## 権利条件", "## 改善要望のtriage"]) {
    assert(runbook.includes(section), `operations runbook omits ${section}`, failures);
  }

  return {
    failures,
    buildId: operations.release?.buildId,
    controlCount: controls.length,
    riskCount: risks.length,
    workItemCount: workItems.length,
    monitoringRunCount: monitoringRuns.length,
    successfulRunCount,
  };
}
