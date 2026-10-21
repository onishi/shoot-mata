import test from "node:test";
import assert from "node:assert/strict";
import {
  collectReactorCore,
  createReactorLoadout,
  describeReactorLoadout,
  getWeaponProfile,
  loseReactorCore,
  resetReactorLoadout,
} from "../../src/core/reactor-loadout.mjs";

test("CORE-02/03: FIFOの先頭色、同色数、4個目の押し出しを一つの規則で表す", () => {
  const loadout = createReactorLoadout([]);
  collectReactorCore(loadout, "red");
  collectReactorCore(loadout, "red");
  collectReactorCore(loadout, "blue");
  assert.deepEqual(describeReactorLoadout(loadout), {
    weapon: "red", weaponLabel: "LANCE", level: 2, supports: ["blue"],
    queue: ["red", "red", "blue"], nextEjected: "red",
  });
  const result = collectReactorCore(loadout, "yellow");
  assert.equal(result.ejected, "red");
  assert.deepEqual(result.build.queue, ["red", "blue", "yellow"]);
  assert.equal(result.build.level, 1);
});

test("CORE-04: 混色補助は貫通、無敵時間、回収範囲へ機能的に反映する", () => {
  const redSupport = getWeaponProfile(createReactorLoadout(["blue", "red"]));
  const blueSupport = getWeaponProfile(createReactorLoadout(["red", "blue"]));
  const yellowSupport = getWeaponProfile(createReactorLoadout(["red", "yellow"]));
  assert.equal(redSupport.pierce, 1);
  assert.equal(blueSupport.invulnerabilityTicks, 72);
  assert.equal(yellowSupport.collectionRadius, 0.16);
});

test("CORE-05: 被弾は最古コアを失い、空なら残機処理へ渡せる", () => {
  const loadout = createReactorLoadout(["red", "blue"]);
  assert.equal(loseReactorCore(loadout).lost, "red");
  assert.equal(loseReactorCore(loadout).lost, "blue");
  assert.equal(loseReactorCore(loadout).lost, null);
  assert.deepEqual(resetReactorLoadout(loadout).queue, ["red"]);
});
