export function createGameOverActions(flow) {
  if (!flow || typeof flow !== "object") throw new TypeError("flow is required");
  if (!Number.isInteger(flow.continuesRemaining) || flow.continuesRemaining < 0) {
    throw new TypeError("continuesRemaining must be a non-negative integer");
  }

  return Object.freeze([
    Object.freeze(["retry", "同じseedで再挑戦", true]),
    ...(flow.mode === "campaign" && flow.continuesRemaining > 0
      ? [Object.freeze([
          "continue",
          `キャンペーンをコンティニュー (残り${flow.continuesRemaining})`,
          false,
        ])]
      : []),
  ]);
}
