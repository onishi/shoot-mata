import test from "node:test";
import assert from "node:assert/strict";
import { AIRSPACES, RIBBONS, accessibleStatus, createGame, downdraftAt, galeLiftAt, isSheltered, retry, startGame, togglePause, update, windAt } from "../src/model.js";

function advance(game, seconds, input = {}) {
  const steps = Math.ceil(seconds * 60);
  const events = [];
  for (let i = 0; i < steps; i++) events.push(...update(game, input, 1 / 60));
  return events;
}

test("starts from a fresh launch state", () => {
  const game = createGame(); startGame(game);
  assert.equal(game.mode, "playing"); assert.equal(game.y, 488); assert.equal(game.ribbons.filter(Boolean).length, 0);
});

test("reeling climbs while releasing descends and sheds tension", () => {
  const game = createGame(); startGame(game);
  advance(game, 1, { reel: true }); const highY = game.y; const highTension = game.tension;
  advance(game, 1, { reel: false });
  assert.ok(highY < 430); assert.ok(game.y > highY); assert.ok(game.tension < highTension);
});

test("wind has calm warning and alternating gust phases", () => {
  assert.equal(windAt(1).phase, "calm"); assert.equal(windAt(3.5).phase, "warning"); assert.equal(windAt(5).phase, "gust");
  assert.equal(windAt(5).direction, 1); assert.equal(windAt(11).direction, -1);
});

test("reeling through a gust eventually parts the thread", () => {
  const game = createGame(); startGame(game); game.elapsed = 4.25; game.tension = 0.9;
  const events = advance(game, 1, { reel: true });
  assert.equal(game.mode, "lost"); assert.ok(events.some((event) => event.type === "lost"));
});

test("releasing during a gust protects the thread", () => {
  const game = createGame(); startGame(game); game.elapsed = 4.25; game.tension = 0.88;
  advance(game, 1, { reel: false });
  assert.equal(game.mode, "playing"); assert.ok(game.tension < 0.5);
});

test("contact collects each chime once", () => {
  const game = createGame(); startGame(game); const ribbon = RIBBONS[0]; game.x = ribbon.x; game.y = ribbon.y;
  const first = update(game, {}, 1 / 60); const second = update(game, {}, 1 / 60);
  assert.equal(game.ribbons[0], true); assert.equal(first.filter((e) => e.type === "ribbon").length, 1); assert.equal(second.length, 0);
});

test("all chimes and a centered landing win", () => {
  const game = createGame(); startGame(game); game.ribbons = [true, true, true]; game.x = 480; game.y = 472;
  const events = update(game, {}, 1 / 60);
  assert.equal(game.mode, "won"); assert.ok(events.some((event) => event.type === "won"));
});

test("pause freezes play and retry clears damage", () => {
  const game = createGame(); startGame(game); togglePause(game); const before = game.elapsed; advance(game, 2, { reel: true });
  assert.equal(game.elapsed, before); togglePause(game); game.tension = 1; retry(game);
  assert.equal(game.mode, "playing"); assert.equal(game.tension, 0.12);
});

test("accessible status names changing play state", () => {
  const game = createGame(); assert.match(accessibleStatus(game), /title/i); startGame(game); assert.match(accessibleStatus(game), /Tension/);
  togglePause(game); assert.match(accessibleStatus(game), /Paused/);
});

test("winning Amber Reach advances into Cloud Lee", () => {
  const game = createGame(); startGame(game); game.mode = "won"; startGame(game);
  assert.equal(game.mode, "playing"); assert.equal(game.airspace, 1);
  assert.match(game.message, /CLOUDS SHELTER/);
});

test("Cloud Lee shelter blocks gust push and excess reel tension", () => {
  const exposed = createGame(1); startGame(exposed); exposed.elapsed = 4.3; exposed.x = 700; exposed.y = 260; exposed.tension = 0.2;
  const sheltered = createGame(1); startGame(sheltered); sheltered.elapsed = 4.3; sheltered.x = 480; sheltered.y = 260; sheltered.tension = 0.2;
  assert.equal(isSheltered(exposed), false); assert.equal(isSheltered(sheltered), true);
  advance(exposed, 0.25, { reel: true }); advance(sheltered, 0.25, { reel: true });
  assert.ok(exposed.vx > sheltered.vx + 20); assert.ok(exposed.tension > sheltered.tension + 0.08);
  assert.match(accessibleStatus(sheltered), /Sheltered by cloud/);
});

