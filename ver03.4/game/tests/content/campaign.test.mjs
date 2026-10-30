import test from "node:test";
import assert from "node:assert/strict";
import { CAMPAIGN, STAGES } from "../../src/content/stages.mjs";
import { terrainPolygon } from "../../src/content/terrain-shapes.mjs";

test("v3.4 preserves the short six-stage route and expands enemy variety", () => {
  assert.equal(CAMPAIGN.length, 6);
  const stages = CAMPAIGN.map((id) => STAGES[id]);
  const routeMinutes = stages.reduce((ticks, stage) => ticks + stage.durationTicks, 0) / 60 / 60;
  assert.ok(routeMinutes >= 16 && routeMinutes <= 18, `v3.4 campaign route is ${routeMinutes} minutes`);

  const enemyTypes = new Set(stages.flatMap((stage) => stage.enemyTypes));
  assert.ok(enemyTypes.size >= 40, `campaign only has ${enemyTypes.size} enemy types`);
  for (const stage of stages) assert.ok(new Set(stage.enemyTypes).size >= 8, `${stage.id} needs eight distinct enemies`);
});

test("v3.4 gives every stage five physical set pieces", () => {
  for (const stage of CAMPAIGN.map((id) => STAGES[id])) {
    assert.equal(stage.sections.length, 4);
    assert.ok(stage.sections.every(({ mission }) => mission?.title && mission?.objective && mission?.beat));
    assert.equal(stage.storyEvents.length, 5);
    assert.equal(new Set(stage.storyEvents.map(({ setPiece }) => setPiece)).size, 1);
    assert.ok(stage.storyEvents.every(({ setPiece }) => setPiece));
    assert.equal(new Set(stage.storyEvents.map(({ enemyType }) => enemyType)).size, 2);
    assert.ok(stage.storyEvents.every(({ speaker, message, objective, landmark }) => speaker && message && objective && landmark));
    assert.ok(stage.bossStartTick < 150 * 60, `${stage.id} still takes too long to reach its boss`);
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

test("v3.4 stages sustain density, terrain combinations, and power-up choice", () => {
  for (const stage of CAMPAIGN.map((id) => STAGES[id])) {
    assert.ok(stage.enemyTypes.length >= 8, `${stage.id} needs at least eight regular enemy types`);
    assert.ok(stage.waves.length >= 10, `${stage.id} needs a denser sequence of formations`);
    assert.ok(
      stage.waves.filter(({ pattern }) => pattern.includes("combo")).length >= 2,
      `${stage.id} needs at least two terrain-linked formations`,
    );
    assert.deepEqual(new Set(stage.powerUps.map(({ kind }) => kind)), new Set(["option", "barrier", "overdrive"]));
  }
});

test("every terrain item has a non-rectangular collision polygon", () => {
  for (const stage of CAMPAIGN.map((id) => STAGES[id])) {
    for (const item of stage.terrain) {
      const polygon = terrainPolygon(stage.id, item);
      assert.ok(polygon.length >= 6, `${stage.id}/${item.id} needs a shaped polygon`);
      const uniqueX = new Set(polygon.map(({ x }) => Math.round(x)));
      const uniqueY = new Set(polygon.map(({ y }) => Math.round(y)));
      assert.ok(uniqueX.size > 2 || uniqueY.size > 2, `${stage.id}/${item.id} is still rectangular`);
    }
  }
});
