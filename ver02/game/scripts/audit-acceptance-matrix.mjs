import { readFile } from "node:fs/promises";
import { auditAcceptanceMatrix } from "./acceptance-matrix-audit-lib.mjs";

const requirementsUrl = new URL("../../docs/02-product-requirements.md", import.meta.url);
const matrixUrl = new URL("../../docs/02-acceptance-matrix.md", import.meta.url);

const result = auditAcceptanceMatrix(
  await readFile(requirementsUrl, "utf8"),
  await readFile(matrixUrl, "utf8"),
);

if (!result.valid) {
  throw new Error(`acceptance matrix audit failed:\n${result.failures.join("\n")}`);
}

console.log(`acceptance matrix audit passed: ${result.acceptanceRowCount} rows, ${result.phase10RequiredCount} require P10, ${result.postPhase10Count} verify after P10`);
