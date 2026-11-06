import test from "node:test";
import assert from "node:assert/strict";
import {
  LEVELS,
  createGame,
  flipPolarity,
  movePlayer,
  reduce,
  resetGame,
  startGame,
  statusText
} from "../src/model.js";
import { DEFAULT_PREFERENCES, STORAGE_KEY, loadPreferences, savePreferences } from "../src/preferences.js";

test("starts only from title and exposes accessible state", () => {
  const title = createGame();
  assert.equal(title.phase, "title");
  const game = startGame(title);
  assert.equal(game.phase, "playing");
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
  assert.match(statusText(game), /Chamber 1 complete/);
  assert.match(statusText(game), /continue/);
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
  assert.match(statusText(game), /replay/);
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

test("preferences round-trip and clamp values", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const saved = savePreferences(storage, { unlockedLevel: 99, volume: 0.34, reducedMotion: true }, LEVELS.length);
  assert.deepEqual(saved, { unlockedLevel: 4, volume: 0.3, reducedMotion: true });
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
