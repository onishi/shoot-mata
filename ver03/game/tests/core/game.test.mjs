import test from "node:test";
import assert from "node:assert/strict";
import { automaticInput, beginStage, createGame, updateGame } from "../../src/core/game.mjs";

test("PULSE always fires when the reactor is empty", () => {
  const game = createGame();
  beginStage(game);
  for (let tick = 0; tick < 110; tick += 1) updateGame(game, { fire: true });
  assert.equal(game.cores.length, 0);
  assert.ok(game.pulseShots >= 2);
});

test("automatic input completes Stage 1 and defeats the boss", () => {
  const game = createGame();
  beginStage(game);
  for (let tick = 0; tick < 16_000 && game.screen !== "stage-result"; tick += 1) {
    updateGame(game, automaticInput(game));
  }
  assert.equal(game.screen, "stage-result");
  assert.equal(game.defeatedBoss, true);
  assert.ok(game.tick >= 190 * 60);
});
