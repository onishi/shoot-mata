import test from "node:test";
import assert from "node:assert/strict";
import { activateSurge, BOSS_START, CONVOY_END, createGame, HARBOR_END, missionTime, ROUTE_EVENTS, routeProfile, startGame, STREET_END, STAGE_SECONDS, UNDERFLOW_END, updateGame } from "../src/model.js";

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

test("early current gates patch one hull point without erasing collision risk", () => {
  const state = startGame(createGame());
  state.spawned = ROUTE_EVENTS.length;
  state.time = 40;
  state.integrity = 1;
  state.entities.push({ id: 100, type: "gate", x: 0, z: 0.101, hit: false });
  updateGame(state, {}, 1 / 60);
  assert.equal(state.integrity, 2);
  assert.equal(state.harborRepairs, 1);
  assert.equal(state.message, "CURRENT GATE — HULL PATCH");
  assert.ok(state.effects.some(effect => effect.type === "repair"));

  state.time = 91;
  state.entities.push({ id: 101, type: "gate", x: 0, z: 0.101, hit: false });
  updateGame(state, {}, 1 / 60);
  assert.equal(state.integrity, 2);
  assert.equal(state.harborRepairs, 1);
});

test("the first ninety seconds expose an imminent hazard direction cue", () => {
  const state = startGame(createGame());
  state.spawned = ROUTE_EVENTS.length;
  state.entities.push({ id: 102, type: "concrete", x: 0.35, z: 0.5, hit: false });
  updateGame(state, {}, 1 / 60);
  assert.equal(state.trainingCue.type, "concrete");
  assert.equal(state.trainingCue.direction, "left");
  state.time = 90;
  updateGame(state, {}, 1 / 60);
  assert.equal(state.trainingCue, null);
});

test("a flood cut starts a timed current sling that accelerates the moving route", () => {
  const state = startGame(createGame());
  state.time = HARBOR_END + 7.4;
  state.section = 1;
  state.spawned = ROUTE_EVENTS.length;
  state.boatX = 0.28;
  state.entities.push({ id: 390, type: "routeSurvivor", choice: "market", route: "ARCADE", shortcutSeconds: 12, x: 0.28, z: 0.101, hit: false });
  updateGame(state, {}, 1 / 60);
  assert.equal(state.shortcutSeconds, 12);
  assert.equal(state.cutRushRoute, "ARCADE");
  assert.ok(state.cutRushTime > 4.4);

  state.entities.push({ id: 391, type: "driftwood", x: -0.4, z: 1, hit: false });
  const before = state.entities.at(-1).z;
  updateGame(state, {}, 1 / 60);
  const rushedTravel = before - state.entities.at(-1).z;
  assert.ok(rushedTravel > (0.28 + 0.018) / 60 * 1.5);
  for (let i = 0; i < 300; i++) updateGame(state, {}, 1 / 60);
  assert.equal(state.cutRushTime, 0);
});

test("successive near misses build a capped wake-skim chain without hull damage", () => {
  const state = startGame(createGame());
  state.spawned = ROUTE_EVENTS.length;
  for (let index = 0; index < 6; index++) {
    state.boatX = 0.29;
    state.entities.push({ id: 400 + index, type: "concrete", x: 0, z: 0.101, hit: false });
    updateGame(state, {}, 1 / 60);
  }
  assert.equal(state.integrity, 3);
  assert.equal(state.nearMisses, 6);
  assert.equal(state.nearMissChain, 6);
  assert.equal(state.bestNearMissChain, 6);
  assert.equal(state.score, 500 * (1 + 2 + 3 + 4 + 5 + 5));
  assert.match(state.message, /WAKE SKIM ×5/);
  assert.ok(state.effects.some(effect => effect.type === "nearMiss"));
});

test("a collision breaks the wake-skim chain", () => {
  const state = startGame(createGame());
  state.spawned = ROUTE_EVENTS.length;
  state.nearMissChain = 4;
  state.boatX = 0;
  state.entities.push({ id: 410, type: "concrete", x: 0, z: 0.101, hit: false });
  updateGame(state, {}, 1 / 60);
  assert.equal(state.integrity, 2);
  assert.equal(state.nearMissChain, 0);
});

test("the vertical slice reaches its authored ending", () => {
  const state = startGame(createGame());
  state.integrity = 99;
  state.escortIntegrity = 99;
  state.escortSecured = true;
  state.bossDefeated = true;
  while (state.time < STAGE_SECONDS && state.mode === "playing") updateGame(state, {}, 0.05);
  assert.equal(state.mode, "cleared");
  assert.equal(state.section, 5);
  assert.equal(state.spawned, ROUTE_EVENTS.length);
});

