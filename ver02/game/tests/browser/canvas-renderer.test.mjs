import assert from "node:assert/strict";
import test from "node:test";
import { renderCanvasFrame, missingAssetIds } from "../../src/browser/canvas-renderer.mjs";
import { PHASE05_TEST_STAGE } from "../../src/content/stages/phase05-test-segment.mjs";
import { createStageViewModel } from "../../src/ui/stage-view-model.mjs";

function fakeContext() {
  const calls = [];
  const context = { calls };
  for (const method of [
    "save", "restore", "clearRect", "fillRect", "strokeRect", "fillText", "drawImage",
    "translate", "rotate", "scale", "beginPath", "moveTo", "lineTo", "closePath", "fill", "stroke", "arc",
    "setLineDash",
  ]) {
    context[method] = (...args) => calls.push([method, ...args]);
  }
  return context;
}

function fakeImage() {
  return { naturalWidth: 1600, naturalHeight: 900 };
}

test("draws parallax layers twice, contained actors, and accessible HUD data", () => {
  const view = createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    tick: 180,
    score: 42,
    coreQueue: ["red"],
    actors: [{ assetId: "player-interceptor", x: 0.2, y: 0.5, width: 0.25, height: 0.25 }],
  });
  const assets = Object.fromEntries([
    ...view.layers.map(({ assetId }) => [assetId, fakeImage()]),
    ["player-interceptor", fakeImage()],
  ]);
  const context = fakeContext();
  const result = renderCanvasFrame(context, view, assets);

  assert.equal(result.drawnAssets, 4);
  assert.equal(context.calls.filter(([method]) => method === "drawImage").length, 7);
  assert.ok(context.calls.some(([method, text]) => method === "fillText" && text === "00000042"));
  assert.deepEqual(result.missingAssets, []);
});

test("CORE-03/WPN-01〜03: 3系統の弾をLvに応じた別形状で描く", () => {
  const view = createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    projectiles: [
      { id: "l", x: 0.3, y: 0.4, kind: "lance", level: 3, angle: 0 },
      { id: "s", x: 0.4, y: 0.5, kind: "spread", level: 2, angle: -0.2 },
      { id: "h", x: 0.5, y: 0.6, kind: "seeker", level: 1, angle: 0.1 },
    ],
  });
  const assets = Object.fromEntries(view.layers.map(({ assetId }) => [assetId, fakeImage()]));
  const context = fakeContext();
  renderCanvasFrame(context, view, assets);
  assert.equal(context.calls.filter(([method]) => method === "translate").length, 3);
  assert.equal(context.calls.filter(([method]) => method === "arc").length, 1);
  assert.equal(context.calls.filter(([method]) => method === "closePath").length, 1);
  assert.ok(context.calls.filter(([method]) => method === "lineTo").length >= 5);
});

test("CORE-03/CORE-06: 自機の無武装と3武器×3段階を非色形状で一意に描く", () => {
  const configurations = [
    { primary: null, level: 0, supports: [], invulnerable: false },
    ...["red", "blue", "yellow"].flatMap((primary) => [1, 2, 3].map((level) => ({
      primary, level, supports: [], invulnerable: false,
    }))),
  ];
  const signatures = configurations.map((reactor) => {
    const view = createStageViewModel({
      stage: PHASE05_TEST_STAGE,
      actors: [{
        assetId: "player-interceptor", x: 0.2, y: 0.5, width: 0.12, height: 0.15,
        tone: "player", reactor,
      }],
    });
    const assets = Object.fromEntries([
      ...view.layers.map(({ assetId }) => [assetId, fakeImage()]),
      ["player-interceptor", fakeImage()],
    ]);
    const context = fakeContext();
    renderCanvasFrame(context, view, assets);
    return JSON.stringify(context.calls.filter(([method]) => [
      "arc", "moveTo", "lineTo", "closePath", "fill", "stroke", "setLineDash",
    ].includes(method)));
  });
  assert.equal(new Set(signatures).size, 10);
});

