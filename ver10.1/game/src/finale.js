export const FINALE_STEP_MS = 650;
export const FINALE_GARDENS = [
  { name: "FIRST LIGHT", lesson: "READ THE BRIGHT ROOTS" },
  { name: "SLEEPING CROWN", lesson: "RESERVE TWO BEATS AHEAD" },
  { name: "TURNING ROOT", lesson: "PLAN THE RETURN BEFORE ARRIVAL" },
  { name: "TWIN CURRENT", lesson: "TURN LINKED BRANCHES IN TIME" },
  { name: "QUICKENING VINE", lesson: "PREPARE BEFORE THE QUICKEN" },
  { name: "TENDING CROWN", lesson: "HOLD, PASS, THEN RELEASE" },
];

export function finaleTimeline(elapsedMs, reducedMotion = false) {
  if (reducedMotion) return { stage: FINALE_GARDENS.length, progress: 1, complete: true };
  const safeElapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const rawStage = Math.floor(safeElapsed / FINALE_STEP_MS);
  const stage = Math.min(FINALE_GARDENS.length, rawStage + 1);
  const progress = Math.min(1, (safeElapsed % FINALE_STEP_MS) / FINALE_STEP_MS);
  return { stage, progress, complete: rawStage >= FINALE_GARDENS.length };
}
