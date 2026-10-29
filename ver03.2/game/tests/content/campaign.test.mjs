import test from "node:test";
import assert from "node:assert/strict";
import { CAMPAIGN, STAGES } from "../../src/content/stages.mjs";

test("campaign meets the six-stage duration and enemy variety targets", () => {
  assert.equal(CAMPAIGN.length, 6);
  const stages = CAMPAIGN.map((id) => STAGES[id]);
  const routeMinutes = stages.reduce((ticks, stage) => ticks + stage.durationTicks, 0) / 60 / 60;
  assert.ok(routeMinutes >= 20 && routeMinutes <= 24, `v3.2 campaign route is ${routeMinutes} minutes`);

  const enemyTypes = new Set(stages.flatMap((stage) => stage.enemyTypes));
  assert.ok(enemyTypes.size >= 20, `campaign only has ${enemyTypes.size} enemy types`);
  for (const stage of stages) assert.ok(new Set(stage.enemyTypes).size >= 3, `${stage.id} needs three distinct enemies`);
});

test("v3.2 gives every stage four narrative mission beats", () => {
  for (const stage of CAMPAIGN.map((id) => STAGES[id])) {
    assert.equal(stage.sections.length, 4);
    assert.ok(stage.sections.every(({ mission }) => mission?.title && mission?.objective && mission?.beat));
    assert.ok(stage.bossStartTick < 180 * 60, `${stage.id} still takes too long to reach its boss`);
  }
});

test("every stage has contiguous introduction, development, climax, and boss sections", () => {
  for (const stage of CAMPAIGN.map((id) => STAGES[id])) {
    assert.deepEqual(stage.sections.map(({ id }) => id), ["introduction", "development", "climax", "boss"]);
    assert.equal(stage.sections[0].startTick, 0);
    assert.equal(stage.sections.at(-1).endTick, stage.durationTicks);
    assert.equal(stage.sections.at(-1).startTick, stage.bossStartTick);
    for (let index = 1; index < stage.sections.length; index += 1) {
      assert.equal(stage.sections[index - 1].endTick, stage.sections[index].startTick);
      assert.ok(stage.sections[index].endTick > stage.sections[index].startTick);
    }
  }
});

test("v3.2 stages sustain density, variety, terrain combinations, and power-up choice", () => {
  for (const stage of CAMPAIGN.map((id) => STAGES[id])) {
    assert.ok(stage.enemyTypes.length >= 6, `${stage.id} needs at least six regular enemy types`);
    assert.ok(stage.waves.length >= 10, `${stage.id} needs a denser sequence of formations`);
    assert.ok(
      stage.waves.filter(({ pattern }) => pattern.includes("combo")).length >= 2,
      `${stage.id} needs at least two terrain-linked formations`,
    );
    assert.deepEqual(new Set(stage.powerUps.map(({ kind }) => kind)), new Set(["option", "barrier", "overdrive"]));
  }
});
