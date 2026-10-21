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
  const unarmed = getWeaponProfile(createReactorLoadout([]));
  assert.equal(unarmed.level, 0);
  assert.equal(unarmed.collectionRadius, 0.09);
  assert.equal(unarmed.invulnerabilityTicks, 42);
});

test("CORE-03/WPN-01〜03: 3武器×3段階は機能、投射物種別、発射音を持つ", () => {
  const expected = {
    red: { kind: "lance", sound: "audio-ref-weapon-lance", counts: [1, 1, 1], pierce: [0, 1, 2] },
    blue: { kind: "spread", sound: "audio-ref-weapon-spread", counts: [3, 5, 7], pierce: [0, 0, 0] },
    yellow: { kind: "seeker", sound: "audio-ref-weapon-seeker", counts: [1, 2, 3], pierce: [0, 0, 0] },
  };
  for (const [core, rules] of Object.entries(expected)) {
    const profiles = [1, 2, 3].map((level) => getWeaponProfile(createReactorLoadout(Array(level).fill(core))));
    assert.deepEqual(profiles.map(({ projectileCount }) => projectileCount), rules.counts);
    assert.deepEqual(profiles.map(({ pierce }) => pierce), rules.pierce);
    assert.ok(profiles.every(({ projectileKind }) => projectileKind === rules.kind));
    assert.ok(profiles.every(({ soundAssetId }) => soundAssetId === rules.sound));
  }
});
