import test from "node:test";
import assert from "node:assert/strict";
import {
  LEVELS,
  createGame,
  flipPolarity,
  insertCoin,
  movePlayer,
  reduce,
  resetGame,
  startGame,
  statusText
} from "../src/model.js";
import { DEFAULT_PREFERENCES, STORAGE_KEY, loadPreferences, savePreferences } from "../src/preferences.js";
import { RANKINGS_KEY, loadRankings, saveRanking } from "../src/rankings.js";

test("coin separates attract mode from start and exposes accessible state", () => {
  const title = createGame();
  assert.equal(title.phase, "attract");
  assert.match(statusText(title), /insert coin/i);
  const ready = insertCoin(title);
  assert.equal(ready.phase, "ready");
  assert.equal(ready.credits, 1);
  const game = startGame(ready);
  assert.equal(game.phase, "playing");
  assert.equal(game.credits, 0);
  assert.match(statusText(game), /pull polarity/);
});

test("player movement is deterministic and walls block movement", () => {
  let game = startGame(createGame());
  game = movePlayer(game, -1, 0);
  assert.deepEqual(game.player, { x: 3, y: 3 });
  game = movePlayer(game, 0, 1);
  assert.deepEqual(game.player, { x: 3, y: 3 });
  assert.match(game.lastEvent, /blocked/);
});

test("first push docks the two upper seeds and leaves the boundary seed", () => {
  const game = flipPolarity(startGame(createGame()));
  assert.equal(game.polarity, "push");
  assert.equal(game.pulses, 1);
  assert.deepEqual(game.shards.map(({ x, y, docked }) => ({ x, y, docked })), [
    { x: 1, y: 2, docked: true },
    { x: 7, y: 2, docked: true },
    { x: 4, y: 5, docked: false }
  ]);
});

test("a seed cannot enter the player cell", () => {
  let game = startGame(createGame());
  game = { ...game, polarity: "push", player: { x: 3, y: 2 } };
  game = flipPolarity(game);
  const cobalt = game.shards.find((shard) => shard.id === "cobalt");
  assert.deepEqual({ x: cobalt.x, y: cobalt.y }, { x: 2, y: 2 });
});

test("known chamber solution locks all three seeds", () => {
  let game = startGame(createGame());
  for (const action of ["flip", "left", "left", "down", "down", "flip"]) game = reduce(game, action);
  assert.equal(game.phase, "won");
  assert.equal(game.pulses, 2);
  assert.equal(game.shards.filter((shard) => shard.docked).length, 3);
  assert.equal(game.score, 9500);
  assert.equal(game.sigilLit, false);
  assert.match(statusText(game), /Chamber 1 complete/);
  assert.match(statusText(game), /continue/);
  game = reduce(game, "reset");
  assert.equal(game.score, 0);
});

test("temper sigil creates a riskier high-score route without blocking the safe clear", () => {
  let game = startGame(createGame());
  for (const action of ["right", "right", "flip"]) game = reduce(game, action);
  assert.equal(game.sigilLit, true);
  assert.equal(game.score, 5000);
  assert.deepEqual(game.shards.find((shard) => shard.id === "ember"), {
    id: "ember", x: 6, y: 1, docked: false
  });
  assert.match(game.lastEvent, /sigil.*3000/i);
  for (const action of ["left", "flip", "flip"]) game = reduce(game, action);
  assert.equal(game.phase, "won");
  assert.equal(game.pulses, 3);
  assert.equal(game.score, 12250);
  assert.equal(game.sigilLit, true);
  assert.match(statusText(game), /Chamber 1 complete/);
});

test("winning the first mold advances to the iron brake", () => {
  let game = startGame(createGame());
  for (const action of ["flip", "left", "left", "down", "down", "flip", "enter"]) game = reduce(game, action);
  assert.equal(game.levelIndex, 1);
  assert.equal(game.phase, "playing");
  assert.match(game.lastEvent, /fixed iron/i);
  assert.deepEqual(LEVELS[1].blocks, [{ x: 7, y: 2 }]);
});

test("iron brake stops the unwanted seed while another seed docks", () => {
  let game = startGame(createGame(1));
  game = reduce(game, "right");
  game = reduce(game, "flip");
  assert.equal(game.shards.find((shard) => shard.id === "cobalt").docked, true);
  assert.deepEqual(game.shards.find((shard) => shard.id === "ember"), { id: "ember", x: 6, y: 2, docked: false });
  assert.equal(game.shards.filter((shard) => shard.docked).length, 1);

  game = startGame(createGame(1));
  for (const action of ["right", "right", "right", "up"]) game = reduce(game, action);
  assert.deepEqual(game.player, { x: 7, y: 3 });
  assert.match(game.lastEvent, /blocked/);
});

