export const RANKINGS_KEY = "lodestar-forge:v12:rankings";

const cleanInitials = (value) => typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : null;

export function normalizeRankings(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => ({
      initials: cleanInitials(entry?.initials),
      score: Number.isInteger(entry?.score) && entry.score >= 0 ? entry.score : null
    }))
    .filter((entry) => entry.initials && entry.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function loadRankings(storage) {
  try {
    return normalizeRankings(JSON.parse(storage.getItem(RANKINGS_KEY)));
  } catch {
    return [];
  }
}

export function saveRanking(storage, rankings, initials, score) {
  const next = normalizeRankings([...rankings, { initials, score }]);
  try {
    storage.setItem(RANKINGS_KEY, JSON.stringify(next));
  } catch {
    // A full or unavailable cabinet store must not trap the result flow.
  }
  return next;
}
