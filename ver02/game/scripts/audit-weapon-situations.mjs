import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { auditWeaponSituations } from "../src/core/weapon-situation-audit.mjs";

const OUTPUT_URL = new URL("../../phases/phase-07/weapon-situation-audit.json", import.meta.url);
const audit = auditWeaponSituations();
const report = {
  schemaVersion: 1,
  generatedAt: "2026-10-24",
  policy: {
    comparison: "same level-3 loadout size, seed, player position, and continuous-fire input",
    ranking: "destroyed desc, escaped asc, remaining HP asc, completion ticks asc",
  },
  ...audit,
};

await writeFile(OUTPUT_URL, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  output: fileURLToPath(OUTPUT_URL),
  winners: Object.fromEntries(report.scenarios.map(({ id, winner }) => [id, winner])),
  violations: report.violations.length,
}));
if (report.violations.length > 0) {
  throw new Error(`weapon situation audit found ${report.violations.length} violation(s)`);
}
