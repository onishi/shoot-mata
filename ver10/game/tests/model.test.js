import test from "node:test";
import assert from "node:assert/strict";
import { advance, createGame, getNextNode, resetGame, selectSwitch, startGame, togglePause, toggleSelectedSwitch } from "../src/model.js";

function advanceTo(state, node) {
  for (let guard = 0; guard < 20 && state.node !== node; guard += 1) advance(state);
  assert.equal(state.node, node);
}

function triggerStrike(state) {
  const livesBefore = state.lives;
  for (let guard = 0; guard < 20 && state.lives === livesBefore; guard += 1) advance(state);
  assert.equal(state.lives, livesBefore - 1);
}

test("new game starts on the title with safe deterministic defaults", () => {
  const state = createGame();
  assert.equal(state.phase, "title");
  assert.deepEqual(state.switches, [0, 1, 0]);
  assert.deepEqual(state.blooms, { moon: false, rain: false, bell: false });
  assert.equal(state.lives, 3);
});

test("selection wraps and space only toggles while playing", () => {
  const state = createGame();
  assert.equal(toggleSelectedSwitch(state), false);
  startGame(state);
  selectSwitch(state, -1);
  assert.equal(state.selectedSwitch, 2);
  toggleSelectedSwitch(state);
  assert.equal(state.switches[2], 1);
  assert.equal(getNextNode(state, "crown"), "returnA");
});

test("default first branch opens the moon flower", () => {
  const state = createGame(); startGame(state);
  advance(state); advance(state);
  assert.equal(state.node, "moon");
  assert.equal(state.blooms.moon, true);
});

test("blight costs a life and resets route growth", () => {
  const state = createGame(); startGame(state);
  triggerStrike(state);
  assert.equal(state.lives, 2);
  assert.equal(state.node, "root");
  assert.deepEqual(state.blooms, { moon: false, rain: false, bell: false });
});

test("receiver before all flowers costs a life", () => {
  const state = createGame(); startGame(state);
  state.switches[1] = 0;
  advanceTo(state, "bell");
  advance(state); advance(state);
  assert.equal(state.node, "root");
  assert.equal(state.lives, 2);
  assert.equal(state.lastEvent, "strike:unripe");
});

test("return route loops to the first switch without clearing flowers", () => {
  const state = createGame(); startGame(state);
  state.switches[1] = 0;
  state.switches[2] = 1;
  advanceTo(state, "returnA");
  advance(state); advance(state); advance(state);
  assert.equal(state.node, "fork");
  assert.equal(state.blooms.moon, true);
  assert.equal(state.blooms.bell, true);
});

test("planned two-lap route opens all flowers and wins", () => {
  const state = createGame(); startGame(state);
  state.switches[1] = 0;
  state.switches[2] = 1;
  advanceTo(state, "returnA");
  state.switches[0] = 1;
  advanceTo(state, "rain");
  state.switches[2] = 0;
  advanceTo(state, "receiver");
  assert.deepEqual(state.blooms, { moon: true, rain: true, bell: true });
  assert.equal(state.phase, "won");
});

test("three strikes lead to loss and reset starts a fresh run", () => {
  const state = createGame(); startGame(state);
  for (let strike = 0; strike < 3; strike += 1) triggerStrike(state);
  assert.equal(state.phase, "lost");
  resetGame(state);
  assert.equal(state.phase, "playing");
  assert.equal(state.lives, 3);
});

test("pause freezes rule advancement", () => {
  const state = createGame(); startGame(state); togglePause(state);
  const result = advance(state);
  assert.equal(result.type, "idle");
  assert.equal(state.node, "root");
  togglePause(state);
  assert.equal(state.phase, "playing");
});
