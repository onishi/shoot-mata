import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { auditAudioRuntime } from "./audio-runtime-audit-lib.mjs";

const OUTPUT_URL = new URL("../../phases/phase-09/audio-runtime-audit.json", import.meta.url);
const audit = await auditAudioRuntime();
const report = {
  schemaVersion: 1,
  generatedAt: "2026-10-24",
  scope: {
    objective: "verify independent volume controls, stage-to-boss layer continuity, six-minute encoded-loop phase stability, mix headroom, and missing-layer degradation",
    limitation: "PCM and deterministic Web Audio adapter checks do not establish subjective loudness, sound quality, or physical-device output",
  },
  ...audit,
};

await writeFile(OUTPUT_URL, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  output: fileURLToPath(OUTPUT_URL),
  stages: report.stages.length,
  soakSeconds: report.soakSeconds,
  violations: report.violations.length,
}));
if (report.violations.length > 0) throw new Error(`audio runtime audit found ${report.violations.length} violation(s)`);
