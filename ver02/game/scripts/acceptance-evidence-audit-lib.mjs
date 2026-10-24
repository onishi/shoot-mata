import { stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

const ALLOWED_KINDS = new Set([
  "automated-test",
  "browser-record",
  "design-record",
  "generated-report",
  "implementation",
]);
const VERIFICATION_KINDS = new Set(["automated-test", "browser-record", "generated-report"]);

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

function sameMembers(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export async function auditAcceptanceEvidence({ registry, acceptanceRows, rootDir, expectedBuildId }) {
  const failures = [];
  if (registry?.schemaVersion !== 1) failures.push("schemaVersion must be 1");
  if (registry?.buildId !== expectedBuildId) failures.push(`buildId must be ${expectedBuildId}`);
  if (!nonEmptyString(registry?.recordedOn)) failures.push("recordedOn is required");
  if (!nonEmptyString(registry?.scope)) failures.push("scope is required");
  if (typeof registry?.accepted !== "boolean") failures.push("accepted must be a boolean");

  const phase10Ids = acceptanceRows
    .filter(({ finalVerification }) => finalVerification.split(",").map((value) => value.trim()).includes("P10"))
    .map(({ id }) => id);
  const allPhase10RowsPass = acceptanceRows
    .filter(({ finalVerification }) => finalVerification.split(",").map((value) => value.trim()).includes("P10"))
    .every(({ state }) => state === "合格");
  if (registry?.accepted === true && !allPhase10RowsPass) {
    failures.push("accepted cannot be true while a Phase 10 acceptance row is non-passing");
  }
  const deferredIds = acceptanceRows
    .filter(({ finalVerification }) => !finalVerification.split(",").map((value) => value.trim()).includes("P10"))
    .map(({ id }) => id);
  const evidenceSets = Array.isArray(registry?.evidenceSets) ? registry.evidenceSets : [];
  if (evidenceSets.length === 0) failures.push("evidenceSets must not be empty");

  const setIds = evidenceSets.map(({ id }) => id);
  for (const id of duplicates(setIds)) failures.push(`duplicate evidence set: ${id}`);

  const tracedIds = evidenceSets.flatMap(({ requirementIds }) => Array.isArray(requirementIds) ? requirementIds : []);
  for (const id of duplicates(tracedIds)) failures.push(`requirement appears in multiple evidence sets: ${id}`);
  const tracedSet = new Set(tracedIds);
  const phase10Set = new Set(phase10Ids);
  for (const id of phase10Set) if (!tracedSet.has(id)) failures.push(`missing Phase 10 evidence trace: ${id}`);
  for (const id of tracedSet) if (!phase10Set.has(id)) failures.push(`evidence trace is not a Phase 10 requirement: ${id}`);

  const recordedDeferred = Array.isArray(registry?.deferredRequirementIds) ? registry.deferredRequirementIds : [];
  if (!sameMembers(new Set(recordedDeferred), new Set(deferredIds))) {
    failures.push(`deferredRequirementIds must exactly match post-Phase 10 requirements: ${deferredIds.join(", ")}`);
  }

  for (const evidenceSet of evidenceSets) {
    const label = nonEmptyString(evidenceSet.id) ? evidenceSet.id : "(missing-id)";
    if (!nonEmptyString(evidenceSet.id)) failures.push("evidence set id is required");
    if (!Array.isArray(evidenceSet.requirementIds) || evidenceSet.requirementIds.length === 0) failures.push(`${label}: requirementIds must not be empty`);
    if (!nonEmptyString(evidenceSet.summary)) failures.push(`${label}: summary is required`);
    if (!nonEmptyString(evidenceSet.limitations)) failures.push(`${label}: limitations are required`);
    if (!Array.isArray(evidenceSet.artifacts) || evidenceSet.artifacts.length === 0) {
      failures.push(`${label}: artifacts must not be empty`);
      continue;
    }
    if (!evidenceSet.artifacts.some(({ kind }) => VERIFICATION_KINDS.has(kind))) {
      failures.push(`${label}: at least one verification artifact is required`);
    }

    for (const artifact of evidenceSet.artifacts) {
      if (!nonEmptyString(artifact.path)) {
        failures.push(`${label}: artifact path is required`);
        continue;
      }
      if (!ALLOWED_KINDS.has(artifact.kind)) failures.push(`${label}: invalid artifact kind ${artifact.kind || "(empty)"}`);
      if (isAbsolute(artifact.path)) {
        failures.push(`${label}: artifact path must be relative: ${artifact.path}`);
        continue;
      }
      const absolutePath = resolve(rootDir, artifact.path);
      const relativePath = relative(rootDir, absolutePath);
      if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
        failures.push(`${label}: artifact path escapes ver02: ${artifact.path}`);
        continue;
      }
      if (["docs/02-product-requirements.md", "docs/02-acceptance-matrix.md"].includes(relativePath)) {
        failures.push(`${label}: circular requirement document is not evidence: ${artifact.path}`);
        continue;
      }
      try {
        const info = await stat(absolutePath);
        if (!info.isFile()) failures.push(`${label}: artifact is not a file: ${artifact.path}`);
      } catch {
        failures.push(`${label}: artifact does not exist: ${artifact.path}`);
      }
    }
  }

  return {
    valid: failures.length === 0,
    failures,
    phase10RequirementCount: phase10Set.size,
    tracedRequirementCount: tracedSet.size,
    deferredRequirementCount: deferredIds.length,
    evidenceSetCount: evidenceSets.length,
    artifactReferenceCount: evidenceSets.reduce((sum, evidenceSet) => sum + (evidenceSet.artifacts?.length ?? 0), 0),
  };
}
