import assert from "node:assert/strict";
import test from "node:test";
import { createAutomaticCampaignPlaythrough } from "../../src/browser/automatic-playthrough.mjs";
import { createAutomaticInputReplay } from "../../src/browser/automatic-input-replay.mjs";
import { createBrowserInputAdapter } from "../../src/browser/input-adapter.mjs";
import { createGameApplication } from "../../src/app/game-application.mjs";
import { STAGE_01_ORBITAL_WRECK } from "../../src/content/stages/stage-01-orbital-wreck.mjs";
import { STAGE_02_CLOUD_REFINERY } from "../../src/content/stages/stage-02-cloud-refinery.mjs";
import { STAGE_03_LIVING_ARK } from "../../src/content/stages/stage-03-living-ark.mjs";
import { STAGE_04_STELLAR_FURNACE } from "../../src/content/stages/stage-04-stellar-furnace.mjs";
import {
  getCampaignSummary,
} from "../../src/core/game-session.mjs";
import { consumeInput } from "../../src/core/input-state.mjs";
import { createDefaultSaveData } from "../../src/core/save-data.mjs";

const STAGES = Object.freeze([
  STAGE_01_ORBITAL_WRECK,
  STAGE_02_CLOUD_REFINERY,
  STAGE_03_LIVING_ARK,
  STAGE_04_STELLAR_FURNACE,
]);
const SEEDS = Object.freeze([20261022, 20261022, 20261023, 20261024]);

class ReplayTarget extends EventTarget {
  setPointerCapture() {}
}

function primaryAction(session) {
  return {
    title: "start-campaign",
    tutorial: session.flow.tutorialStep < 2 ? "next-tutorial" : "complete-tutorial",
    stageIntro: "begin-stage",
    result: "advance",
    ending: "complete-ending",
  }[session.flow.screen] ?? null;
}

function runCampaignThroughAdapter(mode) {
  const keyboardTarget = new ReplayTarget();
  const pointerTarget = new ReplayTarget();
  const input = createBrowserInputAdapter({ keyboardTarget, gameTarget: pointerTarget });
  let saveData = createDefaultSaveData();
  const application = createGameApplication({
    stages: STAGES,
    stageSeeds: SEEDS,
    seed: SEEDS[0],
    saveRepository: {
      load: () => ({ data: saveData, warning: null }),
      save(data) {
        saveData = data;
        return { saved: true, warning: null };
      },
    },
    audio: {
      activate: () => ({ audible: false, warning: null }),
      getStatus: () => ({ mode: "silent", warning: null }),
      setSettings() {},
      playBgm() {},
      playSfx() {},
      stopBgm() {},
    },
  });
  const session = application.session;
  const playthrough = createAutomaticCampaignPlaythrough({ screenHoldTicks: 0 });
  let primaryActivated = false;
  const replay = createAutomaticInputReplay({
    mode,
    keyboardTarget,
    pointerTarget,
    activatePrimary() {
      const action = primaryAction(session);
      assert.ok(action, `no primary action for ${session.flow.screen}`);
      primaryActivated = true;
      application.dispatch(action);
    },
  });

  let updates = 0;
  while (!playthrough.status(session).stopped && updates < 20_000) {
    primaryActivated = false;
    const replayResult = replay.apply(playthrough.nextCommand(session), {
      playing: session.flow.screen === "playing",
    });
    const command = consumeInput(input.state);
    assert.equal(replayResult.primaryActivated, primaryActivated);
    if (!replayResult.primaryActivated) application.update(command);
    playthrough.observe(session);
    updates += 1;
  }
  replay.dispose();
  input.dispose();
  return {
    session,
    status: playthrough.status(session),
    evidence: replay.getEvidence(),
    updates,
  };
}

test("INP-04: キーボードeventを製品input adapterへ通して4面campaignを完走する", () => {
  const result = runCampaignThroughAdapter("keyboard");
  assert.ok(result.updates < 20_000);
  assert.equal(result.status.failure, null);
  assert.equal(result.status.screen, "credits");
  assert.equal(result.status.completedAttempts, 4);
  assert.equal(getCampaignSummary(result.session).score, 49_620);
  assert.ok(result.evidence.keyboardEvents > 20);
  assert.equal(result.evidence.pointerEvents, 0);
  assert.equal(result.evidence.primaryActivations, 0);
  assert.ok(result.evidence.gameplayFrames > 10_000);
});

test("INP-04: Pointer Eventsを製品input adapterへ通して4面campaignを完走する", () => {
  const result = runCampaignThroughAdapter("touch");
  assert.ok(result.updates < 20_000);
  assert.equal(result.status.failure, null);
  assert.equal(result.status.screen, "credits");
  assert.equal(result.status.completedAttempts, 4);
  assert.equal(getCampaignSummary(result.session).score, 49_620);
  assert.equal(result.evidence.keyboardEvents, 0);
  assert.ok(result.evidence.pointerEvents > 1_000);
  assert.equal(result.evidence.primaryActivations, 13);
  assert.ok(result.evidence.gameplayFrames > 10_000);
});

test("INP-04 replayは入力modeと接続先を検証する", () => {
  const target = new ReplayTarget();
  assert.throws(() => createAutomaticInputReplay({
    mode: "gamepad", keyboardTarget: target, pointerTarget: target, activatePrimary() {},
  }), /mode/);
  assert.throws(() => createAutomaticInputReplay({
    mode: "keyboard", keyboardTarget: {}, pointerTarget: target, activatePrimary() {},
  }), /keyboardTarget/);
});
