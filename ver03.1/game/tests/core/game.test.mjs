import test from "node:test";
import assert from "node:assert/strict";
import { automaticInput, beginCampaign, beginStage, bossShieldRects, bossWeakpoint, collectCore, collectPowerUp, createGame, openStageSelect, reactorLoadout, setDifficulty, updateGame } from "../../src/core/game.mjs";
import { CAMPAIGN, stageById } from "../../src/content/stages.mjs";

test("PULSE always fires when the reactor is empty", () => {
  const game = createGame();
  beginStage(game);
  for (let tick = 0; tick < 110; tick += 1) updateGame(game, { fire: true });
  assert.equal(game.cores.length, 0);
  assert.ok(game.pulseShots >= 2);
});

test("PULSE alone can defeat every campaign boss", () => {
  for (const stageId of CAMPAIGN) {
    const game = createGame(stageId);
    const stage = stageById(stageId);
    game.screen = "playing";
    game.tick = stage.bossStartTick - 1;
    game.scrollX = game.tick * stage.scrollSpeed;
    game.player.invulnerable = 1_000_000;

    for (let tick = 0; tick < 15_000 && game.screen === "playing"; tick += 1) {
      game.pickups.length = 0;
      game.cores.length = 0;
      updateGame(game, automaticInput(game));
    }

    assert.equal(game.screen, "stage-result", `${stageId} was not cleared with PULSE`);
    assert.equal(game.defeatedBoss, true, `${stageId} boss survived PULSE`);
    assert.deepEqual(game.weaponShots, { lance: 0, spread: 0, seeker: 0 });
  }
});

test("high score updates with points and survives resets", () => {
  const game = createGame();
  game.highScore = 500;
  collectCore(game, "red");
  assert.equal(game.score, 75);
  assert.equal(game.highScore, 500);

  game.score = 475;
  collectCore(game, "blue");
  assert.equal(game.highScore, 550);
  beginCampaign(game);
  assert.equal(game.score, 0);
  assert.equal(game.highScore, 550);

  game.screen = "continue";
  updateGame(game, { confirmPressed: true });
  assert.equal(game.score, 0);
  assert.equal(game.highScore, 550);
});

test("assist difficulty applies all four documented aids and survives campaign setup", () => {
  const game = createGame();
  setDifficulty(game, "assist");
  beginCampaign(game);
  assert.equal(game.difficulty, "assist");
  assert.equal(game.lives, 4);
  game.screen = "playing";

  game.enemyBullets.push({ kind: "enemy-shot", x: 500, y: 600, radius: 6, vx: -4, vy: 0, age: 0 });
  updateGame(game, {});
  assert.equal(game.enemyBullets[0].x, 497, "enemy bullets move at 75% speed");

  game.pickups.push({ x: game.player.x + 2.7, y: game.player.y + 32, color: "yellow", radius: 20 });
  updateGame(game, {});
  assert.deepEqual(game.cores, ["yellow"], "assist collection radius is 1.25x");
  game.cores.length = 0;

  game.enemyBullets.push({ kind: "enemy-shot", x: game.player.x, y: game.player.y, radius: 6, vx: 0, vy: 0, age: 0 });
  updateGame(game, {});
  assert.equal(game.lives, 3);
  assert.equal(game.respawnTicks, 120);
  for (let tick = 0; tick < 120; tick += 1) updateGame(game, {});
  assert.equal(game.player.invulnerable, 180, "assist respawn invulnerability is 1.5x");
});

test("standard difficulty does not collect a core inside only the assist radius", () => {
  const game = createGame();
  game.screen = "playing";
  game.pickups.push({ x: game.player.x + 2.7, y: game.player.y + 32, color: "yellow", radius: 20 });
  updateGame(game, {});
  assert.deepEqual(game.cores, []);
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
  assert.equal(game.unlockedStage, 2);
});

test("stage select only offers unlocked stages and practice returns to title", () => {
  const game = createGame();
  game.unlockedStage = 5;
  openStageSelect(game);
  assert.equal(game.screen, "stage-select");
  updateGame(game, { upPressed: true });
  assert.equal(game.selectedStageIndex, 4);
  updateGame(game, { confirmPressed: true });
  assert.equal(game.stageId, "stage-05");
  assert.equal(game.practiceMode, true);
  game.screen = "stage-result";
  updateGame(game, { confirmPressed: true });
  assert.equal(game.screen, "title");
  assert.equal(game.unlockedStage, 5);
});

