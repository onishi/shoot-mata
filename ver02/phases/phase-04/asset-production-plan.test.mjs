import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(readFileSync(resolve(root, "asset-production-plan.json"), "utf8"));

test("production plan covers four distinct stage slices", () => {
  assert.deepEqual(plan.stages.map(({ id }) => id), ["stage-01", "stage-02", "stage-03", "stage-04"]);
  assert.equal(new Set(plan.stages.map(({ slug }) => slug)).size, 4);
  for (const stage of plan.stages) {
    assert.deepEqual(stage.backgroundLayers, ["far", "mid", "fore"]);
    assert.ok(stage.enemyTypes.length >= 3);
    assert.equal(new Set(stage.enemyTypes).size, stage.enemyTypes.length);
    assert.ok(stage.mechanic && stage.boss && stage.bossForms >= 1);
    assert.deepEqual(stage.musicLayers, ["rhythm", "melody", "danger"]);
    assert.deepEqual(stage.transitions, ["intro", "clear"]);
    assert.match(stage.deliveryPhase, /^phase-0[67]$/);
  }
});

test("production plan covers all three weapon families and levels", () => {
  assert.deepEqual(plan.weapons.map(({ id }) => id), ["lance", "spread", "seeker"]);
  for (const weapon of plan.weapons) {
    assert.deepEqual(weapon.levels, [1, 2, 3]);
    assert.deepEqual(weapon.visualSetsPerLevel, ["projectile", "impact"]);
  }
});

test("shared plan covers the complete product flow and audiovisual feedback", () => {
  assert.deepEqual(plan.shared.uiScreens, [
    "title", "intro", "tutorial", "settings", "stage-select", "hud", "pause", "result", "continue", "ending", "credits",
  ]);
  assert.deepEqual(plan.shared.vfxEvents, [
    "fire", "hit", "damage", "destroy", "collect", "weapon-level", "warning", "boss-entry", "clear",
  ]);
  assert.equal(plan.shared.coreColors.length * plan.shared.coreStatesPerColor.length, 12);
  assert.ok(plan.shared.audioEvents.length >= plan.shared.vfxEvents.length);
});

test("minimum production estimate is reproducible from plan dimensions", () => {
  const stageUnits = plan.stages.reduce((sum, stage) => sum + stage.backgroundLayers.length + stage.enemyTypes.length +
    1 + stage.bossForms + stage.musicLayers.length + stage.transitions.length, 0);
  const weaponLevelUnits = plan.weapons.reduce((sum, weapon) => sum + weapon.levels.length * weapon.visualSetsPerLevel.length, 0);
  const sharedVisualUnits = plan.shared.playerStates.length +
    plan.shared.coreColors.length * plan.shared.coreStatesPerColor.length +
    plan.shared.uiScreens.length + plan.shared.vfxEvents.length;
  assert.equal(stageUnits, plan.estimate.stageUnits);
  assert.equal(weaponLevelUnits, plan.estimate.weaponLevelUnits);
  assert.equal(sharedVisualUnits, plan.estimate.sharedVisualUnits);
  assert.equal(plan.shared.audioEvents.length, plan.estimate.sharedAudioEventUnits);
  assert.equal(stageUnits + weaponLevelUnits + sharedVisualUnits + plan.shared.audioEvents.length, plan.estimate.totalMinimumUnits);
});

test("asset filenames and inventory states have enforceable patterns", () => {
  const filenamePattern = new RegExp(plan.naming.pattern);
  assert.match("stage-04-stellar-furnace-boss-v2.png", filenamePattern);
  assert.match("weapon-lance-shot-v1.wav", filenamePattern);
  assert.doesNotMatch("Stage 4 Final FINAL.png", filenamePattern);
  assert.deepEqual(plan.naming.states, ["planned", "draft", "final", "verified"]);
});
