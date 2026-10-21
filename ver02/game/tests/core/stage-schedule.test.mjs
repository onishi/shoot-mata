import test from "node:test";
import assert from "node:assert/strict";
import { PHASE05_TEST_STAGE } from "../../src/content/stages/phase05-test-segment.mjs";
import { createStageSchedule } from "../../src/core/stage-schedule.mjs";

test("TECH-02/03: 同じstageとseedは同じ敵出現・lane・drop列を作る", () => {
  const first = createStageSchedule(PHASE05_TEST_STAGE, 20261021);
  const replay = createStageSchedule(PHASE05_TEST_STAGE, 20261021);

  assert.deepEqual(replay, first);
  assert.equal(first.spawns.length, 10);
  assert.equal(first.spawns[0].tick, 150);
  assert.equal(first.spawns.at(-1).tick, 810);
  assert.equal(first.boss.startTick, 930);
  assert.equal(first.hazards[0].behaviorId, "closing-corridor");
});

test("TECH-02/03: seed変更は固定wave時刻を保ちseed対象だけを変える", () => {
  const first = createStageSchedule(PHASE05_TEST_STAGE, 1);
  const second = createStageSchedule(PHASE05_TEST_STAGE, 2);

  assert.deepEqual(first.spawns.map(({ tick }) => tick), second.spawns.map(({ tick }) => tick));
  assert.notDeepEqual(
    first.spawns.map(({ lane, dropItemId }) => ({ lane, dropItemId })),
    second.spawns.map(({ lane, dropItemId }) => ({ lane, dropItemId })),
  );
});

test("TECH-02: stageデータ差替えでwave数を変え、schedule側の条件分岐を追加しない", () => {
  const alternate = structuredClone(PHASE05_TEST_STAGE);
  alternate.id = "alternate-foundation-segment";
  alternate.waves[0].count = 3;
  const schedule = createStageSchedule(alternate, 7);

  assert.equal(schedule.stageId, "alternate-foundation-segment");
  assert.equal(schedule.spawns.length, 7);
});

test("TECH-03: seedの範囲外を明示的に拒否する", () => {
  assert.throws(() => createStageSchedule(PHASE05_TEST_STAGE, -1), /unsigned 32-bit/);
  assert.throws(() => createStageSchedule(PHASE05_TEST_STAGE, 1.5), /unsigned 32-bit/);
});
