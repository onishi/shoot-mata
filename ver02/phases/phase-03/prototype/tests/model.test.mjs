import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPARISON_PROTOCOL,
  CORE_INFO,
  CORE_TYPES,
  acquireSessionStorage,
  canDiscardPendingSession,
  canEditComparisonRecords,
  clearInteractionState,
  canStartMode,
  collectCore,
  comparisonProgress,
  createEnemySpawn,
  createInteractionState,
  createPickupSpawn,
  createSessionRecord,
  createPowerState,
  createWeaponProjectiles,
  enemyFireTick,
  getBuild,
  getSupportEffects,
  initializeSessionRecords,
  mergeSessionRecords,
  normalizeGameplayKey,
  parseComparisonExport,
  persistSessionRecords,
  previewCollection,
  recommendedMode,
  removeLastSessionRecord,
  removeSessionRecord,
  setSessionRecordInclusion,
  restoreSessionRecords,
  sessionStepSeconds,
  shouldWarnBeforeUnload,
  startButtonLabel,
  summarizeComparison,
} from "../model.mjs";

test("3コアは色・外形・内部記号を重複させず取得前に識別できる", () => {
  for (const key of ["colorLabel", "shape", "glyph"]) {
    const values = CORE_TYPES.map((type) => CORE_INFO[type][key]);
    assert.equal(new Set(values).size, CORE_TYPES.length);
    assert.ok(values.every(Boolean));
  }
});

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
    environment: { viewportWidth: 390, viewportHeight: 844, inputMethods: ["touch"] },
    completedAt: "2026-10-19T00:00:00.000Z",
  };
  const record = createSessionRecord(base);
  assert.equal(record.protocol, COMPARISON_PROTOCOL);
  assert.equal(record.included, true);
  assert.equal(record.legacyExcluded, false);
  assert.equal(record.classificationReviewed, true);
  assert.equal(record.reflection.note, "mixed build");
  assert.deepEqual(record.environment, {
    viewportWidth: 390,
    viewportHeight: 844,
    inputMethods: ["touch"],
  });
  assert.deepEqual(comparisonProgress([record]), {
    queue: { count: 1, remaining: 2, complete: false },
    armory: { count: 0, remaining: 3, complete: false },
    chain: { count: 0, remaining: 3, complete: false },
  });
});

