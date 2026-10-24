import test from "node:test";
import assert from "node:assert/strict";
import { PHASE05_TEST_STAGE } from "../../src/content/stages/phase05-test-segment.mjs";
import {
  createGameSession,
  dispatchGameAction,
  getCampaignSummary,
  getGameSessionSnapshot,
  updateGameSession,
} from "../../src/core/game-session.mjs";

function confirm(session) {
  updateGameSession(session, PHASE05_TEST_STAGE, { confirm: true });
}

function autoCommand(session) {
  const simulation = session.simulation;
  const target = simulation.boss && !simulation.boss.defeated
    ? simulation.boss
    : simulation.enemies[0];
  const delta = (target?.y ?? 0.5) - simulation.player.y;
  return { moveY: Math.abs(delta) < 0.025 ? 0 : Math.sign(delta), fire: true };
}

function enterPlaying(session) {
  confirm(session);
  if (session.flow.screen === "tutorial") confirm(session);
  confirm(session);
  assert.equal(session.flow.screen, "playing");
}

test("LOOP-01/INP-01: 共通commandで初回説明から戦闘へ入る", () => {
  const session = createGameSession({ seed: 77 });
  confirm(session);
  assert.equal(session.flow.screen, "tutorial");
  confirm(session);
  assert.equal(session.flow.screen, "stageIntro");
  confirm(session);
  assert.equal(session.flow.screen, "playing");
  assert.equal(session.simulation.seed, 77);
});

test("LOOP-04: セッションのポーズ中は戦闘tickを進めず確認を解決できる", () => {
  const session = createGameSession({ tutorialSeen: true });
  enterPlaying(session);
  updateGameSession(session, PHASE05_TEST_STAGE, { fire: true });
  const pausedTick = session.simulation.tick;
  updateGameSession(session, PHASE05_TEST_STAGE, { pause: true });
  assert.equal(session.flow.screen, "paused");
  for (let index = 0; index < 30; index += 1) updateGameSession(session, PHASE05_TEST_STAGE, { fire: true });
  assert.equal(session.simulation.tick, pausedTick);

  dispatchGameAction(session, PHASE05_TEST_STAGE, "request-restart");
  assert.equal(session.flow.confirmation, "restart");
  updateGameSession(session, PHASE05_TEST_STAGE, { back: true });
  assert.equal(session.flow.confirmation, null);
  assert.equal(session.flow.screen, "paused");
  updateGameSession(session, PHASE05_TEST_STAGE, { pause: true });
  assert.equal(session.flow.screen, "playing");
});

test("TECH-03/LOOP-06: ブラウザ用セッションも結果と同seed再挑戦へ到達する", () => {
  const session = createGameSession({ seed: 77, tutorialSeen: true });
  enterPlaying(session);
  while (session.flow.screen === "playing") {
    updateGameSession(session, PHASE05_TEST_STAGE, autoCommand(session));
  }
  assert.equal(session.flow.screen, "result");
  const first = getGameSessionSnapshot(session);
  assert.equal(first.status, "cleared");
  dispatchGameAction(session, PHASE05_TEST_STAGE, "retry");
  assert.equal(session.flow.screen, "stageIntro");
  confirm(session);
  while (session.flow.screen === "playing") {
    updateGameSession(session, PHASE05_TEST_STAGE, autoCommand(session));
  }
  assert.deepEqual(getGameSessionSnapshot(session), first);
});

test("LOOP-01/05: 4面キャンペーンの結果を集計してendingとcreditsへ進む", () => {
  const session = createGameSession({ seed: 77, tutorialSeen: true });
  confirm(session);
  for (let stageIndex = 0; stageIndex < 4; stageIndex += 1) {
    confirm(session);
    while (session.flow.screen === "playing") {
      updateGameSession(session, PHASE05_TEST_STAGE, autoCommand(session));
    }
    assert.equal(session.flow.screen, "result");
    dispatchGameAction(session, PHASE05_TEST_STAGE, "advance");
  }
  assert.equal(session.flow.screen, "ending");
  const summary = getCampaignSummary(session);
  assert.equal(summary.completedStages, 4);
  assert.equal(summary.score, session.campaignRuns.reduce((total, run) => total + run.score, 0));
  assert.deepEqual(summary.breakdown, session.campaignRuns.reduce((total, run) => ({
    enemy: total.enemy + run.scoreBreakdown.enemy,
    core: total.core + run.scoreBreakdown.core,
    streak: total.streak + run.scoreBreakdown.streak,
    noHit: total.noHit + run.scoreBreakdown.noHit,
  }), { enemy: 0, core: 0, streak: 0, noHit: 0 }));
  confirm(session);
  assert.equal(session.flow.screen, "credits");
  confirm(session);
  assert.equal(session.flow.screen, "title");
});

test("INP-04: campaign結果の共通confirmは主導線の次面へ進む", () => {
  const session = createGameSession({ seed: 77, tutorialSeen: true });
  confirm(session);
  confirm(session);
  while (session.flow.screen === "playing") {
    updateGameSession(session, PHASE05_TEST_STAGE, autoCommand(session));
  }
  assert.equal(session.flow.screen, "result");
  confirm(session);
  assert.equal(session.flow.screen, "stageIntro");
  assert.equal(session.flow.stageIndex, 1);
  assert.equal(session.flow.attempt, 2);
});

test("CORE-05/LOOP-06: 敗北結果からタッチ用actionで再挑戦できる", () => {
  const session = createGameSession({ tutorialSeen: true });
  enterPlaying(session);
  session.simulation.player.lives = 1;
  session.simulation.loadout.queue.length = 0;
  session.simulation.enemyShots.push({ id: "forced", x: 0.198, y: 0.5, vx: -0.018, vy: 0 });
  updateGameSession(session, PHASE05_TEST_STAGE);
  assert.equal(session.flow.screen, "gameOver");
  assert.deepEqual(getGameSessionSnapshot(session).failure, {
    tick: 0,
    reason: "enemy-shot",
    coreQueueBefore: [],
    lostCore: null,
    livesBefore: 1,
    livesAfter: 0,
  });
  dispatchGameAction(session, PHASE05_TEST_STAGE, "retry");
  assert.equal(session.flow.screen, "stageIntro");
  assert.equal(session.flow.attempt, 2);
  confirm(session);
  assert.equal(getGameSessionSnapshot(session).failure, null);
});