test("the leviathan fight changes from anchor cuts to hull rides and internal drains", () => {
  const anchor = startGame(createGame());
  anchor.time = BOSS_START + 8;
  anchor.section = 5;
  anchor.bossPhase = 1;
  anchor.surge = 1;
  anchor.boatX = -0.34;
  activateSurge(anchor);
  anchor.entities.push({ id: 300, type: "bossAnchor", side: "left", x: -0.34, z: 0.101, hit: false });
  updateGame(anchor, {}, 1 / 60);
  assert.deepEqual(anchor.bossAnchors.map(item => item.side), ["left"]);
  assert.match(anchor.message, /ANCHOR SEVERED/);

  const hull = startGame(createGame());
  hull.time = BOSS_START + 46;
  hull.section = 5;
  hull.bossPhase = 2;
  hull.routeCenter = 0;
  hull.routeHalfWidth = 0.5;
  hull.boatX = -0.5;
  hull.bossAnchors = [{ side: "left" }, { side: "right" }];
  hull.surge = 1;
  activateSurge(hull);
  hull.entities.push({ id: 301, type: "bossHull", side: "left", x: -0.5, z: 0.101, hit: false });
  updateGame(hull, { left: true }, 1 / 60);
  assert.equal(hull.bossHullBreaches.length, 1);
  assert.equal(hull.integrity, 3);

  const drain = startGame(createGame());
  drain.time = BOSS_START + 90;
  drain.section = 5;
  drain.bossPhase = 3;
  drain.depth = 0.7;
  drain.boatX = -0.24;
  drain.bossHullBreaches = [{}, {}, {}];
  drain.entities.push({ id: 302, type: "bossDrain", layer: "deep", x: -0.24, z: 0.101, hit: false });
  updateGame(drain, { dive: true }, 1 / 60);
  assert.deepEqual(drain.bossDrains.map(item => item.layer), ["deep"]);
});

test("the exposed flood core requires both drains and a surge", () => {
  const state = startGame(createGame());
  state.time = STAGE_SECONDS - 10;
  state.section = 5;
  state.bossPhase = 3;
  state.bossDrains = [{ layer: "deep" }, { layer: "surface" }];
  state.surge = 1;
  activateSurge(state);
  state.entities.push({ id: 303, type: "bossCore", x: 0, z: 0.101, hit: false });
  updateGame(state, {}, 1 / 60);
  assert.equal(state.bossDefeated, true);
  assert.match(state.message, /CORE SHATTERED/);
});

test("core destruction plays a timed collapse before the result", () => {
  const state = startGame(createGame());
  state.time = STAGE_SECONDS - 7.1;
  state.section = 5;
  state.bossPhase = 3;
  state.spawned = ROUTE_EVENTS.length;
  state.escortSecured = true;
  state.bossDrains = [{ layer: "deep" }, { layer: "surface" }];
  state.surge = 1;
  activateSurge(state);
  state.entities.push({ id: 305, type: "bossCore", x: 0, z: 0.101, hit: false });
  updateGame(state, {}, 1 / 60);
  assert.equal(state.bossCollapseStage, 0);
  while (state.bossCollapseTime < 3.3) updateGame(state, {}, 0.05);
  assert.equal(state.mode, "playing");
  assert.equal(state.bossCollapseStage, 2);
  assert.match(state.message, /LOSING BUOYANCY/);
  while (state.mode === "playing") updateGame(state, {}, 0.05);
  assert.equal(state.mode, "cleared");
  assert.ok(state.bossCollapseTime >= 6.8);
});

test("a surge activated at the boss approach marker lasts through impact", () => {
  const state = startGame(createGame());
  state.time = BOSS_START + 8;
  state.section = 5;
  state.bossPhase = 1;
  state.surge = 1;
  state.boatX = -0.34;
  state.entities.push({ id: 304, type: "bossAnchor", side: "left", x: -0.34, z: 0.25, hit: false });
  activateSurge(state);
  while (!state.entities[0].hit) updateGame(state, {}, 1 / 60);
  assert.deepEqual(state.bossAnchors.map(item => item.side), ["left"]);
  assert.equal(state.integrity, 3);
});