test("known iron brake solution completes the second chamber", () => {
  let game = startGame(createGame(1));
  for (const action of ["right", "flip", "right", "flip", "flip"]) game = reduce(game, action);
  assert.equal(game.phase, "won");
  assert.equal(game.pulses, 3);
  assert.match(statusText(game), /Chamber 2 complete/);
  game = reduce(game, "reset");
  assert.equal(game.levelIndex, 1);
  assert.equal(game.phase, "playing");
});

test("polar veil blocks only the marked axis and does not block the smith", () => {
  let game = startGame(createGame(2));
  game = { ...game, polarity: "push", player: { x: 6, y: 4 } };
  game = flipPolarity(game);
  assert.deepEqual(game.shards.find((shard) => shard.id === "pearl"), { id: "pearl", x: 4, y: 5, docked: false });

  game = startGame(createGame(2));
  game = { ...game, polarity: "push", player: { x: 5, y: 6 }, shards: game.shards.map((shard) => shard.id === "pearl" ? { ...shard, x: 5, y: 4 } : shard) };
  game = flipPolarity(game);
  assert.deepEqual(game.shards.find((shard) => shard.id === "pearl"), { id: "pearl", x: 5, y: 5, docked: false });

  game = startGame(createGame(2));
  game = reduce(game, "right");
  game = reduce(game, "down");
  assert.deepEqual(game.player, { x: 5, y: 4 });
});

test("known polar veil solution completes the third chamber", () => {
  let game = startGame(createGame(2));
  for (const action of ["right", "flip", "down", "right", "flip", "flip"]) game = reduce(game, action);
  assert.equal(game.phase, "won");
  assert.equal(game.pulses, 3);
  assert.equal(game.shards.filter((shard) => shard.docked).length, 3);
  assert.match(statusText(game), /Chamber 3 complete/);
  assert.match(statusText(game), /continue/);
});

test("marked seed answers only its matching polarity", () => {
  let game = startGame(createGame(3));
  game = flipPolarity(game);
  assert.deepEqual(game.shards.find((shard) => shard.id === "cobalt"), {
    id: "cobalt", x: 2, y: 2, respondsTo: "pull", docked: false
  });
  assert.equal(game.shards.find((shard) => shard.id === "ember").docked, true);
  assert.equal(game.shards.find((shard) => shard.id === "pearl").docked, true);

  game = reduce(game, "down");
  game = reduce(game, "flip");
  assert.deepEqual(game.shards.find((shard) => shard.id === "cobalt"), {
    id: "cobalt", x: 3, y: 2, respondsTo: "pull", docked: false
  });
  game = reduce(game, "flip");
  assert.match(game.lastEvent, /ignores PUSH/);
});

test("known cold lodestone solution completes the fourth chamber", () => {
  let game = startGame(createGame(3));
  for (const action of ["flip", "down", "flip", "flip", "left", "flip"]) game = reduce(game, action);
  assert.equal(game.phase, "won");
  assert.equal(game.pulses, 4);
  assert.equal(game.shards.filter((shard) => shard.docked).length, 3);
  assert.match(statusText(game), /Chamber 4 complete/);
  assert.match(statusText(game), /continue/);
});

test("tempered relay combines a pull-bound seed with iron and an axial pole", () => {
  let game = startGame(createGame(4));
  for (const action of ["flip", "left", "left", "left", "flip"]) game = reduce(game, action);
  assert.equal(game.shards.find((shard) => shard.id === "cobalt").docked, true);
  assert.equal(game.shards.find((shard) => shard.id === "pearl").docked, true);
  assert.deepEqual(game.shards.find((shard) => shard.id === "ember"), {
    id: "ember", x: 6, y: 2, docked: false
  });

  for (const action of ["right", "right", "right", "right", "down", "flip"]) game = reduce(game, action);
  assert.deepEqual(game.shards.find((shard) => shard.id === "ember"), {
    id: "ember", x: 6, y: 2, docked: false
  });
  assert.deepEqual(LEVELS[4].blocks, [{ x: 6, y: 3 }]);
  assert.deepEqual(LEVELS[4].poles, [{ x: 6, y: 1, blocksAxis: "vertical" }]);
});

test("known tempered relay solution completes the fifth chamber", () => {
  let game = startGame(createGame(4));
  for (const action of [
    "flip", "left", "left", "left", "flip",
    "right", "right", "right", "right", "down", "flip", "left",
    "flip", "flip", "flip"
  ]) game = reduce(game, action);
  assert.equal(game.phase, "won");
  assert.equal(game.pulses, 6);
  assert.equal(game.shards.filter((shard) => shard.docked).length, 3);
  assert.match(statusText(game), /Chamber 5 complete/);
  assert.match(statusText(game), /continue/);
});