test("A11Y-02: 混色補助と無敵リングは動き軽減・高コントラストでも残る", () => {
  const view = createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    tick: 11,
    settings: { reducedMotion: true, highContrast: true },
    actors: [{
      assetId: "player-interceptor", x: 0.2, y: 0.5, width: 0.12, height: 0.15,
      tone: "player",
      reactor: { primary: "red", level: 1, supports: ["blue", "yellow"], invulnerable: true },
    }],
  });
  const assets = Object.fromEntries([
    ...view.layers.map(({ assetId }) => [assetId, fakeImage()]),
    ["player-interceptor", fakeImage()],
  ]);
  const context = fakeContext();
  renderCanvasFrame(context, view, assets);
  assert.ok(context.calls.filter(([method]) => method === "arc").length >= 3);
  assert.ok(context.calls.some(([method, dash]) => method === "setLineDash" && dash.length === 2));
  assert.ok(context.calls.filter(([method]) => method === "closePath").length >= 4);
});

test("AV-04/A11Y-02: 4種VFXを非色形状で描き、動き軽減でも残す", () => {
  const effects = ["hit", "damage", "destroy", "collect"].map((kind, index) => ({
    id: kind, kind, x: 0.3 + index * 0.1, y: 0.5, ageTicks: 4, lifetimeTicks: 20,
  }));
  const view = createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    settings: { reducedMotion: true, highContrast: true },
    effects,
  });
  const assets = Object.fromEntries(view.layers.map(({ assetId }) => [assetId, fakeImage()]));
  const context = fakeContext();
  renderCanvasFrame(context, view, assets);
  assert.equal(context.calls.filter(([method]) => method === "translate").length, 4);
  assert.equal(context.calls.filter(([method]) => method === "arc").length, 2);
  assert.ok(context.calls.some(([method, dash]) => method === "setLineDash" && dash.length === 2));
  assert.ok(context.calls.filter(([method]) => method === "closePath").length >= 4);
});

test("AV-02/A11Y-02: actorの登場・攻撃・被弾・形態変化とクリアを非色形状で描く", () => {
  const states = ["enter", "attack", "hit", "phase"];
  const actors = states.map((state, index) => ({
    id: state,
    assetId: "player-interceptor",
    x: 0.2 + index * 0.18,
    y: 0.45,
    width: 0.12,
    height: 0.15,
    tone: index === 0 ? "player" : "enemy",
    animation: { state, progress: 0.5, variant: "test" },
  }));
  const view = createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    settings: { reducedMotion: true, highContrast: true },
    actors,
    effects: [{ kind: "eject", core: "blue", x: 0.4, y: 0.6, ageTicks: 8, lifetimeTicks: 32 }],
    transition: { kind: "clear", progress: 1 },
  });
  const assets = Object.fromEntries([
    ...view.layers.map(({ assetId }) => [assetId, fakeImage()]),
    ["player-interceptor", fakeImage()],
  ]);
  const context = fakeContext();
  renderCanvasFrame(context, view, assets);
  assert.equal(context.calls.filter(([method]) => method === "scale").length, 4);
  assert.ok(context.calls.some(([method, value]) => method === "fillText" && value === "STAGE CLEAR"));
  assert.ok(context.calls.some(([method, dash]) => method === "setLineDash" && dash.length === 2));
  assert.ok(context.calls.filter(([method]) => method === "lineTo").length >= 12);
});

test("PROG-06/A11Y-03: 高コントラストでも危険名と記号を先行表示する", () => {
  const view = createStageViewModel({
    stage: PHASE05_TEST_STAGE,
    settings: { reducedMotion: true, highContrast: true },
    hazardWarnings: [{
      hazardId: "wreck-compression",
      behaviorId: "closing-corridor",
      ticksUntilActive: 30,
    }],
  });
  const assets = Object.fromEntries(view.layers.map(({ assetId }) => [assetId, fakeImage()]));
  const context = fakeContext();
  renderCanvasFrame(context, view, assets);
  assert.ok(context.calls.some(([method, value]) => (
    method === "fillText" && value === "CAUTION  ↕ 圧縮通路"
  )));
  assert.ok(context.calls.some(([method, x, y, width, height]) => (
    method === "strokeRect" && x === 310 && y === 78 && width === 660 && height === 74
  )));
});

test("reports every missing asset before drawing", () => {
  const view = createStageViewModel({ stage: PHASE05_TEST_STAGE });
  assert.deepEqual(missingAssetIds(view, {}), ["bg-stg01-far", "bg-stg01-mid", "bg-stg01-fore"]);
  assert.throws(() => renderCanvasFrame(fakeContext(), view, {}), /missing canvas assets/);
});
