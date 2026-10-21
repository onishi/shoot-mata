import assert from "node:assert/strict";
import test from "node:test";
import { renderCanvasFrame, missingAssetIds } from "../../src/browser/canvas-renderer.mjs";
import { PHASE05_TEST_STAGE } from "../../src/content/stages/phase05-test-segment.mjs";
import { createStageViewModel } from "../../src/ui/stage-view-model.mjs";

function fakeContext() {
  const calls = [];
  const context = { calls };
  for (const method of ["save", "restore", "clearRect", "fillRect", "strokeRect", "fillText", "drawImage"]) {
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

test("reports every missing asset before drawing", () => {
  const view = createStageViewModel({ stage: PHASE05_TEST_STAGE });
  assert.deepEqual(missingAssetIds(view, {}), ["bg-stg01-far", "bg-stg01-mid", "bg-stg01-fore"]);
  assert.throws(() => renderCanvasFrame(fakeContext(), view, {}), /missing canvas assets/);
});
