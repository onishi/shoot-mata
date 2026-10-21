import test from "node:test";
import assert from "node:assert/strict";
import { PHASE05_TEST_STAGE } from "../../src/content/stages/phase05-test-segment.mjs";
import { parseStageDefinition } from "../../src/content/stage-schema.mjs";

function editableStage() {
  return structuredClone(PHASE05_TEST_STAGE);
}

test("TECH-02: 仮区間は背景・敵編成・drop・仕掛け・boss phase・音・遷移を検査する", () => {
  const stage = parseStageDefinition(editableStage());

  assert.equal(stage.backgroundLayers.length, 3);
  assert.equal(stage.enemyTypes.length, 2);
  assert.deepEqual(stage.dropTables[0].entries.map(({ itemId }) => itemId), [
    "core-red", "core-blue", "core-yellow",
  ]);
  assert.equal(stage.hazards.length, 1);
  assert.equal(stage.boss.phases.length, 2);
  assert.equal(stage.sections.at(-1).endTick, stage.durationTicks);
  assert.equal(stage.transitions.onClear, "STAGE_CLEAR");
  assert.ok(Object.isFrozen(stage));
  assert.ok(Object.isFrozen(stage.waves[0]));
});

test("TECH-02: 未登録behaviorと未知fieldをfail closedで拒否する", () => {
  const unknownBehavior = editableStage();
  unknownBehavior.waves[0].spawnBehaviorId = "stage-one-special-case";
  assert.throws(() => parseStageDefinition(unknownBehavior), /unknown spawn behavior/);

  const unknownField = editableStage();
  unknownField.stageNumberSwitch = true;
  assert.throws(() => parseStageDefinition(unknownField), /stageNumberSwitch.*not allowed/);
});

test("TECH-02: 重複ID、参照切れ、区間外spawnを場所付きで拒否する", () => {
  const duplicate = editableStage();
  duplicate.enemyTypes[1].id = duplicate.enemyTypes[0].id;
  assert.throws(() => parseStageDefinition(duplicate), /enemyTypes\[1\]\.id.*duplicates/);

  const missingReference = editableStage();
  missingReference.waves[0].dropTableId = "missing-table";
  assert.throws(() => parseStageDefinition(missingReference), /unknown drop table/);

  const outsideSection = editableStage();
  outsideSection.waves[0].startTick = 590;
  assert.throws(() => parseStageDefinition(outsideSection), /spawn ticks must stay inside/);
});

test("TECH-02: sectionsの隙間・逆転とboss以外のboss参照を拒否する", () => {
  const gap = editableStage();
  gap.sections[1].startTick += 1;
  assert.throws(() => parseStageDefinition(gap), /must continue at tick 120/);

  const wrongBossSection = editableStage();
  wrongBossSection.boss.sectionId = "closing-wreck";
  assert.throws(() => parseStageDefinition(wrongBossSection), /must reference a boss section/);
});
