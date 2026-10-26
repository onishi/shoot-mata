import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extractAcceptanceRows } from "./acceptance-matrix-audit-lib.mjs";
import { auditAcceptanceEvidence } from "./acceptance-evidence-audit-lib.mjs";
import { parseJsonWithUniqueKeys } from "./strict-json.mjs";

const rootUrl = new URL("../../", import.meta.url);
const registryUrl = new URL("phases/phase-10/acceptance-evidence.json", rootUrl);
const matrixUrl = new URL("docs/02-acceptance-matrix.md", rootUrl);
const registry = parseJsonWithUniqueKeys(
  await readFile(registryUrl, "utf8"),
  "phases/phase-10/acceptance-evidence.json",
);
const acceptanceRows = extractAcceptanceRows(await readFile(matrixUrl, "utf8"));
const result = await auditAcceptanceEvidence({
  registry,
  acceptanceRows,
  rootDir: fileURLToPath(rootUrl),
  expectedBuildId: "phase10-rc1-20261024",
});

if (!result.valid) throw new Error(`acceptance evidence audit failed:\n${result.failures.join("\n")}`);

console.log(`acceptance evidence audit passed: ${result.tracedRequirementCount}/${result.phase10RequirementCount} Phase 10 requirements, ${result.evidenceSetCount} evidence sets, ${result.artifactReferenceCount} artifact references, ${result.deferredRequirementCount} deferred to later phases`);
