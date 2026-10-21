import test from "node:test";
import assert from "node:assert/strict";
import {
  CAMPAIGN_STAGE_COUNT,
  INITIAL_CONTINUES,
  createFlowState,
  transitionFlow,
} from "../../src/core/flow-machine.mjs";

function send(state, type, extra = {}) {
  return transitionFlow(state, { type, ...extra });
}

test("LOOP-01: 初回キャンペーンは説明を経てプレイへ入る", () => {
  let state = createFlowState();
  state = send(state, "START_CAMPAIGN");
  assert.equal(state.screen, "tutorial");
  assert.equal(state.stageIndex, 0);
  state = send(state, "COMPLETE_TUTORIAL");
  assert.equal(state.tutorialSeen, true);
  state = send(state, "BEGIN_STAGE");
  assert.equal(state.screen, "playing");
});

test("LOOP-04: ポーズと再開はプレイ条件を保持する", () => {
  let state = createFlowState({ tutorialSeen: true });
  state = send(send(state, "START_CAMPAIGN"), "BEGIN_STAGE");
  const beforePause = { stageIndex: state.stageIndex, attempt: state.attempt };
  state = send(state, "PAUSE");
  assert.equal(state.screen, "paused");
  state = send(state, "RESUME");
  assert.equal(state.screen, "playing");
  assert.deepEqual({ stageIndex: state.stageIndex, attempt: state.attempt }, beforePause);
});

test("LOOP-04: 再開・タイトル離脱は確認を解決するまで進行を失わない", () => {
  let state = createFlowState({ tutorialSeen: true, maxUnlockedStage: 2 });
  state = send(send(state, "START_CAMPAIGN"), "BEGIN_STAGE");
  const playing = state;

  state = send(state, "REQUEST_RESTART");
  assert.equal(state.confirmation, "restart");
  state = send(state, "CANCEL_CONFIRMATION");
  assert.deepEqual(state, playing);

  state = send(state, "PAUSE");
  state = send(state, "REQUEST_TITLE");
  assert.equal(state.screen, "paused");
  assert.equal(state.confirmation, "title");
  state = send(state, "CONFIRM");
  assert.equal(state.screen, "title");
  assert.equal(state.maxUnlockedStage, 2);
  assert.equal(state.tutorialSeen, true);
});

test("LOOP-04: 再挑戦の確認後だけattemptを増やして同じ面へ戻る", () => {
  let state = createFlowState({ tutorialSeen: true });
  state = send(send(state, "START_CAMPAIGN"), "BEGIN_STAGE");
  state = send(state, "REQUEST_RESTART");
  state = send(state, "CONFIRM");
  assert.equal(state.screen, "stageIntro");
  assert.equal(state.stageIndex, 0);
  assert.equal(state.attempt, 2);
});

test("LOOP-06: ゲームオーバーから即時再挑戦できる", () => {
  let state = createFlowState({ tutorialSeen: true });
  state = send(send(state, "START_CAMPAIGN"), "BEGIN_STAGE");
  state = send(state, "PLAYER_DEFEATED");
  assert.equal(state.screen, "gameOver");
  state = send(state, "RETRY_STAGE");
  assert.equal(state.screen, "stageIntro");
  assert.equal(state.attempt, 2);
  assert.equal(state.continuesRemaining, INITIAL_CONTINUES);
});

test("LOOP-06: キャンペーンだけが有限のコンティニューを消費できる", () => {
  let state = createFlowState({ tutorialSeen: true });
  state = send(send(state, "START_CAMPAIGN"), "BEGIN_STAGE");

  for (let remaining = INITIAL_CONTINUES - 1; remaining >= 0; remaining -= 1) {
    state = send(state, "PLAYER_DEFEATED");
    state = send(state, "CONTINUE_CAMPAIGN");
    assert.equal(state.continuesRemaining, remaining);
    state = send(state, "BEGIN_STAGE");
  }
  state = send(state, "PLAYER_DEFEATED");
  assert.throws(() => send(state, "CONTINUE_CAMPAIGN"), /no continues/);

  let single = createFlowState({ tutorialSeen: true, maxUnlockedStage: 1 });
  single = send(single, "OPEN_STAGE_SELECT");
  single = send(single, "START_STAGE", { stageIndex: 1 });
  single = send(single, "BEGIN_STAGE");
  single = send(single, "PLAYER_DEFEATED");
  assert.throws(() => send(single, "CONTINUE_CAMPAIGN"), /campaign-only/);
});

test("LOOP-01/05: 4面キャンペーンは結果を経てエンディングとクレジットへ進む", () => {
  let state = createFlowState({ tutorialSeen: true });
  state = send(state, "START_CAMPAIGN");

  for (let stageIndex = 0; stageIndex < CAMPAIGN_STAGE_COUNT; stageIndex += 1) {
    assert.equal(state.stageIndex, stageIndex);
    state = send(state, "BEGIN_STAGE");
    state = send(state, "STAGE_CLEAR");
    assert.equal(state.screen, "result");
    state = send(state, "ADVANCE");
  }
  assert.equal(state.screen, "ending");
  assert.equal(state.maxUnlockedStage, CAMPAIGN_STAGE_COUNT - 1);
  state = send(state, "COMPLETE_ENDING");
  assert.equal(state.screen, "credits");
  state = send(state, "RETURN_TITLE");
  assert.equal(state.screen, "title");
});

test("不正な画面遷移と未解決確認中の別操作は状態を変更せず拒否する", () => {
  const initial = createFlowState();
  assert.throws(() => send(initial, "PAUSE"), /not allowed/);
  assert.deepEqual(initial, createFlowState());

  let state = createFlowState({ tutorialSeen: true });
  state = send(send(state, "START_CAMPAIGN"), "BEGIN_STAGE");
  state = send(state, "REQUEST_RESTART");
  const awaiting = state;
  assert.throws(() => send(state, "PAUSE"), /resolved first/);
  assert.deepEqual(state, awaiting);
});
