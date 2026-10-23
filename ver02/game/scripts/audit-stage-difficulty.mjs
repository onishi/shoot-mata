import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { auditStageDifficulty } from "../src/core/stage-difficulty-audit.mjs";

const OUTPUT_URL = new URL("../../phases/phase-07/stage-difficulty-audit.json", import.meta.url);
const audit = auditStageDifficulty();
const report = {
  schemaVersion: 1,
  generatedAt: "2026-10-24",
  scope: {
    objective: "content pressure curve and repeatable multi-seed completion evidence",
    limitation: "stage-aware deterministic automation is not a human or subjective difficulty rating",
  },
  ...audit,
};

await writeFile(OUTPUT_URL, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  output: fileURLToPath(OUTPUT_URL),
  stages: report.stages.length,
  completedRuns: report.stages.flatMap(({ runs }) => runs).filter(({ status }) => status === "cleared").length,
  violations: report.violations.length,
}));
if (report.violations.length > 0) {
  throw new Error(`stage difficulty audit found ${report.violations.length} violation(s)`);
}
