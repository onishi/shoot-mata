import test from "node:test";
import assert from "node:assert/strict";
import {
  beginPointer,
  consumeInput,
  createInputState,
  endPointer,
  movePointer,
  releaseAllInputs,
  setKey,
} from "../../src/core/input-state.mjs";

test("INP-01: WASD・矢印・射撃を共通の連続コマンドへ正規化する", () => {
  const state = createInputState();
  setKey(state, "KeyA", true);
  setKey(state, "ArrowUp", true);
  setKey(state, "KeyZ", true);
  assert.deepEqual(consumeInput(state), {
    moveX: -1, moveY: -1, fire: true, confirm: false, back: false, pause: false,
  });
  setKey(state, "KeyA", false);
  setKey(state, "ArrowUp", false);
  setKey(state, "KeyZ", false);
  assert.deepEqual(consumeInput(state), {
    moveX: 0, moveY: 0, fire: false, confirm: false, back: false, pause: false,
  });
});

test("INP-01: 決定・戻る・ポーズは押下edgeで一度だけ発火しrepeatしない", () => {
  const state = createInputState();
  setKey(state, "Enter", true);
  setKey(state, "Escape", true);
  setKey(state, "KeyP", true);
  assert.deepEqual(consumeInput(state), {
    moveX: 0, moveY: 0, fire: false, confirm: true, back: true, pause: true,
  });
  setKey(state, "Enter", true, { repeat: true });
  assert.equal(consumeInput(state).confirm, false);
  setKey(state, "Enter", false);
  setKey(state, "Enter", true);
  assert.equal(consumeInput(state).confirm, true);
});

test("INP-02: moveとfireの複数pointerIdを同時保持し移動量を正規化する", () => {
  const state = createInputState({ pointerRadius: 50 });
  beginPointer(state, { pointerId: 10, role: "move", x: 100, y: 100 });
  beginPointer(state, { pointerId: 20, role: "fire", x: 300, y: 200 });
  movePointer(state, { pointerId: 10, x: 125, y: 25 });
  assert.deepEqual(consumeInput(state), {
    moveX: 0.5, moveY: -1, fire: true, confirm: false, back: false, pause: false,
  });
  endPointer(state, 20);
  assert.equal(consumeInput(state).fire, false);
});

test("INP-02: pointer解放とblur相当の全解放で押下状態を残さない", () => {
  const state = createInputState();
  setKey(state, "Space", true);
  beginPointer(state, { pointerId: 1, role: "move", x: 0, y: 0 });
  beginPointer(state, { pointerId: 2, role: "fire", x: 0, y: 0 });
  releaseAllInputs(state);
  assert.deepEqual(consumeInput(state), {
    moveX: 0, moveY: 0, fire: false, confirm: false, back: false, pause: false,
  });
  assert.equal(endPointer(state, 999), false);
});

test("INP-02: 不正なroleを拒否し、二重move pointerは安全に無視する", () => {
  const state = createInputState();
  assert.throws(() => beginPointer(state, { pointerId: 1, role: "other", x: 0, y: 0 }), /role/);
  beginPointer(state, { pointerId: 1, role: "move", x: 0, y: 0 });
  assert.equal(beginPointer(state, { pointerId: 2, role: "move", x: 0, y: 0 }), false);
  assert.equal(beginPointer(state, { pointerId: 1, role: "fire", x: 0, y: 0 }), false);
});
