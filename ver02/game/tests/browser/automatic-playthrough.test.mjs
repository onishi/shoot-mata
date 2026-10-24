import assert from "node:assert/strict";
import test from "node:test";
import {
  createAutomaticCampaignPlaythrough,
  createAutomaticFailureReview,
  createAutomaticPlaythrough,
} from "../../src/browser/automatic-playthrough.mjs";
import { STAGE_01_ORBITAL_WRECK } from "../../src/content/stages/stage-01-orbital-wreck.mjs";
import { STAGE_02_CLOUD_REFINERY } from "../../src/content/stages/stage-02-cloud-refinery.mjs";
import { STAGE_03_LIVING_ARK } from "../../src/content/stages/stage-03-living-ark.mjs";
import { STAGE_04_STELLAR_FURNACE } from "../../src/content/stages/stage-04-stellar-furnace.mjs";
import { createGameSession, updateGameSession } from "../../src/core/game-session.mjs";

function runAutomaticBrowserPath(stage = STAGE_01_ORBITAL_WRECK, stageIndex = 0, seed = 20261022) {
  const session = createGameSession({ seed, maxUnlockedStage: stageIndex });
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

test("STG-03/LOOP-06: browser用自動入力は選択画面から第3面を2回再現する", () => {
  const { session, driver, updates } = runAutomaticBrowserPath(STAGE_03_LIVING_ARK, 2, 20261023);
  const status = driver.status(session);
  assert.ok(updates < 10_000);
  assert.equal(status.screen, "result");
  assert.equal(status.attempt, 2);
  assert.equal(status.completedAttempts, 2);
  assert.equal(status.replayMatches, true);
  assert.equal(status.failure, null);
  assert.deepEqual(status.milestones, [
    "normal-combat",
    "living-tissue",
    "growth-source",
    "contracting-tissue",
    "boss:feeding-arms",
    "boss:grown-carapace",
    "boss:shifting-heart",
    "boss-defeated",
    "stage-cleared",
    "result:1",
    "retry-requested",
    "result:2",
  ]);
});

test("STG-04/LOOP-06: browser用自動入力は選択画面から第4面を2回再現する", () => {
  const { session, driver, updates } = runAutomaticBrowserPath(STAGE_04_STELLAR_FURNACE, 3, 20261024);
  const status = driver.status(session);
  assert.ok(updates < 10_000);
  assert.equal(status.screen, "result");
  assert.equal(status.attempt, 2);
  assert.equal(status.completedAttempts, 2);
  assert.equal(status.replayMatches, true);
  assert.equal(status.failure, null);
  assert.deepEqual(status.milestones, [
    "normal-combat",
    "stellar-heatwave",
    "periodic-heatwave",
    "destruction-safe-zone",
    "boss:thermal-shell",
    "boss:overload-ram",
    "boss:omni-flare",
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

test("EXP-03: browser用敗北QAは原因と直前コア列を保持したGAME OVERで停止する", () => {
  const session = createGameSession({ seed: 20261022 });
  const driver = createAutomaticFailureReview({ screenHoldTicks: 0 });
  let updates = 0;
  while (!driver.status(session).stopped && updates < 2_000) {
    updateGameSession(session, STAGE_01_ORBITAL_WRECK, driver.nextCommand(session));
    driver.observe(session);
    updates += 1;
  }
  const status = driver.status(session);
  assert.ok(updates < 2_000);
  assert.equal(status.failure, null);
  assert.equal(status.screen, "gameOver");
  assert.equal(status.mode, "failure-review");
  assert.deepEqual(status.milestones, [
    "failure:enemy-shot",
    "core-queue-recorded",
    "retry-available",
  ]);
  assert.equal(session.lastRun.failure.reason, "enemy-shot");
  assert.deepEqual(session.lastRun.failure.coreQueueBefore, []);
});

test("LOOP-01/05/TECH-03: browser用自動入力で4面からendingとcreditsまで連続完走する", () => {
  const stages = [
    STAGE_01_ORBITAL_WRECK,
    STAGE_02_CLOUD_REFINERY,
    STAGE_03_LIVING_ARK,
    STAGE_04_STELLAR_FURNACE,
  ];
  const seeds = [20261022, 20261022, 20261023, 20261024];
  const session = createGameSession({ seed: seeds[0] });
  const driver = createAutomaticCampaignPlaythrough({ screenHoldTicks: 0 });
  let updates = 0;
  while (!driver.status(session).stopped && updates < 20_000) {
    const stageIndex = session.flow.stageIndex ?? 0;
    session.seed = seeds[stageIndex];
    updateGameSession(session, stages[stageIndex], driver.nextCommand(session));
    driver.observe(session);
    updates += 1;
  }
  const status = driver.status(session);
  assert.ok(updates < 20_000);
  assert.equal(status.failure, null);
  assert.equal(status.screen, "credits");
  assert.equal(status.completedAttempts, 4);
  assert.equal(status.completedCampaigns, 1);
  assert.equal(status.replayMatches, null);
  assert.deepEqual(status.milestones, [
    "stage-1-clear", "stage-2-clear", "stage-3-clear", "stage-4-clear", "ending", "credits",
  ]);
});

test("TECH-03: browser用自動入力で同seedのcampaignを3回完走して結果一致を検査する", () => {
  const stages = [
    STAGE_01_ORBITAL_WRECK,
    STAGE_02_CLOUD_REFINERY,
    STAGE_03_LIVING_ARK,
    STAGE_04_STELLAR_FURNACE,
  ];
  const seeds = [20261022, 20261022, 20261023, 20261024];
  const session = createGameSession({ seed: seeds[0] });
  const driver = createAutomaticCampaignPlaythrough({ screenHoldTicks: 0, targetCampaigns: 3 });
  let updates = 0;
  while (!driver.status(session).stopped && updates < 60_000) {
    const stageIndex = session.flow.stageIndex ?? 0;
    session.seed = seeds[stageIndex];
    updateGameSession(session, stages[stageIndex], driver.nextCommand(session));
    driver.observe(session);
    updates += 1;
  }
  const status = driver.status(session);
  assert.ok(updates < 60_000);
  assert.equal(status.failure, null);
  assert.equal(status.screen, "credits");
  assert.equal(status.completedAttempts, 12);
  assert.equal(status.completedCampaigns, 3);
  assert.equal(status.targetCampaigns, 3);
  assert.equal(status.replayMatches, true);
});

test("campaign QA driverは不正な反復回数を拒否する", () => {
  assert.throws(() => createAutomaticCampaignPlaythrough({ targetCampaigns: 0 }), /targetCampaigns/);
});
