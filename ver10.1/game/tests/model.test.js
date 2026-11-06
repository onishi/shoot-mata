import test from "node:test";
import assert from "node:assert/strict";
import { advance, createGame, getGardenNodes, getNextNode, resetGame, selectSwitch, setHeldSwitch, startGame, togglePause, toggleSelectedSwitch } from "../src/model.js";

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
  assert.deepEqual(state.pendingSwitches, [null, null, null]);
  assert.deepEqual(state.blooms, { moon: false, rain: false, bell: false });
  assert.equal(state.lives, 3);
});

test("a saved garden starts from its beginning while invalid progress falls back safely", () => {
  const resumed = createGame(2);
  assert.equal(resumed.phase, "title");
  assert.equal(resumed.garden, 2);
  startGame(resumed);
  assert.equal(resumed.garden, 2);
  assert.equal(resumed.node, "root");
  assert.equal(resumed.lives, 3);
  assert.deepEqual(resumed.blooms, { moon: false, rain: false, bell: false });
  assert.equal(createGame(99).garden, 0);
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
  assert.equal(state.phase, "gardenWon");
});

test("garden two introduces a crown route that commits after two beats", () => {
  const state = createGame(); startGame(state);
  state.phase = "gardenWon";
  startGame(state);
  assert.equal(state.garden, 1);
  state.selectedSwitch = 2;
  toggleSelectedSwitch(state);
  assert.equal(state.switches[2], 0);
  assert.deepEqual(state.pendingSwitches[2], { value: 1, remaining: 2 });
  advance(state);
  assert.equal(state.switches[2], 0);
  assert.equal(state.pendingSwitches[2].remaining, 1);
  advance(state);
  assert.equal(state.switches[2], 1);
  assert.equal(state.pendingSwitches[2], null);
});

test("garden two uses a distinct spiral layout without changing its route rules", () => {
  const first = getGardenNodes(0);
  const second = getGardenNodes(1);
  assert.notStrictEqual(second, first);
  assert.notDeepEqual(
    Object.fromEntries(Object.entries(second).map(([id, node]) => [id, [node.x, node.y]])),
    Object.fromEntries(Object.entries(first).map(([id, node]) => [id, [node.x, node.y]])),
  );
  assert.deepEqual(second.crown.next, ["receiver", "returnA"]);
  assert.equal(second.crown.switchIndex, 2);
  assert.equal(second.moon.bloom, "moon");
  assert.equal(second.rain.bloom, "rain");
  assert.equal(second.bell.bloom, "bell");
});

test("a sleeping switch request can be cancelled before it commits", () => {
  const state = createGame(); startGame(state);
  state.phase = "gardenWon"; startGame(state);
  state.selectedSwitch = 2;
  toggleSelectedSwitch(state);
  toggleSelectedSwitch(state);
  assert.equal(state.switches[2], 0);
  assert.equal(state.pendingSwitches[2], null);
  resetGame(state);
  assert.equal(state.garden, 1);
  state.phase = "lost";
  startGame(state);
  assert.equal(state.garden, 1);
});

test("planned sleeping-crown route completes the second garden", () => {
  const state = createGame(); startGame(state);
  state.phase = "gardenWon"; startGame(state);
  state.switches[1] = 0;
  state.selectedSwitch = 2;
  toggleSelectedSwitch(state);
  advanceTo(state, "returnA");
  assert.equal(state.switches[2], 1);
  state.switches[0] = 1;
  toggleSelectedSwitch(state);
  advanceTo(state, "rain");
  assert.equal(state.switches[2], 0);
  advanceTo(state, "receiver");
  assert.deepEqual(state.blooms, { moon: true, rain: true, bell: true });
  assert.equal(state.phase, "gardenWon");
  startGame(state);
  assert.equal(state.garden, 2);
  assert.equal(state.node, "root");
});

test("garden three turns the route around and requires an early crown reservation", () => {
  const state = createGame(); startGame(state);
  state.garden = 2;
  resetGame(state);
  assert.equal(getNextNode(state), "bud");
  assert.equal(getGardenNodes(2).returnA.next[0], "fork");

  state.selectedSwitch = 2;
  toggleSelectedSwitch(state);
  advance(state);
  assert.equal(state.pendingSwitches[2].remaining, 1);
  advance(state);
  assert.equal(state.node, "crown");
  assert.equal(state.switches[2], 1);
  advance(state);
  assert.equal(state.node, "returnA");
});

