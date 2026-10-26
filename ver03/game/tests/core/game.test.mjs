import test from "node:test";
import assert from "node:assert/strict";
import { automaticInput, beginCampaign, beginStage, bossShieldRects, bossWeakpoint, collectCore, createGame, reactorLoadout, updateGame } from "../../src/core/game.mjs";

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
  assert.ok(game.enemyShots > 0);
  assert.ok(game.destroyedTerrain.includes("breakable-wreck"));
  assert.equal(game.score, Object.values(game.scoreBreakdown).reduce((sum, value) => sum + value, 0));
  assert.equal(game.scoreBreakdown.clear, 2000);
  assert.equal(game.scoreBreakdown.noMiss, game.misses === 0 ? 2000 : 0);
});

test("first-run instructions lead into Stage 1 and its result advances to Stage 2", () => {
  const game = createGame();
  beginCampaign(game, { showHowTo: true });
  assert.equal(game.screen, "how-to-play");
  updateGame(game, { confirmPressed: true });
  assert.equal(game.screen, "stage-intro");
  game.screen = "stage-result";
  updateGame(game, { confirmPressed: true });
  assert.equal(game.screen, "stage-intro");
  assert.equal(game.stageId, "stage-02");
  game.screen = "stage-result";
  updateGame(game, { confirmPressed: true });
  assert.equal(game.stageId, "stage-03");
});

test("automatic input completes Stage 3 after opening cysts and both Ark Core organs", () => {
  const game = createGame();
  beginStage(game, "stage-03");
  const seen = new Set();
  for (let tick = 0; tick < 22_000 && game.screen !== "stage-result"; tick += 1) {
    updateGame(game, automaticInput(game));
    for (const enemy of game.enemies) seen.add(enemy.type);
  }
  assert.equal(game.screen, "stage-result");
  assert.equal(game.defeatedBoss, true);
  assert.deepEqual(seen, new Set(["regenerating-swarm", "parasite-turret", "ark-predator", "cilia-walker"]));
  assert.ok(game.swarmRegenerations > 0);
  assert.ok(game.destroyedTerrain.some((id) => id.startsWith("cyst-")));
  assert.equal(game.arkOrgansDestroyed, 2);
  assert.ok(game.bossShots > 0);
  assert.ok(game.bossWeakpointHits > 0);
  assert.equal(game.terrainHits, 0);
});

test("automatic input completes Stage 2 with four distinct enemies and the rail boss", () => {
  const game = createGame();
  beginStage(game, "stage-02");
  const seen = new Set();
  for (let tick = 0; tick < 20_000 && game.screen !== "stage-result"; tick += 1) {
    updateGame(game, automaticInput(game));
    for (const enemy of game.enemies) seen.add(enemy.type);
  }
  assert.equal(game.screen, "stage-result");
  assert.equal(game.defeatedBoss, true);
  assert.deepEqual(seen, new Set(["cloud-skimmer", "shutter-turret", "storm-diver", "condenser-leech"]));
  assert.ok(game.currentTicks > 0);
  assert.ok(game.shutterWarnings > 0);
  assert.ok(game.bossShots > 0);
  assert.ok(game.bossShieldBlocks > 0);
  assert.ok(game.bossWeakpointHits > 0);
  assert.equal(game.terrainHits, 0);
  assert.equal(game.score - game.stageStartScore, Object.values(game.scoreBreakdown).reduce((sum, value) => sum + value, 0));
});

test("losing the last life opens continue and retry resets the stage and score", () => {
  const game = createGame();
  game.screen = "playing";
  game.lives = 1;
  game.score = 999;
  game.scoreBreakdown.defeat = 999;
  game.enemyBullets.push({ kind: "enemy-shot", x: game.player.x, y: game.player.y, radius: 6, vx: 0, vy: 0, age: 0 });
  updateGame(game, {});
  assert.equal(game.screen, "continue");
  assert.equal(game.lives, 0);
  updateGame(game, { confirmPressed: true });
  assert.equal(game.screen, "stage-intro");
  assert.equal(game.lives, 3);
  assert.equal(game.score, 0);
});

test("Hull Crawler stays attached to a ceiling beam and drops proximity mines", () => {
  const game = createGame();
  game.screen = "playing";
  for (let tick = 0; tick < 1_100; tick += 1) updateGame(game, {});
  const crawler = game.enemies.find(({ type }) => type === "hull-crawler");
  assert.ok(crawler);
  assert.equal(crawler.terrainId, "ceiling-a");
  assert.ok(game.enemyBullets.some(({ kind }) => kind === "mine"));
});

test("enemy projectiles consume a core before a life", () => {
  const game = createGame();
  game.screen = "playing";
  collectCore(game, "red");
  game.enemyBullets.push({ kind: "enemy-shot", x: game.player.x, y: game.player.y, radius: 6, vx: 0, vy: 0, age: 0 });
  updateGame(game, {});
  assert.equal(game.cores.length, 0);
  assert.equal(game.lives, 3);
  assert.equal(game.combatHits, 1);
});

test("Wreck Warden telegraphs fan attacks and only takes damage at its rotating weakpoint", () => {
  const game = createGame();
  game.screen = "playing";
  game.tick = 190 * 60 - 1;
  updateGame(game, {});
  assert.equal(game.boss.attackWarning, true);
  const initialHp = game.boss.hp;
  const shield = bossShieldRects(game.boss)[0];
  game.bullets.push({ kind: "pulse", x: shield.x + 10, y: shield.y + 10, width: 18, height: 4, vx: 0, vy: 0, damage: 2, pierce: 0 });
  updateGame(game, {});
  assert.equal(game.boss.hp, initialHp);
  assert.equal(game.bossShieldBlocks, 1);
  const weakpoint = bossWeakpoint(game.boss);
  game.bullets.push({ kind: "pulse", x: weakpoint.x - 4, y: weakpoint.y - 2, width: 8, height: 4, vx: 0, vy: 0, damage: 2, pierce: 0 });
  updateGame(game, {});
  assert.equal(game.boss.hp, initialHp - 2);
  assert.equal(game.bossWeakpointHits, 1);
  for (let tick = 0; tick < 90; tick += 1) updateGame(game, {});
  assert.ok(game.bossShots >= 3);
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