test("the underflow requires diving below ceilings and surfacing above intakes", () => {
  const deep = startGame(createGame());
  deep.time = STREET_END + 5;
  deep.section = 2;
  deep.depth = 0.72;
  deep.entities.push({ id: 90, type: "lowCeiling", x: 0, z: 0.101, hit: false });
  updateGame(deep, { dive: true }, 1 / 60);
  assert.equal(deep.integrity, 3);
  assert.equal(deep.message, "DIVE CLEAR");

  const surface = startGame(createGame());
  surface.time = STREET_END + 8;
  surface.section = 2;
  surface.depth = 0.15;
  surface.entities.push({ id: 91, type: "intake", x: 0, z: 0.101, hit: false });
  updateGame(surface, { surface: true }, 1 / 60);
  assert.equal(surface.integrity, 3);
  assert.equal(surface.message, "SURFACE CLEAR");
});

test("underflow rescue access follows the boat layer", () => {
  const state = startGame(createGame());
  state.time = STREET_END + 5;
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
  state.time = STREET_END + 5;
  state.section = 2;
  while (state.depth < 0.7) updateGame(state, { dive: true }, 1 / 60);
  while (state.depth > 0.3) updateGame(state, { surface: true }, 1 / 60);
  assert.ok(state.maxDepth >= 0.7);
  assert.equal(state.surfacedAfterDive, true);
});

test("deep underflow valves lock one route and change later water geometry", () => {
  const state = startGame(createGame());
  state.time = STREET_END + 29;
  state.section = 2;
  state.depth = 0.72;
  state.spawned = ROUTE_EVENTS.length;
  state.boatX = -0.30;
  state.entities.push(
    { id: 190, type: "tunnelValve", choice: "sluice-a", route: "DRAIN", x: -0.30, z: 0.101, hit: false },
    { id: 191, type: "tunnelValve", choice: "sluice-a", route: "FLOOD", x: 0.30, z: 0.101, hit: false }
  );
  updateGame(state, { dive: true }, 1 / 60);
  assert.deepEqual(state.underflowValves.map(choice => choice.route), ["DRAIN"]);
  assert.equal(state.entities.find(entity => entity.id === 191)?.hit, true);
  assert.match(state.message, /DRAIN VALVE/);

  const drain = routeProfile(STREET_END + 60, state.routeChoices);
  const flood = routeProfile(STREET_END + 60, [{ choice: "sluice-a", route: "FLOOD" }]);
  assert.ok(drain.halfWidth < flood.halfWidth, "draining exposes the narrower lower works");
  assert.notEqual(drain.center, flood.center);
});

test("underflow valve decisions select later hazards and rescue layers", () => {
  const firstConditional = ROUTE_EVENTS.findIndex(event => event[0] === 400);
  const state = startGame(createGame());
  state.time = 399.99;
  state.section = 2;
  state.spawned = firstConditional;
  state.underflowValves.push({ choice: "sluice-a", route: "DRAIN", time: 393 });
  updateGame(state, {}, 0.02);
  assert.ok(state.entities.some(entity => entity.type === "lowCeiling"));
  assert.ok(!state.entities.some(entity => entity.type === "intake"));
});

test("the flooded arcade bends, narrows, and pushes across the route", () => {
  const entrance = routeProfile(HARBOR_END);
  const eastBend = routeProfile(HARBOR_END + 8);
  const westBend = routeProfile(HARBOR_END + 24);
  assert.equal(entrance.center, 0);
  assert.ok(eastBend.center > 0.25 && westBend.center < -0.25);
  assert.ok(eastBend.halfWidth < routeProfile(10).halfWidth);
  assert.notEqual(eastBend.current, 0);
});

test("the first district rescue changes the following waterway and hazards", () => {
  const marketChoices = [{ choice: "market", route: "MARKET" }];
  const arcadeChoices = [{ choice: "market", route: "ARCADE" }];
  const market = routeProfile(HARBOR_END + 54, marketChoices);
  const arcade = routeProfile(HARBOR_END + 54, arcadeChoices);
  assert.notEqual(market.center, arcade.center);
  assert.ok(market.halfWidth < arcade.halfWidth, "market is the tighter service canyon");
  assert.ok(Math.abs(market.current) < Math.abs(arcade.current), "arcade route carries the stronger crosscurrent");

  const marketState = startGame(createGame());
  marketState.time = HARBOR_END + 7.5;
  marketState.boatX = -0.28;
  marketState.surgeTime = 0.5;
  marketState.entities.push({ id: 90, type: "routeSurvivor", x: -0.28, route: "MARKET", choice: "market", z: 0.101, hit: false });
  updateGame(marketState, {}, 1 / 60);
  assert.equal(marketState.routeChoices[0].route, "MARKET");
  const routed = routeProfile(HARBOR_END + 54, marketState.routeChoices);
  assert.deepEqual(routed, market);
});

