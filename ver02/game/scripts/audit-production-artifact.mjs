import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { auditProductionArtifact } from "./production-artifact-audit-lib.mjs";
import { parseJsonWithUniqueKeys } from "./strict-json.mjs";

const releasePath = resolve(process.cwd(), "../phases/phase-11/release.json");
const release = parseJsonWithUniqueKeys(await readFile(releasePath, "utf8"), releasePath);
const result = await auditProductionArtifact({
  baseUrl: release.production.siteUrl,
  expectedCandidate: {
    buildId: release.buildId,
    ...release.releaseCandidate,
  },
});

if (!result.ok) {
  console.error(result.failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`production artifact audit passed: ${result.buildId}, ${result.checkedFiles} files, ${result.totalBytes} bytes`);
}