test("planned turning-root route completes the third garden in two flower circuits", () => {
  const state = createGame(); startGame(state);
  state.garden = 2;
  resetGame(state);
  state.switches[1] = 0;
  state.selectedSwitch = 2;
  toggleSelectedSwitch(state);
  advanceTo(state, "returnA");
  advanceTo(state, "crown");
  assert.deepEqual(state.blooms, { moon: true, rain: false, bell: true });
  state.switches[0] = 1;
  advanceTo(state, "fork");
  toggleSelectedSwitch(state);
  advanceTo(state, "receiver");
  assert.deepEqual(state.blooms, { moon: true, rain: true, bell: true });
  assert.equal(state.phase, "gardenWon");
});

test("garden four couples fork and graft while leaving crown independent", () => {
  const state = createGame(3); startGame(state);
  assert.deepEqual(state.switches, [0, 0, 0]);
  assert.equal(getGardenNodes(3).root.next[0], "fork");

  toggleSelectedSwitch(state);
  assert.deepEqual(state.switches, [1, 1, 0]);
  assert.equal(state.lastEvent, "sync:fork:1:graft:1");
  state.selectedSwitch = 1;
  toggleSelectedSwitch(state);
  assert.deepEqual(state.switches, [0, 0, 0]);
  state.selectedSwitch = 2;
  toggleSelectedSwitch(state);
  assert.deepEqual(state.switches, [0, 0, 1]);
});

test("planned twin-current route switches the linked pair between fork and graft", () => {
  const state = createGame(3); startGame(state);
  state.switches[2] = 1;
  advanceTo(state, "returnA");
  assert.deepEqual(state.blooms, { moon: true, rain: false, bell: true });

  state.selectedSwitch = 0;
  toggleSelectedSwitch(state);
  advanceTo(state, "rain");
  assert.deepEqual(state.switches, [1, 1, 1]);
  toggleSelectedSwitch(state);
  state.selectedSwitch = 2;
  toggleSelectedSwitch(state);
  advanceTo(state, "receiver");

  assert.deepEqual(state.blooms, { moon: true, rain: true, bell: true });
  assert.equal(state.phase, "gardenWon");
});

test("garden five changes beat length only at its visible tempo gates", () => {
  const state = createGame(4); startGame(state);
  assert.equal(state.flowMs, 1100);
  state.switches[1] = 0;
  state.switches[2] = 1;
  advanceTo(state, "moon");
  assert.equal(state.flowMs, 1100);
  const quickened = advance(state);
  assert.equal(quickened.type, "tempo");
  assert.equal(quickened.tempo, "quick");
  assert.equal(state.flowMs, 520);
  advanceTo(state, "calm");
  assert.equal(state.flowMs, 1100);
  assert.equal(state.lastEvent, "tempo:slow");
});

test("planned quickening-vine route prepares each lap during the calm current", () => {
  const state = createGame(4); startGame(state);
  state.switches[1] = 0;
  state.switches[2] = 1;
  advanceTo(state, "calm");
  assert.deepEqual(state.blooms, { moon: true, rain: false, bell: true });

  state.switches[0] = 1;
  state.switches[2] = 0;
  advanceTo(state, "receiver");
  assert.deepEqual(state.blooms, { moon: true, rain: true, bell: true });
  assert.equal(state.phase, "gardenWon");
});

test("garden six bends its crown only while space is held", () => {
  const state = createGame(5); startGame(state);
  assert.deepEqual(state.switches, [0, 0, 0]);
  assert.equal(getNextNode(state, "crown"), "receiver");
  assert.equal(setHeldSwitch(state, true), false);
  state.selectedSwitch = 2;
  assert.equal(setHeldSwitch(state, true), true);
  assert.equal(state.heldActive, true);
  assert.equal(getNextNode(state, "crown"), "returnA");
  state.selectedSwitch = 0;
  assert.equal(setHeldSwitch(state, false), true);
  assert.equal(state.heldActive, false);
  assert.equal(getNextNode(state, "crown"), "receiver");
});

test("planned tending-crown route holds through the first crown and releases for the finale", () => {
  const state = createGame(5); startGame(state);
  state.selectedSwitch = 2;
  setHeldSwitch(state, true);
  advanceTo(state, "returnA");
  assert.deepEqual(state.blooms, { moon: true, rain: false, bell: true });

  setHeldSwitch(state, false);
  state.switches[0] = 1;
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
  assert.equal(state.garden, 0);
});

test("pause freezes rule advancement", () => {
  const state = createGame(); startGame(state); togglePause(state);
  const result = advance(state);
  assert.equal(result.type, "idle");
  assert.equal(state.node, "root");
  togglePause(state);
  assert.equal(state.phase, "playing");
});