test("Cloud Lee uses a distinct reachable chime route", () => {
  const game = createGame(1); startGame(game);
  for (const ribbon of AIRSPACES[1].ribbons) {
    game.x = ribbon.x; game.y = ribbon.y; update(game, {}, 1 / 60);
  }
  game.x = 480; game.y = 472; const events = update(game, {}, 1 / 60);
  assert.equal(game.mode, "won"); assert.ok(events.some((event) => event.type === "won"));
});

test("winning Cloud Lee advances into Falling Weft", () => {
  const game = createGame(1); startGame(game); game.mode = "won"; startGame(game);
  assert.equal(game.mode, "playing"); assert.equal(game.airspace, 2);
  assert.match(game.message, /SINKING AIR/);
});

test("Falling Weft downdraft makes releasing lose more height", () => {
  const clear = createGame(2); startGame(clear); clear.x = 650; clear.y = 250;
  const sinking = createGame(2); startGame(sinking); sinking.x = 480; sinking.y = 250;
  assert.equal(downdraftAt(clear), undefined); assert.ok(downdraftAt(sinking));
  advance(clear, 0.5, { reel: false }); advance(sinking, 0.5, { reel: false });
  assert.ok(sinking.y > clear.y + 25);
  assert.match(accessibleStatus(sinking), /sinking air/i);
});

test("Falling Weft downdraft slows climbing but does not trap the kite", () => {
  const game = createGame(2); startGame(game); game.x = 480; game.y = 300;
  const before = game.y; advance(game, 1, { reel: true });
  assert.ok(game.y < before); assert.ok(game.y > before - 35);
});

test("Falling Weft chimes and landing remain reachable", () => {
  const game = createGame(2); startGame(game);
  for (const ribbon of AIRSPACES[2].ribbons) {
    game.x = ribbon.x; game.y = ribbon.y; update(game, {}, 1 / 60);
  }
  game.x = 480; game.y = 472; const events = update(game, {}, 1 / 60);
  assert.equal(game.mode, "won"); assert.ok(events.some((event) => event.type === "won"));
});

test("winning Falling Weft advances into Turning Tack", () => {
  const game = createGame(2); startGame(game); game.mode = "won"; startGame(game);
  assert.equal(game.mode, "playing"); assert.equal(game.airspace, 3);
  assert.match(game.message, /RELEASE TO RISE/);
});

test("Turning Tack converts the forecast gust into safe lift while released", () => {
  const lifted = createGame(3); startGame(lifted); lifted.elapsed = 4.3; lifted.x = 240; lifted.y = 330; lifted.tension = 0.7;
  const outside = createGame(3); startGame(outside); outside.elapsed = 4.3; outside.x = 480; outside.y = 330; outside.tension = 0.7;
  assert.ok(galeLiftAt(lifted)); assert.equal(galeLiftAt(outside), undefined);
  advance(lifted, 0.5, { reel: false }); advance(outside, 0.5, { reel: false });
  assert.ok(lifted.y < 300); assert.ok(outside.y > 350);
  assert.ok(lifted.tension < 0.5);
  assert.match(accessibleStatus(lifted), /Riding gale lift/);
});

test("Turning Tack only activates the lift facing the current gale", () => {
  const rightGale = createGame(3); startGame(rightGale); rightGale.elapsed = 4.3; rightGale.x = 240; rightGale.y = 300;
  const wrongTack = createGame(3); startGame(wrongTack); wrongTack.elapsed = 4.3; wrongTack.x = 720; wrongTack.y = 300;
  assert.ok(galeLiftAt(rightGale)); assert.equal(galeLiftAt(wrongTack), undefined);
  rightGale.elapsed = 10.3; rightGale.x = 720;
  assert.ok(galeLiftAt(rightGale));
});

test("Turning Tack chimes and landing remain reachable", () => {
  const game = createGame(3); startGame(game);
  for (const ribbon of AIRSPACES[3].ribbons) {
    game.x = ribbon.x; game.y = ribbon.y; update(game, {}, 1 / 60);
  }
  game.x = 480; game.y = 472; const events = update(game, {}, 1 / 60);
  assert.equal(game.mode, "won"); assert.ok(events.some((event) => event.type === "won"));
  assert.match(accessibleStatus(game), /Four skies answer/);
});
