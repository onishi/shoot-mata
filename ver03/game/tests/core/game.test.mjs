import test from "node:test";
import assert from "node:assert/strict";
import { automaticInput, beginStage, collectCore, createGame, reactorLoadout, updateGame } from "../../src/core/game.mjs";

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
  assert.ok(game.coresCollected >= 6);
  assert.ok(game.weaponShots.lance > 0);
  assert.ok(game.weaponShots.spread > 0);
  assert.ok(game.weaponShots.seeker > 0);
});

test("reactor queue is FIFO and derives levels and auxiliary effects", () => {
  const game = createGame();
  for (const color of ["red", "red", "blue", "yellow"]) collectCore(game, color);
  assert.deepEqual(game.cores, ["red", "blue", "yellow"]);
  assert.deepEqual(reactorLoadout(game.cores), {
    weapon: "LANCE", color: "red", level: 1, pierce: 0, invulnerability: 15, collectionRadius: 32
  });
});

test("all reactor weapons fire alongside the permanent PULSE", () => {
  for (const [color, counter] of [["red", "lance"], ["blue", "spread"], ["yellow", "seeker"]]) {
    const game = createGame();
    game.screen = "playing";
    collectCore(game, color); collectCore(game, color); collectCore(game, color);
    for (let tick = 0; tick < 60; tick += 1) updateGame(game, { fire: true });
    assert.ok(game.pulseShots > 0, `${color} loadout stopped PULSE`);
    assert.ok(game.weaponShots[counter] > 0, `${color} weapon did not fire`);
  }
});
