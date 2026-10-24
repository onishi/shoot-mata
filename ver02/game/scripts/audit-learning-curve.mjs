import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { auditLearningCurve } from "../src/core/learning-curve-audit.mjs";

const OUTPUT_URL = new URL("../../phases/phase-09/learning-curve-audit.json", import.meta.url);
const audit = auditLearningCurve();
const report = {
  schemaVersion: 1,
  generatedAt: "2026-10-24",
  scope: {
    objective: "telegraph coverage, staged mechanic introduction, deterministic hit distribution, and finale weapon decisions",
    limitation: "stage-aware deterministic automation measures repeatable exposure, not human surprise or subjective difficulty",
  },
  ...audit,
};

await writeFile(OUTPUT_URL, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  output: fileURLToPath(OUTPUT_URL),
  stages: report.stages.length,
  completedRuns: report.stages.flatMap(({ runs }) => runs).filter(({ status }) => status === "cleared").length,
  telegraphs: report.stages.flatMap(({ runs }) => runs.flatMap(({ telegraphs }) => telegraphs)).length,
  violations: report.violations.length,
}));
if (report.violations.length > 0) {
  throw new Error(`learning curve audit found ${report.violations.length} violation(s)`);
}
