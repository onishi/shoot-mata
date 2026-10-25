import { readFile } from "node:fs/promises";
import { extractAcceptanceRows } from "./acceptance-matrix-audit-lib.mjs";
import { auditFinalAcceptance } from "./final-acceptance-audit-lib.mjs";
import { parseJsonWithUniqueKeys } from "./strict-json.mjs";

const rootUrl = new URL("../../", import.meta.url);
const readJson = async (path) => parseJsonWithUniqueKeys(
  await readFile(new URL(path, rootUrl), "utf8"),
  path,
);
const acceptanceRows = extractAcceptanceRows(await readFile(new URL("docs/02-acceptance-matrix.md", rootUrl), "utf8"));
const result = auditFinalAcceptance({
  gate: await readJson("phases/phase-10/final-acceptance.json"),
  acceptanceRows,
  compatibility: await readJson("phases/phase-10/browser-compatibility.json"),
  releaseCandidate: await readJson("phases/phase-10/release-candidate.json"),
  evidenceRegistry: await readJson("phases/phase-10/acceptance-evidence.json"),
  expectedBuildId: "phase10-rc1-20261024",
});

if (!result.valid) throw new Error(`final acceptance audit failed:\n${result.failures.join("\n")}`);

console.log(`final acceptance audit passed: ${result.nonPassingRequirementIds.length} non-passing Phase 10 requirements, ${result.nonPassingBrowserTargetIds.length} missing browser/device targets, accepted=${result.decision.accepted}`);