test("continue retries the current stage and preserves practice mode", () => {
  const game = createGame("stage-04");
  game.screen = "continue";
  game.practiceMode = true;
  updateGame(game, { confirmPressed: true });
  assert.equal(game.stageId, "stage-04");
  assert.equal(game.screen, "stage-intro");
  assert.equal(game.practiceMode, true);
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
  game.screen = "stage-result";
  updateGame(game, { confirmPressed: true });
  assert.equal(game.stageId, "stage-04");
  game.screen = "stage-result";
  updateGame(game, { confirmPressed: true });
  assert.equal(game.stageId, "stage-05");
  game.screen = "stage-result";
  updateGame(game, { confirmPressed: true });
  assert.equal(game.stageId, "stage-06");
  game.screen = "stage-result";
  updateGame(game, { confirmPressed: true });
  assert.equal(game.screen, "ending");
  updateGame(game, { confirmPressed: true });
  assert.equal(game.screen, "credits");
  updateGame(game, { confirmPressed: true });
  assert.equal(game.screen, "title");
});

test("first-run instructions return to the title with cancel", () => {
  const game = createGame();
  beginCampaign(game, { showHowTo: true });

  assert.equal(game.screen, "how-to-play");
  updateGame(game, { cancelPressed: true });
  assert.equal(game.screen, "title");
  assert.equal(game.stageId, "stage-01");
});

test("pause can return to the title without advancing the simulation", () => {
  const game = createGame("stage-04");
  beginStage(game, "stage-04");
  game.screen = "playing";
  game.tick = 240;

  updateGame(game, { pausePressed: true });
  assert.equal(game.paused, true);
  assert.equal(game.tick, 240);

  updateGame(game, { cancelPressed: true });
  assert.equal(game.screen, "title");
  assert.equal(game.paused, false);
  assert.equal(game.tick, 0);
  assert.equal(game.stageId, "stage-01");
});

test("a miss restores the last safe checkpoint and rebuilds its encounters", () => {
  const game = createGame();
  game.screen = "playing";
  game.tick = 130 * 60;
  game.scrollX = game.tick * stageById(game.stageId).scrollSpeed;
  game.cores.length = 0;
  game.destroyedTerrain.push("breakable-wreck");
  game.terrainDamage["breakable-wreck"] = 48;
  game.enemies.push({ x: 900, y: 300, width: 50, height: 40, hp: 1, type: "salvage-collector", spawnedTick: game.tick });
  game.enemyBullets.push({ kind: "enemy-shot", x: game.player.x, y: game.player.y, radius: 6, vx: 0, vy: 0, age: 0 });

  updateGame(game, {});

  assert.equal(game.lives, 2);
  assert.equal(game.tick, 125 * 60);
  assert.equal(game.checkpointTick, 125 * 60);
  assert.equal(game.scrollX, 125 * 60 * stageById(game.stageId).scrollSpeed);
  assert.equal(game.respawnTicks, 120);
  assert.deepEqual(game.enemies, []);
  assert.deepEqual(game.enemyBullets, []);
  assert.deepEqual(game.destroyedTerrain, [], "destructible terrain ahead of the checkpoint must be rebuilt");
  assert.equal(game.nextWave, stageById(game.stageId).waves.findIndex(({ tick }) => tick >= 125 * 60), "the climax wave must replay after respawn");
  assert.equal(game.nextCoreDrop, 4, "one recovery core and the climax drops must replay after respawn");
});

test("automatic input completes Stage 6 and exposes the Sovereign core", () => {
  const game = createGame();
  beginStage(game, "stage-06");
  const seen = new Set();
  for (let tick = 0; tick < 28_000 && game.screen !== "stage-result"; tick += 1) {
    updateGame(game, automaticInput(game));
    for (const enemy of game.enemies) seen.add(enemy.type);
  }
  assert.equal(game.screen, "stage-result");
  assert.equal(game.defeatedBoss, true);
  for (const type of ["gate-mite", "vector-inverter", "relay-sniper", "null-carrier"]) assert.ok(seen.has(type));
  assert.deepEqual(game.sovereignPhasesSeen, [0, 1, 2, 3]);
  assert.ok(game.phaseWallWarnings > 0);
  assert.ok(game.gravityFlips > 0);
  assert.ok(game.relaySniperWarnings > 0);
  assert.ok(game.relayPillarsDestroyed >= 3);
  assert.ok(game.bossShots > 0);
  assert.ok(game.bossWeakpointHits > 0);
  assert.equal(game.terrainHits, 0);
});

test("automatic input completes Stage 5 with reflected crystal combat and all Oracle phases", () => {
  const game = createGame();
  beginStage(game, "stage-05");
  const seen = new Set();
  for (let tick = 0; tick < 25_000 && game.screen !== "stage-result"; tick += 1) {
    updateGame(game, automaticInput(game));
    for (const enemy of game.enemies) seen.add(enemy.type);
  }
  assert.equal(game.screen, "stage-result");
  assert.equal(game.defeatedBoss, true);
  assert.deepEqual(seen, new Set(stageById("stage-05").enemyTypes));
  assert.deepEqual(game.prismPhasesSeen, [0, 1, 2]);
  assert.ok(game.phaseRayWarnings > 0);
  assert.ok(game.bossShots > 0);
  assert.ok(game.bossWeakpointHits > 0);
  assert.equal(game.terrainHits, 0);
});