test("QA記録は証拠として保持しても正式比較の進捗・推奨・集計へ含めない", () => {
  const makeRecord = (included, second) => createSessionRecord({
    mode: "queue",
    included,
    metrics: { collections: 8, switches: 2, tradeoffs: 3, kills: included ? 20 : 99, hits: 1, level3: 4.2 },
    reflection: { prediction: 4, choice: 3, retry: 5 },
    completedAt: `2026-10-19T00:02:0${second}.000Z`,
  });
  const records = [makeRecord(false, 0), makeRecord(true, 1)];

  assert.equal(records.length, 2);
  assert.equal(comparisonProgress(records).queue.count, 1);
  assert.equal(recommendedMode(records), "armory");
  assert.equal(summarizeComparison(records).byMode.queue.metrics.kills, 20);
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

test("目標回数を完了した方式は追加セッションを開始できない", () => {
  const makeRecord = (mode, second) => createSessionRecord({
    mode,
    metrics: { collections: 1, switches: 0, tradeoffs: 0, kills: 1, hits: 0, level3: 0 },
    reflection: { prediction: 3, choice: 3, retry: 3 },
    completedAt: `2026-10-19T00:03:0${second}.000Z`,
  });
  const records = [0, 1, 2].map((second) => makeRecord("queue", second));

  assert.equal(canStartMode(records, "queue"), false);
  assert.equal(canStartMode(records, "armory"), true);
  assert.throws(() => canStartMode(records, "unknown"), /Unknown mode/);
});

test("完了方式の直前記録を取り消すと開始ボタンの案内も再試行へ戻る", () => {
  const makeRecord = (second) => createSessionRecord({
    mode: "queue",
    metrics: { collections: 1, switches: 0, tradeoffs: 0, kills: 1, hits: 0, level3: 0 },
    reflection: { prediction: 3, choice: 3, retry: 3 },
    completedAt: `2026-10-19T00:04:0${second}.000Z`,
  });
  const complete = [0, 1, 2].map(makeRecord);

  assert.equal(startButtonLabel(complete, "queue"), "この方式は3/3完了");
  assert.equal(startButtonLabel(removeLastSessionRecord(complete), "queue"), "45秒テストを開始");
});

test("比較記録は待機中だけ変更でき、実行中と完走後の回答待ちはロックする", () => {
  assert.equal(canEditComparisonRecords(false, false), true);
  assert.equal(canEditComparisonRecords(true, false), false);
  assert.equal(canEditComparisonRecords(false, true), false);
  assert.equal(canEditComparisonRecords(true, true), false);
  assert.throws(() => canEditComparisonRecords("yes", false), /Invalid comparison state/);
});

test("完走後の未保存セッションだけを明示的に破棄できる", () => {
  assert.equal(canDiscardPendingSession(false, true), true);
  assert.equal(canDiscardPendingSession(true, false), false);
  assert.equal(canDiscardPendingSession(true, true), false);
  assert.equal(canDiscardPendingSession(false, false), false);
  assert.throws(() => canDiscardPendingSession("false", true), /Invalid comparison state/);
});

test("実行中と完走後の回答待ちは画面離脱前に警告する", () => {
  assert.equal(shouldWarnBeforeUnload(false, false), false);
  assert.equal(shouldWarnBeforeUnload(true, false), true);
  assert.equal(shouldWarnBeforeUnload(false, true), true);
  assert.equal(shouldWarnBeforeUnload(true, true), true);
  assert.throws(() => shouldWarnBeforeUnload(false, null), /Invalid comparison state/);
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
  assert.throws(() => createSessionRecord({ mode: "queue", metrics, reflection: { prediction: 3, choice: 3, retry: 3 }, included: "no" }), /Invalid comparison inclusion/);
  assert.throws(() => createSessionRecord({
    mode: "queue", metrics, reflection: { prediction: 3, choice: 3, retry: 3 },
    environment: { viewportWidth: 0, viewportHeight: 844, inputMethods: ["touch"] },
  }), /Invalid session environment/);
  assert.throws(() => createSessionRecord({
    mode: "queue", metrics, reflection: { prediction: 3, choice: 3, retry: 3 },
    environment: { viewportWidth: 390, viewportHeight: 844, inputMethods: ["gamepad"] },
  }), /Invalid session environment/);
});

test("比較記録は画面・入力を正規化し、区分不明の旧記録を集計から除外する", () => {
  const base = {
    mode: "queue",
    metrics: { collections: 1, switches: 0, tradeoffs: 0, kills: 1, hits: 0, level3: 0 },
    reflection: { prediction: 3, choice: 3, retry: 3 },
    completedAt: "2026-10-20T00:00:00.000Z",
  };
  const current = createSessionRecord({
    ...base,
    environment: { viewportWidth: 844, viewportHeight: 390, inputMethods: ["touch", "keyboard", "touch"] },
  });
  assert.deepEqual(current.environment, {
    viewportWidth: 844,
    viewportHeight: 390,
    inputMethods: ["keyboard", "touch"],
  });

  const legacy = { ...createSessionRecord(base) };
  delete legacy.environment;
  delete legacy.included;
  delete legacy.legacyExcluded;
  delete legacy.classificationReviewed;
  const [restoredLegacy] = restoreSessionRecords([legacy]);
  assert.equal(restoredLegacy.environment, null);
  assert.equal(restoredLegacy.included, false);
  assert.equal(restoredLegacy.legacyExcluded, true);
  assert.equal(restoredLegacy.classificationReviewed, false);
  assert.equal(comparisonProgress([restoredLegacy]).queue.count, 0);
});

test("保存済み比較記録の破損行と旧version・旧protocolを除外する", () => {
  const valid = createSessionRecord({
    mode: "chain",
    metrics: { collections: 7, switches: 2, tradeoffs: 2, kills: 18, hits: 1, level3: 3.4 },
    reflection: { prediction: 3, choice: 4, retry: 5, note: "再試行したい" },
    completedAt: "2026-10-19T00:00:00.000Z",
  });
  const restored = restoreSessionRecords([
    valid,
    { ...valid, version: 0 },
    { ...valid, protocol: COMPARISON_PROTOCOL - 1 },
    { ...valid, protocol: undefined },
    { ...valid, metrics: { ...valid.metrics, kills: "18" } },
    null,
  ]);
  assert.deepEqual(restored, [valid]);
  assert.deepEqual(restoreSessionRecords({ records: [valid] }), []);
});

test("公式JSON出力だけを比較記録として読み込む", () => {
  const record = createSessionRecord({
    mode: "queue",
    metrics: { collections: 7, switches: 2, tradeoffs: 1, kills: 18, hits: 1, level3: 3.4 },
    reflection: { prediction: 3, choice: 4, retry: 5 },
    completedAt: "2026-10-20T01:00:00.000Z",
  });
  const payload = JSON.stringify({ protocol: COMPARISON_PROTOCOL, records: [record] });

  assert.deepEqual(parseComparisonExport(payload), [record]);
  assert.throws(() => parseComparisonExport("not-json"), /Invalid comparison export/);
  assert.throws(() => parseComparisonExport({ protocol: COMPARISON_PROTOCOL - 1, records: [record] }), /Invalid comparison export/);
  assert.throws(() => parseComparisonExport({ protocol: COMPARISON_PROTOCOL, records: [{ ...record, version: 0 }] }), /Invalid comparison records/);
});

test("別端末の記録は重複を除き方式ごと3件まで既存記録へ統合する", () => {
  const makeRecord = (mode, second) => createSessionRecord({
    mode,
    metrics: { collections: 7, switches: 2, tradeoffs: 1, kills: 18, hits: 1, level3: 3.4 },
    reflection: { prediction: 3, choice: 4, retry: 5 },
    completedAt: `2026-10-20T01:00:0${second}.000Z`,
  });
  const existing = [makeRecord("queue", 0), makeRecord("queue", 1)];
  const imported = [existing[0], makeRecord("queue", 2), makeRecord("queue", 3), makeRecord("armory", 4)];

  const merged = mergeSessionRecords(existing, imported);

  assert.equal(merged.added, 2);
  assert.equal(merged.duplicates, 1);
  assert.equal(merged.excess, 1);
  assert.deepEqual(merged.records.map((record) => record.mode), ["queue", "queue", "queue", "armory"]);
  assert.equal(existing.length, 2);
  assert.throws(() => mergeSessionRecords(existing, imported, 0), /Invalid merge input/);
});

test("比較記録はブラウザ保存後の読み戻しまで確認する", () => {
  const values = new Map();
  const storage = {
    setItem: (key, value) => values.set(key, value),
    getItem: (key) => values.get(key) ?? null,
  };
  const records = [{ mode: "queue" }];

  assert.equal(persistSessionRecords(storage, "comparison", records), true);
  assert.equal(values.get("comparison"), JSON.stringify(records));
});

test("比較記録の保存拒否と読み戻し不一致を失敗として返す", () => {
  const rejected = {
    setItem: () => { throw new DOMException("blocked"); },
    getItem: () => null,
  };
  const ignored = { setItem: () => {}, getItem: () => null };

  assert.equal(persistSessionRecords(rejected, "comparison", []), false);
  assert.equal(persistSessionRecords(ignored, "comparison", []), false);
  assert.throws(() => persistSessionRecords(ignored, "", []), /Invalid persistence input/);
  assert.throws(() => persistSessionRecords(ignored, "comparison", null), /Invalid persistence input/);
});

test("ブラウザ保存領域の取得自体が拒否されても比較器を起動できる", () => {
  const storage = acquireSessionStorage(() => {
    throw new DOMException("blocked");
  });

  assert.deepEqual(initializeSessionRecords(storage, "comparison"), {
    records: [],
    persisted: false,
  });
  assert.throws(() => acquireSessionStorage(null), /Invalid storage reader/);
});

test("起動時に有効な比較記録を復元し、保存可否を完走前に確認する", () => {
  const values = new Map();
  const storage = {
    setItem: (key, value) => values.set(key, value),
    getItem: (key) => values.get(key) ?? null,
  };
  const record = createSessionRecord({
    mode: "queue",
    metrics: { collections: 8, switches: 2, tradeoffs: 3, kills: 20, hits: 1, level3: 4.2 },
    reflection: { prediction: 4, choice: 3, retry: 5 },
    completedAt: "2026-10-20T00:00:00.000Z",
  });
  values.set("comparison", JSON.stringify([record, { ...record, protocol: 1 }]));

  const initialized = initializeSessionRecords(storage, "comparison");

  assert.deepEqual(initialized, { records: [record], persisted: true });
  assert.equal(values.get("comparison"), JSON.stringify([record]));
});

test("起動時にブラウザ保存が拒否された場合は警告用の失敗状態を返す", () => {
  const blocked = {
    getItem: () => { throw new DOMException("blocked"); },
    setItem: () => { throw new DOMException("blocked"); },
  };

  assert.deepEqual(initializeSessionRecords(blocked, "comparison"), {
    records: [],
    persisted: false,
  });
  assert.throws(() => initializeSessionRecords(blocked, ""), /Invalid persistence input/);
});

test("直前の比較記録だけを元の配列を変えずに取り消す", () => {
  const records = ["first", "second", "third"];
  assert.deepEqual(removeLastSessionRecord(records), ["first", "second"]);
  assert.deepEqual(records, ["first", "second", "third"]);
  assert.deepEqual(removeLastSessionRecord([]), []);
  assert.deepEqual(removeLastSessionRecord(null), []);
});

test("指定した比較記録だけを元の配列を変えずに削除する", () => {
  const records = ["first", "validation", "third"];
  assert.deepEqual(removeSessionRecord(records, 1), ["first", "third"]);
  assert.deepEqual(records, ["first", "validation", "third"]);
  assert.deepEqual(removeSessionRecord(records, -1), records);
  assert.deepEqual(removeSessionRecord(records, 3), records);
  assert.deepEqual(removeSessionRecord(records, 1.5), records);
  assert.deepEqual(removeSessionRecord(null, 0), []);
});

test("既存記録を非破壊で正式比較とQA除外へ切り替える", () => {
  const records = [
    { mode: "queue", included: true, legacyExcluded: false, classificationReviewed: true },
    { mode: "armory", included: false, legacyExcluded: true, classificationReviewed: false },
  ];
  const excluded = setSessionRecordInclusion(records, 0, false);

  assert.deepEqual(excluded, [
    { mode: "queue", included: false, legacyExcluded: false, classificationReviewed: true },
    { mode: "armory", included: false, legacyExcluded: true, classificationReviewed: false },
  ]);
  assert.equal(records[0].included, true);
  assert.deepEqual(setSessionRecordInclusion(records, 1, true), [
    { mode: "queue", included: true, legacyExcluded: false, classificationReviewed: true },
    { mode: "armory", included: true, legacyExcluded: false, classificationReviewed: true },
  ]);
  assert.deepEqual(setSessionRecordInclusion(records, -1, false), records);
  assert.deepEqual(setSessionRecordInclusion(records, 0, "no"), records);
  assert.deepEqual(setSessionRecordInclusion(null, 0, false), []);
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

test("赤ランスはLvごとに威力と基本貫通数が増える", () => {
  const origin = { x: 100, y: 200 };
  for (const level of [1, 2, 3]) {
    const [shot] = createWeaponProjectiles({ weapon: "red", level }, origin);
    assert.equal(shot.damage, level);
    assert.equal(shot.pierce, level - 1);
    assert.equal(shot.radius, 4 + level);
  }
});

test("青スプレッドはLvごとに弾数と拡散範囲が増える", () => {
  const origin = { x: 100, y: 200 };
  const shotsByLevel = [1, 2, 3].map((level) =>
    createWeaponProjectiles({ weapon: "blue", level }, origin));
  assert.deepEqual(shotsByLevel.map((shots) => shots.length), [3, 5, 7]);
  assert.deepEqual(shotsByLevel.map((shots) => Math.max(...shots.map((shot) => Math.abs(shot.vy)))), [55, 110, 165]);
});

test("黄シーカーはLvと同数の追尾弾を異なる位置から発射する", () => {
  const origin = { x: 100, y: 200 };
  const shots = createWeaponProjectiles({ weapon: "yellow", level: 3 }, origin);
  assert.equal(shots.length, 3);
  assert.ok(shots.every((shot) => shot.seeking));
  assert.deepEqual(shots.map((shot) => shot.y), [191, 200, 209]);
});

test("FIFOの赤補助は全武器へ追加貫通を1だけ与える", () => {
  const state = createPowerState("queue");
  ["blue", "red"].forEach((core) => collectCore(state, core));
  const shots = createWeaponProjectiles(getBuild(state), { x: 100, y: 200 }, getSupportEffects(state));
  assert.ok(shots.every((shot) => shot.pierce === 1 && shot.supportPiercing));
});

test("未装填では射撃せず、武器レベルは試作上限へ収める", () => {
  const origin = { x: 100, y: 200 };
  assert.deepEqual(createWeaponProjectiles({ weapon: null, level: 0 }, origin), []);
  assert.equal(createWeaponProjectiles({ weapon: "yellow", level: 99 }, origin).length, 3);
});

test("敵とコアの生成列は独立した連番から毎回同じ条件を再現する", () => {
  const enemies = [0, 1, 2].map((index) => createEnemySpawn(index, 12));
  const pickups = [0, 1, 2, 3].map((index) => createPickupSpawn(index, 12));

  assert.deepEqual(enemies, [0, 1, 2].map((index) => createEnemySpawn(index, 12)));
  assert.deepEqual(pickups, [0, 1, 2, 3].map((index) => createPickupSpawn(index, 12)));
  assert.deepEqual(pickups.map((pickup) => pickup.type), ["red", "blue", "yellow", "red"]);
  assert.deepEqual(enemies.map((enemy) => enemy.id), [0, 1, 2]);
  assert.deepEqual(pickups.map((pickup) => pickup.id), [0, 1, 2, 3]);
});

test("生成規則は不正な連番と時刻を拒否する", () => {
  assert.throws(() => createEnemySpawn(-1, 0), /Invalid spawn input/);
  assert.throws(() => createPickupSpawn(.5, 0), /Invalid spawn input/);
  assert.throws(() => createPickupSpawn(0, Number.NaN), /Invalid spawn input/);
});

test("敵は同じ発射時間帯に1発だけ撃つ", () => {
  const firstTick = enemyFireTick(1, 18, null);
  assert.equal(firstTick, 36);
  assert.equal(enemyFireTick(1, 18.1, firstTick), null);
  assert.equal(enemyFireTick(1, 18.49, firstTick), null);
  assert.equal(enemyFireTick(1, 18.5, firstTick), null);
});

test("セッション最終更新は残り時間に収め、完了後は進めない", () => {
  assert.ok(Math.abs(sessionStepSeconds(44.99, 1 / 60, 45) - 0.01) < 1e-12);
  assert.equal(sessionStepSeconds(45, 1 / 60, 45), 0);
  assert.equal(sessionStepSeconds(10, 1 / 60, 45), 1 / 60);
  assert.equal(sessionStepSeconds(10, 1 / 60, 45, true), 0);
  assert.throws(() => sessionStepSeconds(0, -1, 45), /Invalid session timing/);
  assert.throws(() => sessionStepSeconds(0, 1 / 60, 45, "yes"), /Invalid session timing/);
});

test("ゲーム入力は移動キーだけを正規化し、フォーム操作キーを奪わない", () => {
  assert.equal(normalizeGameplayKey("ArrowDown"), "arrowdown");
  assert.equal(normalizeGameplayKey("W"), "w");
  assert.equal(normalizeGameplayKey(" "), null);
  assert.equal(normalizeGameplayKey("Enter"), null);
  assert.equal(normalizeGameplayKey(null), null);
});

test("各セッションはキーとポインターを持ち越さない新しい入力状態で始まる", () => {
  const previous = createInteractionState();
  previous.keys.add("arrowright");
  previous.pointerId = 7;
  previous.pointerTarget = { x: 800, y: 200 };
  previous.inputMethods.add("touch");

  const next = createInteractionState();
  assert.deepEqual([...next.keys], []);
  assert.equal(next.pointerId, null);
  assert.equal(next.pointerTarget, null);
  assert.deepEqual([...next.inputMethods], []);
  assert.notEqual(next.keys, previous.keys);
  assert.notEqual(next.inputMethods, previous.inputMethods);
});

test("フォーカス喪失時はキーとポインター追従をまとめて解除する", () => {
  const interaction = createInteractionState();
  interaction.keys.add("arrowright");
  interaction.pointerId = 7;
  interaction.pointerTarget = { x: 800, y: 200 };
  interaction.inputMethods.add("touch");

  clearInteractionState(interaction);

  assert.deepEqual([...interaction.keys], []);
  assert.equal(interaction.pointerId, null);
  assert.equal(interaction.pointerTarget, null);
  assert.deepEqual([...interaction.inputMethods], ["touch"]);
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
