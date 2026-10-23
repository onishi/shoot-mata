import test from "node:test";
import assert from "node:assert/strict";
import { auditWeaponSituations } from "../../src/core/weapon-situation-audit.mjs";

const EXPECTED_RESULTS = {
  "single-durable-target": {
    red: { ticks: 75, destroyed: 0, escaped: 0, remainingHitPoints: 0 },
    blue: { ticks: 101, destroyed: 0, escaped: 0, remainingHitPoints: 0 },
    yellow: { ticks: 176, destroyed: 0, escaped: 0, remainingHitPoints: 0 },
  },
  "close-formation-swarm": {
    red: { ticks: 75, destroyed: 5, escaped: 0, remainingHitPoints: 0 },
    blue: { ticks: 47, destroyed: 5, escaped: 0, remainingHitPoints: 0 },
    yellow: { ticks: 83, destroyed: 5, escaped: 0, remainingHitPoints: 0 },
  },
  "covered-dead-angle": {
    red: { ticks: 220, destroyed: 0, escaped: 0, remainingHitPoints: 60 },
    blue: { ticks: 220, destroyed: 0, escaped: 0, remainingHitPoints: 60 },
    yellow: { ticks: 63, destroyed: 1, escaped: 0, remainingHitPoints: 0 },
  },
};

test("WPN-04: 同じLv3構成と入力で単体・群れ・遮蔽死角の優位武器が逆転する", () => {
  const first = auditWeaponSituations();
  const replay = auditWeaponSituations();
  assert.deepEqual(replay, first);
  assert.equal(first.violations.length, 0);
  assert.deepEqual(
    Object.fromEntries(first.scenarios.map(({ id, winner }) => [id, winner])),
    {
      "single-durable-target": "red",
      "close-formation-swarm": "blue",
      "covered-dead-angle": "yellow",
    },
  );
  assert.deepEqual(
    Object.fromEntries(first.scenarios.map(({ id, results }) => [id, results])),
    EXPECTED_RESULTS,
  );
});