test("crown crucible alternates pull- and push-bound seeds around iron and pole", () => {
  let game = startGame(createGame(5));
  for (const action of ["right", "down", "down", "flip"]) game = reduce(game, action);
  assert.equal(game.shards.find((shard) => shard.id === "pearl").docked, true);
  assert.deepEqual(game.shards.find((shard) => shard.id === "ember"), {
    id: "ember", x: 6, y: 2, respondsTo: "push", docked: false
  });
  assert.match(statusText(game), /cobalt answers only pull/);
  assert.match(statusText(game), /ember answers only push/);
  assert.deepEqual(LEVELS[5].blocks, [{ x: 6, y: 3 }]);
  assert.deepEqual(LEVELS[5].poles, [{ x: 6, y: 1, blocksAxis: "vertical" }]);
});

test("known crown crucible solution completes the sixth chamber and ending", () => {
  let game = startGame(createGame(5));
  for (const action of [
    "right", "down", "down", "flip", "left", "flip",
    "right", "right", "right", "up", "up",
    "flip", "flip", "flip", "flip", "flip", "flip"
  ]) game = reduce(game, action);
  assert.equal(game.phase, "won");
  assert.equal(game.pulses, 7);
  assert.equal(game.shards.filter((shard) => shard.docked).length, 3);
  assert.match(statusText(game), /Chamber 6 complete/);
  assert.match(statusText(game), /record your initials/);
  game = reduce(game, "enter");
  assert.equal(game.phase, "initials");
  game = reduce(game, "up");
  game = reduce(game, "right");
  game = reduce(game, "down");
  assert.deepEqual(game.initials, ["B", "Z", "A"]);
  assert.equal(game.initialCursor, 1);
  game = reduce(game, "flip");
  assert.equal(game.phase, "ranking");
  game = reduce(game, "enter");
  assert.equal(game.phase, "attract");
});

test("pause freezes actions and reset restores the chamber", () => {
  let game = reduce(startGame(createGame()), "pause");
  assert.equal(game.phase, "paused");
  assert.equal(reduce(game, "flip"), game);
  game = resetGame();
  assert.equal(game.phase, "playing");
  assert.equal(game.pulses, 0);
  assert.equal(game.shards.some((shard) => shard.docked), false);
});

test("forge heat creates game over, score exit, and one-credit continue", () => {
  let game = startGame(createGame());
  game = { ...game, pulses: LEVELS[0].pulseLimit - 1 };
  game = reduce(game, "flip");
  assert.equal(game.phase, "gameover");
  assert.match(statusText(game), /Game over.*Press C to continue/i);
  assert.equal(reduce(game, "reset"), game, "R cannot bypass the continue credit");

  const scoreExit = reduce(game, "enter");
  assert.equal(scoreExit.phase, "initials");
  assert.equal(scoreExit.outcome, "over");

  game = reduce(game, "coin");
  assert.equal(game.phase, "continue_ready");
  assert.equal(game.credits, 1);
  game = reduce(game, "enter");
  assert.equal(game.phase, "playing");
  assert.equal(game.credits, 0);
  assert.equal(game.continues, 1);
  assert.equal(game.pulses, 0);
  assert.equal(game.score, game.chamberStartScore);
});

test("preferences round-trip and clamp values", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const saved = savePreferences(storage, { unlockedLevel: 99, volume: 0.34, reducedMotion: true }, LEVELS.length);
  assert.deepEqual(saved, { unlockedLevel: 5, volume: 0.3, reducedMotion: true });
  assert.deepEqual(loadPreferences(storage, LEVELS.length), saved);
});

test("corrupt or invalid saves safely restore defaults", () => {
  const corrupt = { getItem: () => "{broken" };
  assert.deepEqual(loadPreferences(corrupt, LEVELS.length), DEFAULT_PREFERENCES);

  const invalid = { getItem: () => JSON.stringify({ unlockedLevel: "third", volume: "loud", reducedMotion: "yes" }) };
  assert.deepEqual(loadPreferences(invalid, LEVELS.length), DEFAULT_PREFERENCES);

  const unavailable = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("full"); }
  };
  assert.deepEqual(loadPreferences(unavailable, LEVELS.length), DEFAULT_PREFERENCES);
  assert.deepEqual(savePreferences(unavailable, DEFAULT_PREFERENCES, LEVELS.length), DEFAULT_PREFERENCES);
  assert.equal(STORAGE_KEY, "lodestar-forge:v12");
});

test("local rankings sort, keep five, and recover from corrupt storage", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  let rankings = [];
  for (const [initials, score] of [["LOW", 100], ["ACE", 900], ["MID", 500], ["TOP", 1200], ["FIV", 400], ["CUT", 200]]) {
    rankings = saveRanking(storage, rankings, initials, score);
  }
  assert.deepEqual(rankings.map((entry) => entry.initials), ["TOP", "ACE", "MID", "FIV", "CUT"]);
  assert.deepEqual(loadRankings(storage), rankings);
  values.set(RANKINGS_KEY, "{broken");
  assert.deepEqual(loadRankings(storage), []);
});
