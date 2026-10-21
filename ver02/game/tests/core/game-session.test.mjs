import test from "node:test";
import assert from "node:assert/strict";
import { PHASE05_TEST_STAGE } from "../../src/content/stages/phase05-test-segment.mjs";
import {
  createGameSession,
  dispatchGameAction,
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
  confirm(session);
  assert.equal(session.flow.screen, "stageIntro");
  confirm(session);
  while (session.flow.screen === "playing") {
    updateGameSession(session, PHASE05_TEST_STAGE, autoCommand(session));
  }
  assert.deepEqual(getGameSessionSnapshot(session), first);
});

test("CORE-05/LOOP-06: 敗北結果からタッチ用actionで再挑戦できる", () => {
  const session = createGameSession({ tutorialSeen: true });
  enterPlaying(session);
  session.simulation.player.lives = 1;
  session.simulation.loadout.queue.length = 0;
  session.simulation.enemyShots.push({ id: "forced", x: 0.198, y: 0.5, vx: -0.018, vy: 0 });
  updateGameSession(session, PHASE05_TEST_STAGE);
  assert.equal(session.flow.screen, "gameOver");
  assert.equal(getGameSessionSnapshot(session).status, "defeated");
  dispatchGameAction(session, PHASE05_TEST_STAGE, "retry");
  assert.equal(session.flow.screen, "stageIntro");
  assert.equal(session.flow.attempt, 2);
});
