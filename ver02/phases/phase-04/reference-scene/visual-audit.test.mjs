import test from "node:test";
import assert from "node:assert/strict";
import {
  MIN_MEAN_PIXEL_DIFFERENCE,
  VISION_SIMULATIONS,
  assetPath,
  horizontalEdgeDensity,
  meanPixelDifference,
  renderVisionSample,
} from "./visual-audit.mjs";

const coreAssets = ["red", "blue", "yellow"].map((color) => ({
  id: `core-${color}`,
  path: assetPath(`../../../assets/game/cores/reactor-core-${color}-v1.png`),
}));
const combatActors = [
  { id: "player", path: assetPath("../../../assets/game/player/player-interceptor-v1.png") },
  { id: "enemy", path: assetPath("../../../assets/game/enemies/stage-01/salvage-collector-v1.png") },
];
const background = assetPath("../../../assets/game/backgrounds/stage-01/orbital-wreck-far-v1.png");

for (const simulation of Object.keys(VISION_SIMULATIONS)) {
  test(`${simulation} keeps all three reactor cores visually distinct`, () => {
    const samples = coreAssets.map((asset) => ({ ...asset, sample: renderVisionSample(asset.path, simulation) }));
    for (let left = 0; left < samples.length; left += 1) {
      for (let right = left + 1; right < samples.length; right += 1) {
        const difference = meanPixelDifference(samples[left].sample, samples[right].sample);
        assert.ok(difference >= MIN_MEAN_PIXEL_DIFFERENCE, `${samples[left].id}/${samples[right].id}: ${difference}`);
      }
    }
  });

  test(`${simulation} keeps player and enemy silhouettes visually distinct`, () => {
    const [player, enemy] = combatActors.map((asset) => renderVisionSample(asset.path, simulation));
    assert.ok(meanPixelDifference(player, enemy) >= MIN_MEAN_PIXEL_DIFFERENCE);
  });
}

test("the grayscale flight background has lower edge density than combat actors", () => {
  const backgroundDensity = horizontalEdgeDensity(renderVisionSample(background, "grayscale"));
  for (const actor of combatActors) {
    const actorDensity = horizontalEdgeDensity(renderVisionSample(actor.path, "grayscale"));
    assert.ok(backgroundDensity < actorDensity, `${actor.id}: background ${backgroundDensity}, actor ${actorDensity}`);
  }
});

test("visual audit helpers reject invalid comparisons", () => {
  assert.throws(() => renderVisionSample(background, "unknown"), /unknown vision simulation/);
  assert.throws(() => meanPixelDifference(Buffer.of(1), Buffer.of(1, 2)), /same non-zero length/);
  assert.throws(() => horizontalEdgeDensity(Buffer.of(1, 2, 3), 2), /dimensions are invalid/);
});
