import assert from "node:assert/strict";
import test from "node:test";
import { PHASE05_TEST_STAGE } from "../../src/content/stages/phase05-test-segment.mjs";
import { createStageViewModel, GAME_HEIGHT, GAME_WIDTH } from "../../src/ui/stage-view-model.mjs";

test("builds a frozen 16:9 view from stage data and HUD state", () => {
  const view = createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    tick: 660,
    score: 12500,
    lives: 2,
    coreQueue: ["red", "blue", "yellow"],
    weapon: { label: "LANCE", level: 2 },
    boss: { current: 70, maximum: 100 },
    actors: [{
      id: "player",
      assetId: "player-interceptor",
      x: 0.2,
      y: 0.5,
      width: 0.24,
      height: 0.24,
      tone: "player",
      reactor: { primary: "red", level: 2, supports: ["blue", "yellow"], invulnerable: true },
    }],
    projectiles: [{ id: "shot", x: 0.3, y: 0.5, kind: "spread", level: 2, angle: 0.1 }],
    effects: [{ id: "impact", x: 0.4, y: 0.5, kind: "hit", ageTicks: 3, lifetimeTicks: 12 }],
  });

  assert.equal(GAME_WIDTH / GAME_HEIGHT, 16 / 9);
  assert.equal(view.sectionId, "closing-wreck");
  assert.deepEqual(view.layers.map(({ assetId }) => assetId), ["bg-stg01-far", "bg-stg01-mid", "bg-stg01-fore"]);
  assert.ok(view.layers[2].offsetX < view.layers[0].offsetX);
  assert.equal(view.hud.coreQueue[0].ejectedNext, true);
  assert.equal(view.hud.boss.ratio, 0.7);
  assert.deepEqual(view.projectiles[0], { id: "shot", x: 0.3, y: 0.5, kind: "spread", level: 2, angle: 0.1 });
  assert.deepEqual(view.effects[0], { id: "impact", x: 0.4, y: 0.5, kind: "hit", progress: 0.25 });
  assert.deepEqual(view.actors[0].reactor, {
    primary: "red", level: 2, supports: ["blue", "yellow"], invulnerable: true,
  });
  assert.match(view.accessibleSummary, /スコア12500/);
  assert.ok(Object.isFrozen(view));
  assert.ok(Object.isFrozen(view.hud));
});

test("reduced motion freezes parallax without removing visual layers", () => {
  const view = createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    tick: 500,
    settings: { reducedMotion: true, highContrast: true },
  });
  assert.deepEqual(view.layers.map(({ offsetX }) => offsetX), [0, 0, 0]);
  assert.equal(view.display.highContrast, true);
});

test("CORE-05: 無武装HUDは成長前のLv0を表示できる", () => {
  const view = createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    weapon: { label: "UNARMED", level: 0 },
  });
  assert.deepEqual(view.hud.weapon, { label: "UNARMED", level: 0 });
});

test("AV-02: actor animation、core排出、画面遷移を正規化する", () => {
  const view = createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    actors: [{
      assetId: "player-interceptor", x: 0.2, y: 0.5, width: 0.2, height: 0.2,
      animation: { state: "attack", progress: 0.5, variant: "player-interceptor" },
    }],
    effects: [{ kind: "eject", core: "yellow", x: 0.2, y: 0.5, ageTicks: 3, lifetimeTicks: 12 }],
    transition: { kind: "clear", progress: 1 },
  });
  assert.equal(view.actors[0].animation.state, "attack");
  assert.equal(view.effects[0].core, "yellow");
  assert.equal(view.transition.kind, "clear");
});

test("rejects invalid normalized actor and HUD values", () => {
  assert.throws(() => createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    actors: [{ assetId: "player-interceptor", x: 2, y: 0.5, width: 0.2, height: 0.2 }],
  }), /actors\[0\]\.x/);
  assert.throws(() => createStageViewModel({ stage: PHASE05_TEST_STAGE, coreQueue: ["green"] }), /coreQueue/);
  assert.throws(() => createStageViewModel({ stage: PHASE05_TEST_STAGE, tick: 1201 }), /tick exceeds/);
  assert.throws(() => createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    projectiles: [{ x: 0.2, y: 0.5, kind: "laser", level: 1 }],
  }), /projectiles\[0\]\.kind/);
  assert.throws(() => createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    effects: [{ x: 0.2, y: 0.5, kind: "flash", ageTicks: 0, lifetimeTicks: 10 }],
  }), /effects\[0\]\.kind/);
  assert.throws(() => createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    effects: [{ x: 0.2, y: 0.5, kind: "hit", ageTicks: 10, lifetimeTicks: 10 }],
  }), /expired/);
  assert.throws(() => createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    actors: [{
      assetId: "player-interceptor", x: 0.2, y: 0.5, width: 0.2, height: 0.2,
      tone: "player", reactor: { primary: "red", level: 0 },
    }],
  }), /reactor.level/);
  assert.throws(() => createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    actors: [{
      assetId: "enemy-stg01-01", x: 0.2, y: 0.5, width: 0.2, height: 0.2,
      tone: "enemy", reactor: { primary: "blue", level: 1 },
    }],
  }), /requires a player actor/);
});
