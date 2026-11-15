import test from "node:test";
import assert from "node:assert/strict";
import { activateSurge, createGame, routeProfile, startGame, STAGE_SECONDS, updateGame } from "../src/model.js";

test("steering has momentum and stays inside the flood channel", () => {
  const state = startGame(createGame());
  for (let i = 0; i < 240; i++) updateGame(state, { right: true }, 1 / 60);
  assert.ok(state.boatX <= 0.72 && state.boatX > 0.5);
});

test("surge spends charge and protects long enough to break driftwood", () => {
  const state = startGame(createGame());
  state.entities.push({ id: 99, type: "driftwood", x: 0, z: 0.101, hit: false });
  assert.equal(activateSurge(state), true);
  updateGame(state, {}, 1 / 60);
  assert.equal(state.integrity, 3);
  assert.ok(state.score >= 350);
  assert.ok(state.surge < 0.8);
  assert.ok(state.effects.some(effect => effect.type === "break"), "broken driftwood leaves a visible impact effect");
});

test("surge widens the rescue window and builds a chain", () => {
  const state = startGame(createGame());
  state.boatX = 0.25;
  state.entities.push({ id: 99, type: "survivor", x: 0, z: 0.101, hit: false });
  activateSurge(state);
  updateGame(state, {}, 1 / 60);
  assert.equal(state.rescued, 1);
  assert.equal(state.combo, 1);
  assert.ok(state.surge > 0.7);
  assert.equal(state.effects[1].type, "rescue");
  assert.equal(state.effects[1].targetX, 0.25);
  assert.equal(state.effects[1].max, 0.9);
});

test("unprotected collision damages the hull", () => {
  const state = startGame(createGame());
  state.entities.push({ id: 99, type: "concrete", x: 0, z: 0.101, hit: false });
  updateGame(state, {}, 1 / 60);
  assert.equal(state.integrity, 2);
  assert.equal(state.message, "HULL HIT");
});

test("the vertical slice reaches its authored ending", () => {
  const state = startGame(createGame());
  state.integrity = 99;
  while (state.time < STAGE_SECONDS && state.mode === "playing") updateGame(state, {}, 0.05);
  assert.equal(state.mode, "cleared");
  assert.equal(state.section, 3);
  assert.equal(state.spawned, 34);
});

test("the flooded arcade bends, narrows, and pushes across the route", () => {
  const entrance = routeProfile(25);
  const eastBend = routeProfile(31.25);
  const westBend = routeProfile(43.75);
  assert.equal(entrance.center, 0);
  assert.ok(eastBend.center > 0.25 && westBend.center < -0.25);
  assert.ok(eastBend.halfWidth < routeProfile(10).halfWidth);
  assert.notEqual(eastBend.current, 0);
});

test("rescuing one flooded arcade branch closes its alternative", () => {
  const state = startGame(createGame());
  state.time = 32.5;
  state.boatX = -0.28;
  state.surgeTime = 0.5;
  state.entities.push(
    { id: 90, type: "routeSurvivor", x: -0.28, route: "MARKET", choice: "market", z: 0.101, hit: false },
    { id: 91, type: "routeSurvivor", x: 0.28, route: "ARCADE", choice: "market", z: 0.101, hit: false }
  );
  updateGame(state, {}, 1 / 60);
  assert.equal(state.routeChoices.length, 1);
  assert.equal(state.routeChoices[0].route, "MARKET");
  assert.equal(state.entities.find(entity => entity.id === 91)?.hit, true);
  assert.match(state.message, /MARKET ROUTE/);
});
