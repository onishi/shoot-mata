import { auditOperations } from "./operations-audit-lib.mjs";

const result = await auditOperations();

if (result.failures.length > 0) {
  console.error(result.failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`operations audit passed: ${result.buildId}, ${result.controlCount} controls, ${result.riskCount} risks, ${result.workItemCount} work items`);
}