test("enemy crystal shots reflect once from Stage 5 reflective terrain", () => {
  const game = createGame("stage-05");
  game.screen = "playing";
  game.tick = 1087;
  game.player.y = 300;
  game.enemyBullets.push({ kind: "mirror-orb", x: 210, y: 600, radius: 7, vx: -1, vy: 4, age: 0, reflected: false });
  updateGame(game, {});
  assert.equal(game.crystalReflections, 1);
  assert.equal(game.enemyBullets[0].reflected, true);
  assert.ok(game.enemyBullets[0].vy < 0);
});

test("automatic input completes Stage 4 through heat waves and all controller phases", () => {
  const game = createGame();
  beginStage(game, "stage-04");
  const seen = new Set();
  for (let tick = 0; tick < 24_000 && game.screen !== "stage-result"; tick += 1) {
    updateGame(game, automaticInput(game));
    for (const enemy of game.enemies) seen.add(enemy.type);
  }
  assert.equal(game.screen, "stage-result");
  assert.equal(game.defeatedBoss, true);
  assert.deepEqual(seen, new Set(stageById("stage-04").enemyTypes));
  assert.deepEqual(game.furnacePhasesSeen, [0, 1, 2]);
  assert.ok(game.heatWaveWarnings > 0);
  assert.ok(game.bossShots > 0);
  assert.ok(game.bossShieldBlocks > 0);
  assert.ok(game.bossWeakpointHits > 0);
  assert.equal(game.terrainHits, 0);
});

test("Omni Turret fires a spread instead of three converging aimed shots", () => {
  const game = createGame("stage-04");
  game.screen = "playing";
  game.tick = 1_000;
  game.player.invulnerable = 1_000;
  game.enemies.push({ x: 700, y: 250, width: 76, height: 62, hp: 22, phase: 0, pattern: "ceiling-turret", type: "omni-turret", spawnedTick: 856 });

  updateGame(game, {});

  assert.equal(game.enemyBullets.length, 3);
  const crossings = game.enemyBullets.map((bullet) => {
    const ticks = (bullet.x - game.player.x) / -bullet.vx;
    return bullet.y + bullet.vy * ticks;
  });
  assert.ok(Math.max(...crossings) - Math.min(...crossings) > 200, "the three trajectories must leave dodgeable gaps");
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
  assert.deepEqual(seen, new Set(stageById("stage-03").enemyTypes));
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
  assert.deepEqual(seen, new Set(stageById("stage-02").enemyTypes));
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
  game.player.invulnerable = 2_000;
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

test("v3.1 regular enemies fall quickly while bosses keep arcade-scale durability", () => {
  const game = createGame();
  game.screen = "playing";
  game.player.invulnerable = 1_000_000;
  for (let tick = 0; tick < 8 * 60; tick += 1) updateGame(game, {});
  assert.ok(game.enemies.length > 0);
  assert.ok(game.enemies.every(({ hp }) => hp <= 3), "opening enemies should die to a short PULSE burst");
  game.tick = stageById("stage-01").bossStartTick - 1;
  updateGame(game, {});
  assert.ok(game.boss.maxHp >= 250, "boss durability must remain clearly above regular enemies");
});

test("player can fly to the visible right edge", () => {
  const game = createGame();
  game.screen = "playing";
  game.player.invulnerable = 1_000_000;
  for (let tick = 0; tick < 300; tick += 1) updateGame(game, { right: true });
  assert.equal(game.player.x, 1232);
});

test("stage clear carries reactor cores and new power-ups into the next stage", () => {
  const game = createGame();
  collectCore(game, "red");
  collectCore(game, "red");
  collectPowerUp(game, "option");
  collectPowerUp(game, "barrier");
  collectPowerUp(game, "overdrive");
  game.screen = "stage-result";
  updateGame(game, { confirmPressed: true });
  assert.equal(game.stageId, "stage-02");
  assert.deepEqual(game.cores, ["red", "red"]);
  assert.equal(game.options, 1);
  assert.equal(game.barrier, 1);
  assert.ok(game.overdriveTicks > 0);
});

test("second button changes option formation and options add firepower", () => {
  const game = createGame();
  game.screen = "playing";
  collectPowerUp(game, "option");
  updateGame(game, { altPressed: true, fire: true });
  for (let tick = 0; tick < 30; tick += 1) updateGame(game, { fire: true });
  assert.equal(game.optionFormation, "wide");
  assert.equal(game.formationChanges, 1);
  assert.ok(game.optionShots > 0);
});

test("barrier power-up absorbs a hit before cores or lives", () => {
  const game = createGame();
  game.screen = "playing";
  collectCore(game, "blue");
  collectPowerUp(game, "barrier");
  game.enemyBullets.push({ kind: "enemy-shot", x: game.player.x, y: game.player.y, radius: 6, vx: 0, vy: 0, age: 0 });
  updateGame(game, {});
  assert.equal(game.barrier, 0);
  assert.deepEqual(game.cores, ["blue"]);
  assert.equal(game.lives, 3);
});
