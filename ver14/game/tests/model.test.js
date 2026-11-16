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
  state.escortIntegrity = 99;
  while (state.time < STAGE_SECONDS && state.mode === "playing") updateGame(state, {}, 0.05);
  assert.equal(state.mode, "cleared");
  assert.equal(state.section, 4);
  assert.equal(state.spawned, 41);
});

test("the underflow requires diving below ceilings and surfacing above intakes", () => {
  const deep = startGame(createGame());
  deep.time = 55;
  deep.section = 2;
  deep.depth = 0.72;
  deep.entities.push({ id: 90, type: "lowCeiling", x: 0, z: 0.101, hit: false });
  updateGame(deep, { dive: true }, 1 / 60);
  assert.equal(deep.integrity, 3);
  assert.equal(deep.message, "DIVE CLEAR");

  const surface = startGame(createGame());
  surface.time = 58;
  surface.section = 2;
  surface.depth = 0.15;
  surface.entities.push({ id: 91, type: "intake", x: 0, z: 0.101, hit: false });
  updateGame(surface, { surface: true }, 1 / 60);
  assert.equal(surface.integrity, 3);
  assert.equal(surface.message, "SURFACE CLEAR");
});

test("underflow rescue access follows the boat layer", () => {
  const state = startGame(createGame());
  state.time = 55;
  state.section = 2;
  state.depth = 0.75;
  state.entities.push({ id: 92, type: "tunnelSurvivor", layer: "deep", route: "DIVE TEAM", x: 0, z: 0.101, hit: false });
  updateGame(state, { dive: true }, 1 / 60);
  assert.equal(state.rescued, 1);
  assert.match(state.message, /DIVE TEAM/);
  assert.deepEqual(state.underflowRescues.map(rescue => rescue.layer), ["deep"]);

  state.depth = 0.8;
  state.entities.push({ id: 93, type: "tunnelSurvivor", layer: "surface", route: "AIR POCKET", x: 0, z: 0.101, hit: false });
  updateGame(state, { dive: true }, 1 / 60);
  assert.equal(state.rescued, 1);
  assert.equal(state.message, "SURFACE TO REACH THEM");
});

test("a gradual return to the surface is recorded after a deep dive", () => {
  const state = startGame(createGame());
  state.time = 55;
  state.section = 2;
  while (state.depth < 0.7) updateGame(state, { dive: true }, 1 / 60);
  while (state.depth > 0.3) updateGame(state, { surface: true }, 1 / 60);
  assert.ok(state.maxDepth >= 0.7);
  assert.equal(state.surfacedAfterDive, true);
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

test("container convoy clears only at the warned tide while holding formation", () => {
  const safe = startGame(createGame());
  safe.time = 79;
  safe.section = 3;
  safe.escortActive = true;
  safe.tideLevel = 0.8;
  safe.tideTarget = "high";
  safe.escortX = safe.boatX;
  safe.entities.push({ id: 94, type: "containerFall", tide: "high", x: 0.2, z: 0.101, hit: false });
  updateGame(safe, { surface: true }, 1 / 60);
  assert.equal(safe.escortIntegrity, 3);
  assert.equal(safe.containerClears.length, 1);
  assert.match(safe.message, /CONVOY CLEAR/);

  const wrongTide = startGame(createGame());
  wrongTide.time = 79;
  wrongTide.section = 3;
  wrongTide.escortActive = true;
  wrongTide.tideLevel = 0.2;
  wrongTide.escortX = wrongTide.boatX;
  wrongTide.entities.push({ id: 95, type: "containerFall", tide: "high", x: 0, z: 0.101, hit: false });
  updateGame(wrongTide, { dive: true }, 1 / 60);
  assert.equal(wrongTide.escortIntegrity, 2);
  assert.equal(wrongTide.containerClears.length, 0);
  assert.equal(wrongTide.message, "HIGH WATER REQUIRED");
});

test("the rescue ferry follows the hydrofoil with a readable formation gap", () => {
  const state = startGame(createGame());
  state.time = 76;
  state.section = 3;
  state.escortActive = true;
  state.boatX = 0.6;
  state.escortX = 0;
  updateGame(state, {}, 0.05);
  assert.ok(state.escortX > 0 && state.escortX < state.boatX);
});

test("stormwall gates require the warned wall ride and lever direction", () => {
  const safe = startGame(createGame());
  safe.time = 100;
  safe.section = 4;
  safe.routeCenter = 0;
  safe.routeHalfWidth = 0.6;
  safe.boatX = -0.6;
  safe.surge = 1;
  activateSurge(safe);
  safe.entities.push({ id: 96, type: "wallGate", side: "left", control: "surface", x: -0.54, z: 0.101, hit: false });
  updateGame(safe, { left: true, surface: true }, 1 / 60);
  assert.equal(safe.integrity, 3);
  assert.equal(safe.wallGateClears.length, 1);
  assert.match(safe.message, /FLOODGATE OPEN/);

  const wrongLever = startGame(createGame());
  wrongLever.time = 100;
  wrongLever.section = 4;
  wrongLever.routeCenter = 0;
  wrongLever.routeHalfWidth = 0.6;
  wrongLever.boatX = -0.6;
  wrongLever.surge = 1;
  activateSurge(wrongLever);
  wrongLever.entities.push({ id: 97, type: "wallGate", side: "left", control: "surface", x: -0.54, z: 0.101, hit: false });
  updateGame(wrongLever, { left: true, dive: true }, 1 / 60);
  assert.equal(wrongLever.integrity, 2);
  assert.equal(wrongLever.wallGateClears.length, 0);
  assert.equal(wrongLever.message, "UP LEVER REQUIRED");
});

test("stormwall route narrows and bends independently of the container port", () => {
  const entry = routeProfile(94);
  const crest = routeProfile(108);
  assert.ok(entry.halfWidth < routeProfile(80).halfWidth);
  assert.notEqual(crest.center, 0);
  assert.notEqual(crest.current, 0);
});
