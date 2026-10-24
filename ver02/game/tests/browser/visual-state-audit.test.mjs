import assert from "node:assert/strict";
import test from "node:test";
import { auditVisualStates } from "../../src/browser/visual-state-audit.mjs";

test("CORE-01/03/04/06・WPN-01〜04・A11Y-02/03・AV-02〜04: 全4面の表示状態を監査する", () => {
  const first = auditVisualStates();
  const replay = auditVisualStates();
  assert.deepEqual(replay, first);
  assert.equal(first.violations.length, 0);
  assert.equal(first.stageCount, 4);
  assert.deepEqual(first.displayProfiles, [
    "normal", "high-contrast", "reduced-motion", "reduced-flashes",
  ]);
  assert.notEqual(first.flashCheck.normalPulse[0], first.flashCheck.normalPulse[1]);
  assert.equal(first.flashCheck.reducedFlashPulse[0], first.flashCheck.reducedFlashPulse[1]);

  for (const stage of first.stages) {
    assert.deepEqual(stage.missingAssets, []);
    assert.equal(stage.profiles.length, first.displayProfiles.length);
    for (const profile of stage.profiles) {
      assert.equal(profile.uniqueWeaponSignatures, first.thresholds.weaponConfigurations);
      assert.deepEqual(profile.actorAnimationStates, ["attack", "enter", "hit", "move", "phase"]);
      assert.equal(profile.projectileStates.length, first.thresholds.projectileStates);
      assert.equal(new Set(profile.projectileStates).size, first.thresholds.projectileStates);
      assert.deepEqual(profile.effectStates, ["hit", "damage", "destroy", "collect", "eject"]);
      assert.deepEqual(profile.coreQueueSymbols, ["I", "+", "◎"]);
      assert.equal(profile.transition, "clear");
      if (profile.id === "reduced-motion") assert.equal(profile.parallaxFrozen, true);
    }
  }
});
