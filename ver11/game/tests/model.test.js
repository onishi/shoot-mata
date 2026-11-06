import test from "node:test";
import assert from "node:assert/strict";
import { RIBBONS, accessibleStatus, createGame, retry, startGame, togglePause, update, windAt } from "../src/model.js";

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