test("the relay rescue creates a second linked street profile", () => {
  const clinic = routeProfile(HARBOR_END + 118, [
    { choice: "market", route: "MARKET" }, { choice: "station", route: "CLINIC" }
  ]);
  const station = routeProfile(HARBOR_END + 118, [
    { choice: "market", route: "MARKET" }, { choice: "station", route: "STATION" }
  ]);
  assert.notEqual(clinic.center, station.center);
  assert.notEqual(clinic.current, station.current);
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

test("flood-cut choices reduce the official route clock without skipping authored encounters", () => {
  const state = startGame(createGame());
  state.spawned = ROUTE_EVENTS.length;
  state.time = HARBOR_END + 7.5;
  state.boatX = 0.28;
  state.surgeTime = 0.5;
  state.entities.push({ id: 92, type: "routeSurvivor", x: 0.28, route: "ARCADE", choice: "market", shortcutSeconds: 12, z: 0.101, hit: false });
  updateGame(state, {}, 1 / 60);
  assert.equal(state.shortcutSeconds, 12);
  assert.equal(state.shortcuts[0].route, "ARCADE");
  assert.equal(Number((state.time - missionTime(state)).toFixed(3)), 12);
  assert.match(state.message, /FLOOD CUT/);
  assert.ok(state.effects.some(effect => effect.type === "shortcut"));

  state.time = STREET_END + 30;
  state.section = 2;
  state.depth = 0.72;
  state.boatX = 0.30;
  state.entities.push({ id: 93, type: "tunnelValve", x: 0.30, route: "FLOOD", choice: "sluice-a", shortcutSeconds: 18, z: 0.101, hit: false });
  updateGame(state, { dive: true }, 1 / 60);
  assert.equal(state.shortcutSeconds, 30);
  assert.equal(state.shortcuts.length, 2);
});

test("harbor priority rescues count passengers and close the competing signal", () => {
  const state = startGame(createGame());
  state.time = 58;
  state.boatX = -0.30;
  state.surgeTime = 0.5;
  state.entities.push(
    { id: 90, type: "prioritySurvivor", x: -0.30, route: "FAMILY", passengers: 3, choice: "pier-a", z: 0.101, hit: false },
    { id: 91, type: "prioritySurvivor", x: 0.30, route: "DECKHAND", passengers: 1, choice: "pier-a", z: 0.101, hit: false }
  );
  updateGame(state, {}, 1 / 60);
  assert.equal(state.rescued, 3);
  assert.deepEqual(state.harborPriorities.map(choice => [choice.route, choice.passengers]), [["FAMILY", 3]]);
  assert.equal(state.entities.find(entity => entity.id === 91)?.hit, true);
});

test("harbor debris forks support a charged break route and a safe recharge route", () => {
  const breaker = startGame(createGame());
  breaker.time = 73;
  breaker.boatX = -0.34;
  breaker.surge = 1;
  activateSurge(breaker);
  breaker.entities.push(
    { id: 92, type: "forkBreak", x: -0.34, route: "BREAK", choice: "channel-a", z: 0.101, hit: false },
    { id: 93, type: "forkGate", x: 0.34, route: "BYPASS", choice: "channel-a", z: 0.101, hit: false }
  );
  updateGame(breaker, {}, 1 / 60);
  assert.equal(breaker.integrity, 3);
  assert.deepEqual(breaker.harborRoutes.map(choice => choice.route), ["BREAK"]);
  assert.equal(breaker.entities.find(entity => entity.id === 93)?.hit, true);

  const bypass = startGame(createGame());
  bypass.time = 73;
  bypass.boatX = 0.34;
  bypass.surge = 0;
  bypass.entities.push({ id: 94, type: "forkGate", x: 0.34, route: "BYPASS", choice: "channel-a", z: 0.101, hit: false });
  updateGame(bypass, {}, 1 / 60);
  assert.deepEqual(bypass.harborRoutes.map(choice => choice.route), ["BYPASS"]);
  assert.ok(bypass.surge >= 0.28);
});

test("container convoy clears only at the warned tide while holding formation", () => {
  const safe = startGame(createGame());
  safe.time = UNDERFLOW_END + 4;
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
  wrongTide.time = UNDERFLOW_END + 4;
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
  state.time = UNDERFLOW_END + 1;
  state.section = 3;
  state.escortActive = true;
  state.boatX = 0.6;
  state.escortX = 0;
  updateGame(state, {}, 0.05);
  assert.ok(state.escortX > 0 && state.escortX < state.boatX);
});

test("loading evacuees slows the ferry while surge rallies the formation", () => {
  const state = startGame(createGame());
  state.time = UNDERFLOW_END + 30;
  state.section = 3;
  state.escortActive = true;
  state.boatX = -0.3;
  state.escortX = -0.3;
  state.entities.push({ id: 98, type: "convoyPickup", choice: "manifest-a", route: "HOSPITAL", passengers: 4, x: -0.3, z: 0.101, hit: false });
  updateGame(state, {}, 1 / 60);
  assert.equal(state.escortLoad, 4);
  assert.equal(state.rescued, 4);
  state.boatX = 0.5;
  const before = state.escortX;
  updateGame(state, {}, 0.05);
  const normalGain = state.escortX - before;
  state.surge = 1;
  activateSurge(state);
  const ralliedBefore = state.escortX;
  updateGame(state, {}, 0.05);
  assert.ok(state.escortX - ralliedBefore > normalGain);
});

test("convoy route commits only at the matching tide and closes its alternative", () => {
  const state = startGame(createGame());
  state.time = UNDERFLOW_END + 58;
  state.section = 3;
  state.escortActive = true;
  state.tideLevel = 0.1;
  state.boatX = state.escortX = -0.32;
  state.entities.push(
    { id: 99, type: "convoyFork", choice: "basin-a", route: "SERVICE", tide: "low", x: -0.32, z: 0.101, hit: false },
    { id: 100, type: "convoyFork", choice: "basin-a", route: "LOCK", tide: "high", x: 0.32, z: 0.101, hit: false }
  );
  updateGame(state, { dive: true }, 1 / 60);
  assert.deepEqual(state.convoyRoutes.map(item => item.route), ["SERVICE"]);
  assert.equal(state.entities.find(entity => entity.id === 100)?.hit, true);
  assert.equal(state.escortIntegrity, 3);
});

test("stormwall gates require the warned wall ride and lever direction", () => {
  const safe = startGame(createGame());
  safe.time = CONVOY_END + 6;
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
  wrongLever.time = CONVOY_END + 6;
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
  const entry = routeProfile(CONVOY_END);
  const crest = routeProfile(CONVOY_END + 74, [{ choice: "wall-a", route: "PUMPS" }]);
  const beacon = routeProfile(CONVOY_END + 74, [{ choice: "wall-a", route: "BEACONS" }]);
  assert.ok(entry.halfWidth < routeProfile(UNDERFLOW_END + 10).halfWidth);
  assert.notEqual(crest.center, 0);
  assert.notEqual(crest.current, 0);
  assert.ok(crest.halfWidth < beacon.halfWidth, "the pump cut is narrower than the beacon channel");
  assert.notEqual(crest.center, beacon.center);
});

test("stormwall equipment commits one wall system and closes its alternative", () => {
  const state = startGame(createGame());
  state.time = CONVOY_END + 44;
  state.section = 4;
  state.routeCenter = 0;
  state.routeHalfWidth = 0.54;
  state.boatX = -0.54;
  state.surge = 1;
  activateSurge(state);
  state.entities.push(
    { id: 198, type: "stormFork", choice: "wall-a", route: "PUMPS", side: "left", control: "surface", x: -0.50, z: 0.101, hit: false },
    { id: 199, type: "stormFork", choice: "wall-a", route: "BEACONS", side: "right", control: "dive", x: 0.50, z: 0.101, hit: false }
  );
  updateGame(state, { left: true, surface: true }, 1 / 60);
  assert.deepEqual(state.stormRoutes.map(item => item.route), ["PUMPS"]);
  assert.equal(state.entities.find(entity => entity.id === 199)?.hit, true);
  assert.match(state.message, /PUMPS SYSTEM/);
});

test("the rescue ferry enters the safe basin only after both systems and full formation", () => {
  const state = startGame(createGame());
  state.time = STAGE_SECONDS - 9;
  state.section = 4;
  state.spawned = ROUTE_EVENTS.length;
  state.boatX = state.escortX = 0;
  state.escortLoad = 9;
  state.wallGateClears = Array.from({ length: 12 }, (_, index) => ({ time: 730 + index }));
  state.stormRoutes = [{ choice: "wall-a", route: "PUMPS" }, { choice: "wall-b", route: "RELIEF" }];
  state.entities.push({ id: 200, type: "stormShelter", x: 0, z: 0.101, hit: false });
  updateGame(state, {}, 1 / 60);
  assert.equal(state.escortSecured, true);
  assert.equal(state.escortIntegrity, 3);
  assert.match(state.message, /FERRY SAFE/);
});
