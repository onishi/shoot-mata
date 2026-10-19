import test from "node:test";
import assert from "node:assert/strict";
import {
  collectCore,
  comparisonProgress,
  createSessionRecord,
  createPowerState,
  getBuild,
  getSupportEffects,
  previewCollection,
  recommendedMode,
  restoreSessionRecords,
  summarizeComparison,
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

test("比較記録は定量値と主観値を分離し、方式ごとの不足数を返す", () => {
  const base = {
    mode: "queue",
    metrics: { collections: 8, switches: 2, tradeoffs: 3, kills: 20, hits: 1, level3: 4.2 },
    reflection: { prediction: 4, choice: 3, retry: 5, note: " mixed build " },
    completedAt: "2026-10-19T00:00:00.000Z",
  };
  const record = createSessionRecord(base);
  assert.equal(record.reflection.note, "mixed build");
  assert.deepEqual(comparisonProgress([record]), {
    queue: { count: 1, remaining: 2, complete: false },
    armory: { count: 0, remaining: 3, complete: false },
    chain: { count: 0, remaining: 3, complete: false },
  });
});

test("比較順は各セットの開始方式をずらし、9回で各方式3回になる", () => {
  const records = [];
  const modes = [];
  for (let index = 0; index < 9; index += 1) {
    const mode = recommendedMode(records);
    modes.push(mode);
    records.push(createSessionRecord({
      mode,
      metrics: { collections: 1, switches: 0, tradeoffs: 0, kills: 1, hits: 0, level3: 0 },
      reflection: { prediction: 3, choice: 3, retry: 3 },
      completedAt: `2026-10-19T00:00:0${index}.000Z`,
    }));
  }
  assert.deepEqual(modes, ["queue", "armory", "chain", "armory", "chain", "queue", "chain", "queue", "armory"]);
  assert.equal(recommendedMode(records), null);
  assert.deepEqual(Object.fromEntries(Object.entries(comparisonProgress(records)).map(([mode, state]) => [mode, state.count])), {
    queue: 3, armory: 3, chain: 3,
  });
});

test("推奨外の方式を記録しても、未消化の予定枠を飛ばさない", () => {
  const makeRecord = (mode, second) => createSessionRecord({
    mode,
    metrics: { collections: 1, switches: 0, tradeoffs: 0, kills: 1, hits: 0, level3: 0 },
    reflection: { prediction: 3, choice: 3, retry: 3 },
    completedAt: `2026-10-19T00:01:${second}.000Z`,
  });
  const records = [makeRecord("armory", "00")];

  assert.equal(recommendedMode(records), "queue");
  records.push(makeRecord("queue", "01"));
  assert.equal(recommendedMode(records), "chain");
  records.push(makeRecord("armory", "02"));
  assert.equal(recommendedMode(records), "chain");
});

test("同じ方式の過剰記録は他方式の不足を完了扱いにしない", () => {
  const records = Array.from({ length: 9 }, (_, index) => createSessionRecord({
    mode: "queue",
    metrics: { collections: 1, switches: 0, tradeoffs: 0, kills: 1, hits: 0, level3: 0 },
    reflection: { prediction: 3, choice: 3, retry: 3 },
    completedAt: `2026-10-19T00:02:0${index}.000Z`,
  }));

  assert.equal(recommendedMode(records), "armory");
  assert.equal(summarizeComparison(records).complete, false);
});

test("比較集計は方式別の定量値と主観値を平均し、完了前後を区別する", () => {
  const makeRecord = (mode, kills, retry, second) => createSessionRecord({
    mode,
    metrics: { collections: 6, switches: 2, tradeoffs: 1, kills, hits: 1, level3: 2.5 },
    reflection: { prediction: 3, choice: 4, retry },
    completedAt: `2026-10-19T00:00:${second}.000Z`,
  });
  const partial = [makeRecord("queue", 10, 4, "00"), makeRecord("queue", 14, 5, "01")];
  const summary = summarizeComparison(partial);
  assert.equal(summary.complete, false);
  assert.equal(summary.byMode.queue.metrics.kills, 12);
  assert.equal(summary.byMode.queue.reflection.retry, 4.5);
  assert.equal(summary.byMode.armory.metrics.kills, null);

  const complete = ["queue", "armory", "chain"].flatMap((mode, modeIndex) =>
    [0, 1, 2].map((offset) => makeRecord(mode, 10, 4, String(10 + modeIndex * 3 + offset))),
  );
  assert.equal(summarizeComparison(complete).complete, true);
});

test("比較記録は範囲外の主観評価と不正な指標を拒否する", () => {
  const metrics = { collections: 1, switches: 0, tradeoffs: 0, kills: 1, hits: 0, level3: 0 };
  assert.throws(() => createSessionRecord({ mode: "queue", metrics, reflection: { prediction: 0, choice: 3, retry: 3 } }), /Invalid rating/);
  assert.throws(() => createSessionRecord({ mode: "queue", metrics: { ...metrics, hits: -1 }, reflection: { prediction: 3, choice: 3, retry: 3 } }), /Invalid metric/);
  assert.throws(() => createSessionRecord({ mode: "queue", metrics, reflection: { prediction: 3, choice: 3, retry: 3 }, completedAt: "invalid" }), /Invalid completion date/);
});

test("保存済み比較記録の破損行と旧versionを除外する", () => {
  const valid = createSessionRecord({
    mode: "chain",
    metrics: { collections: 7, switches: 2, tradeoffs: 2, kills: 18, hits: 1, level3: 3.4 },
    reflection: { prediction: 3, choice: 4, retry: 5, note: "再試行したい" },
    completedAt: "2026-10-19T00:00:00.000Z",
  });
  const restored = restoreSessionRecords([
    valid,
    { ...valid, version: 0 },
    { ...valid, metrics: { ...valid.metrics, kills: "18" } },
    null,
  ]);
  assert.deepEqual(restored, [valid]);
  assert.deepEqual(restoreSessionRecords({ records: [valid] }), []);
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

test("FIFO三連装の異色は貫通・防御・回収の機能的な補助になる", () => {
  const state = createPowerState("queue");
  ["red", "blue", "yellow"].forEach((core) => collectCore(state, core));
  assert.deepEqual(getSupportEffects(state), {
    pierceBonus: 0,
    invulnerabilitySeconds: 1.6,
    collectionRadiusBonus: 64,
  });

  collectCore(state, "red");
  assert.deepEqual(getBuild(state).supports, ["red", "yellow"]);
  assert.deepEqual(getSupportEffects(state), {
    pierceBonus: 1,
    invulnerabilitySeconds: 0.8,
    collectionRadiusBonus: 64,
  });
});

test("FIFO以外の比較方式には異色補助を混入させない", () => {
  const state = createPowerState("armory");
  ["red", "blue", "yellow"].forEach((core) => collectCore(state, core));
  assert.deepEqual(getSupportEffects(state), {
    pierceBonus: 0,
    invulnerabilitySeconds: 0.8,
    collectionRadiusBonus: 0,
  });
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
