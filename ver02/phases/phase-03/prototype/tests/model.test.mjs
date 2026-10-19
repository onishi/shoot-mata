import test from "node:test";
import assert from "node:assert/strict";
import {
  collectCore,
  createPowerState,
  getBuild,
  previewCollection,
} from "../model.mjs";

test("FIFO三連装は先頭色と同色数から武器とレベルを得る", () => {
  const state = createPowerState("queue");
  collectCore(state, "red");
  collectCore(state, "blue");
  collectCore(state, "red");
  assert.deepEqual(getBuild(state), {
    weapon: "red",
    level: 2,
    supports: ["blue"],
    slots: ["red", "blue", "red"],
  });
});

test("FIFO三連装は4個目で最古を押し出し主武器を変更する", () => {
  const state = createPowerState("queue");
  ["red", "blue", "red", "yellow"].forEach((core) => collectCore(state, core));
  assert.deepEqual(getBuild(state), {
    weapon: "blue",
    level: 1,
    supports: ["red", "yellow"],
    slots: ["blue", "red", "yellow"],
  });
  assert.equal(state.switches, 1);
  assert.equal(state.tradeoffs, 1);
});

test("独立兵装庫は各色レベルを保存し取得色へ切り替える", () => {
  const state = createPowerState("armory");
  ["red", "red", "blue", "red", "red"].forEach((core) => collectCore(state, core));
  assert.equal(state.levels.red, 3);
  assert.equal(state.levels.blue, 1);
  assert.equal(getBuild(state).weapon, "red");
  assert.equal(getBuild(state).level, 3);
  assert.equal(state.tradeoffs, 0);
});

test("連鎖過給は同色で成長し異色でLv1へ戻る", () => {
  const state = createPowerState("chain");
  ["yellow", "yellow", "yellow", "blue"].forEach((core) => collectCore(state, core));
  assert.equal(getBuild(state).weapon, "blue");
  assert.equal(getBuild(state).level, 1);
  assert.equal(state.switches, 1);
  assert.equal(state.tradeoffs, 1);
});

test("プレビューは元の状態を変更しない", () => {
  const state = createPowerState("queue");
  ["red", "blue", "red"].forEach((core) => collectCore(state, core));
  const preview = previewCollection(state, "yellow");
  assert.deepEqual(state.queue, ["red", "blue", "red"]);
  assert.deepEqual(preview.slots, ["blue", "red", "yellow"]);
});

test("未知のモードとコアを拒否する", () => {
  assert.throws(() => createPowerState("unknown"), /Unknown mode/);
  assert.throws(() => collectCore(createPowerState(), "green"), /Unknown core/);
});
