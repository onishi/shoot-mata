import { auditReleaseArtifact } from "./release-artifact-audit-lib.mjs";

const result = await auditReleaseArtifact();

if (result.failures.length > 0) {
  console.error(result.failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`release artifact audit passed: ${result.buildId}, ${result.fileCount} files, ${result.imageCount} images, ${result.audioCount} audio, ${result.dependencyCount} dependencies`);
}
