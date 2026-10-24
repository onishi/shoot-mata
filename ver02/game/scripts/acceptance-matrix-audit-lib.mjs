// Requirement families may contain digits (for example A11Y-01). Keeping the
// prefix letters-only silently excluded the entire accessibility family from
// both sides of the comparison, making a missing family look valid.
const REQUIREMENT_ID = /^[A-Z][A-Z0-9]*-\d{2}$/;
export const ALLOWED_ACCEPTANCE_STATES = Object.freeze([
  "未着手",
  "実装中",
  "実装済み未検証",
  "合格",
  "不合格",
  "ブロック",
]);

function tableCells(line) {
  if (!line.startsWith("|")) return [];
  return line.split("|").slice(1, -1).map((cell) => cell.trim());
}

export function extractRequirementIds(markdown) {
  return markdown.split("\n")
    .map(tableCells)
    .filter((cells) => REQUIREMENT_ID.test(cells[0] ?? ""))
    .map(([id]) => id);
}

export function extractAcceptanceRows(markdown) {
  return markdown.split("\n")
    .map(tableCells)
    .filter((cells) => REQUIREMENT_ID.test(cells[0] ?? ""))
    .map(([id, implementation, finalVerification, evidence, state]) => ({
      id,
      implementation,
      finalVerification,
      evidence,
      state,
    }));
}

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

export function auditAcceptanceMatrix(requirementsMarkdown, matrixMarkdown) {
  const requirementIds = extractRequirementIds(requirementsMarkdown);
  const rows = extractAcceptanceRows(matrixMarkdown);
  const matrixIds = rows.map(({ id }) => id);
  const failures = [];

  for (const id of duplicates(requirementIds)) failures.push(`duplicate product requirement: ${id}`);
  for (const id of duplicates(matrixIds)) failures.push(`duplicate acceptance row: ${id}`);

  const requirementSet = new Set(requirementIds);
  const matrixSet = new Set(matrixIds);
  for (const id of requirementSet) if (!matrixSet.has(id)) failures.push(`missing acceptance row: ${id}`);
  for (const id of matrixSet) if (!requirementSet.has(id)) failures.push(`unknown acceptance row: ${id}`);

  for (const row of rows) {
    if (!row.implementation) failures.push(`${row.id}: implementation phase is required`);
    if (!row.finalVerification) failures.push(`${row.id}: final verification phase is required`);
    if (!row.evidence) failures.push(`${row.id}: evidence description is required`);
    if (!ALLOWED_ACCEPTANCE_STATES.includes(row.state)) failures.push(`${row.id}: invalid state ${row.state || "(empty)"}`);
  }

  const stateCounts = Object.fromEntries(ALLOWED_ACCEPTANCE_STATES.map((state) => [state, 0]));
  for (const row of rows) {
    if (Object.hasOwn(stateCounts, row.state)) stateCounts[row.state] += 1;
  }

  return {
    valid: failures.length === 0,
    failures,
    requirementCount: requirementSet.size,
    acceptanceRowCount: matrixSet.size,
    stateCounts,
    phase10RequiredCount: rows.filter(({ finalVerification }) => finalVerification.split(",").map((value) => value.trim()).includes("P10")).length,
    postPhase10Count: rows.filter(({ finalVerification }) => !finalVerification.split(",").map((value) => value.trim()).includes("P10")).length,
  };
}
