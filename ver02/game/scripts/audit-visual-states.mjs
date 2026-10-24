import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { auditVisualStates } from "../src/browser/visual-state-audit.mjs";

const OUTPUT_URL = new URL("../../phases/phase-09/visual-state-audit.json", import.meta.url);
const audit = auditVisualStates();
const report = {
  schemaVersion: 1,
  generatedAt: "2026-10-24",
  scope: {
    objective: "render every product stage with weapon, core, projectile, actor-animation, VFX, warning, and clear states across accessible display profiles",
    limitation: "recorded Canvas commands prove deterministic state presence and non-color geometry; they do not measure subjective visual quality or human legibility",
  },
  ...audit,
};

await writeFile(OUTPUT_URL, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  output: fileURLToPath(OUTPUT_URL),
  stages: report.stageCount,
  profiles: report.displayProfiles.length,
  renderedPlates: report.stageCount * report.displayProfiles.length,
  weaponStateRenders: report.stageCount * report.displayProfiles.length * report.thresholds.weaponConfigurations,
  violations: report.violations.length,
}));
if (report.violations.length > 0) {
  throw new Error(`visual state audit found ${report.violations.length} violation(s)`);
}
