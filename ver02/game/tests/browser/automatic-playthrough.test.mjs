import assert from "node:assert/strict";
import test from "node:test";
import { createAutomaticPlaythrough } from "../../src/browser/automatic-playthrough.mjs";
import { STAGE_01_ORBITAL_WRECK } from "../../src/content/stages/stage-01-orbital-wreck.mjs";
import { STAGE_02_CLOUD_REFINERY } from "../../src/content/stages/stage-02-cloud-refinery.mjs";
import { createGameSession, updateGameSession } from "../../src/core/game-session.mjs";

function runAutomaticBrowserPath(stage = STAGE_01_ORBITAL_WRECK, stageIndex = 0) {
  const session = createGameSession({ seed: 20261022, maxUnlockedStage: stageIndex });
  const driver = createAutomaticPlaythrough({ screenHoldTicks: 0, targetAttempts: 2, stageIndex });
  let updates = 0;
  while (!driver.status(session).stopped && updates < 10_000) {
    updateGameSession(session, stage, driver.nextCommand(session));
    driver.observe(session);
    updates += 1;
  }
  return { session, driver, updates };
}

test("STG-01/LOOP-06: browser用自動入力は結果と同seed再挑戦を再現する", () => {
  const { session, driver, updates } = runAutomaticBrowserPath();
  const status = driver.status(session);
  assert.ok(updates < 10_000);
  assert.equal(status.screen, "result");
  assert.equal(status.attempt, 2);
  assert.equal(status.completedAttempts, 2);
  assert.equal(status.replayMatches, true);
  assert.equal(status.failure, null);
  assert.deepEqual(status.milestones, [
    "normal-combat",
    "closing-corridor",
    "boss:crusher-sweep",
    "boss:salvage-crossfire",
    "boss:exposed-reactor",
    "boss-defeated",
    "stage-cleared",
    "result:1",
    "retry-requested",
    "result:2",
  ]);
});

test("STG-02/LOOP-06: browser用自動入力は選択画面から第2面を2回再現する", () => {
  const { session, driver, updates } = runAutomaticBrowserPath(STAGE_02_CLOUD_REFINERY, 1);
  const status = driver.status(session);
  assert.ok(updates < 10_000);
  assert.equal(status.screen, "result");
  assert.equal(status.attempt, 2);
  assert.equal(status.completedAttempts, 2);
  assert.equal(status.replayMatches, true);
  assert.equal(status.failure, null);
  assert.deepEqual(status.milestones, [
    "normal-combat",
    "charged-shutters",
    "boss:current-climb",
    "boss:shutter-barrage",
    "boss:thunder-dive",
    "boss-defeated",
    "stage-cleared",
    "result:1",
    "retry-requested",
    "result:2",
  ]);
});

test("QA driverは不正設定を拒否し、game overを合格にしない", () => {
  assert.throws(() => createAutomaticPlaythrough({ targetAttempts: 0 }), /targetAttempts/);
  assert.throws(() => createAutomaticPlaythrough({ screenHoldTicks: -1 }), /screenHoldTicks/);
  assert.throws(() => createAutomaticPlaythrough({ stageIndex: 4 }), /stageIndex/);
  const driver = createAutomaticPlaythrough();
  const session = createGameSession({ tutorialSeen: true });
  session.flow = { ...session.flow, screen: "gameOver" };
  driver.observe(session);
  assert.equal(driver.status(session).stopped, true);
  assert.match(driver.status(session).failure, /gameOver/);
});
