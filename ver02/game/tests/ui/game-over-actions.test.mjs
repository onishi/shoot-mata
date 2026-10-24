import test from "node:test";
import assert from "node:assert/strict";
import { createGameOverActions } from "../../src/ui/game-over-actions.mjs";

test("LOOP-02/06: 単独ステージは実行不能なコンティニューを表示しない", () => {
  assert.deepEqual(createGameOverActions({ mode: "single", continuesRemaining: 2 }), [
    ["retry", "同じseedで再挑戦", true],
  ]);
});

test("LOOP-06: キャンペーンだけが残数付きコンティニューを表示する", () => {
  assert.deepEqual(createGameOverActions({ mode: "campaign", continuesRemaining: 2 }), [
    ["retry", "同じseedで再挑戦", true],
    ["continue", "キャンペーンをコンティニュー (残り2)", false],
  ]);
  assert.deepEqual(createGameOverActions({ mode: "campaign", continuesRemaining: 0 }), [
    ["retry", "同じseedで再挑戦", true],
  ]);
});
