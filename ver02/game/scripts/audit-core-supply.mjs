import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { STAGE_01_ORBITAL_WRECK } from "../src/content/stages/stage-01-orbital-wreck.mjs";
import { STAGE_02_CLOUD_REFINERY } from "../src/content/stages/stage-02-cloud-refinery.mjs";
import { STAGE_03_LIVING_ARK } from "../src/content/stages/stage-03-living-ark.mjs";
import { STAGE_04_STELLAR_FURNACE } from "../src/content/stages/stage-04-stellar-furnace.mjs";
import { auditStageCoreSupply } from "../src/core/core-supply-audit.mjs";

const OUTPUT_URL = new URL("../../phases/phase-07/core-supply-audit.json", import.meta.url);
const SEED_COUNT = 16_384;
const stages = [
  STAGE_01_ORBITAL_WRECK,
  STAGE_02_CLOUD_REFINERY,
  STAGE_03_LIVING_ARK,
  STAGE_04_STELLAR_FURNACE,
];

const stageAudits = stages.map((stage) => auditStageCoreSupply(stage, { seedCount: SEED_COUNT }));
const report = {
  schemaVersion: 1,
  generatedAt: "2026-10-24",
  policy: {
    colors: ["red", "blue", "yellow"],
    maximumMissedDrops: stageAudits[0].maximumAllowedMissedDrops,
    scope: "stage start through boss entry",
  },
  totals: {
    stages: stageAudits.length,
    dropSequences: stageAudits.reduce((sum, audit) => sum + audit.inspectedDropSequences, 0),
    stageTicks: stageAudits.reduce((sum, audit) => sum + audit.inspectedStageTicks, 0),
    violations: stageAudits.reduce((sum, audit) => sum + audit.violations.length, 0),
  },
  stages: stageAudits,
};

await writeFile(OUTPUT_URL, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: fileURLToPath(OUTPUT_URL), ...report.totals }));
if (report.totals.violations > 0) {
  throw new Error(`core supply audit found ${report.totals.violations} violation(s)`);
}
