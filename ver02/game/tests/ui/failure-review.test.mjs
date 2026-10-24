import test from "node:test";
import assert from "node:assert/strict";
import { createFailureReview } from "../../src/ui/failure-review.mjs";

test("EXP-03: 敵弾敗北を原因・直前コア列・喪失・再試行行動へ変換する", () => {
  const review = createFailureReview({
    failure: {
      tick: 418,
      reason: "enemy-shot",
      coreQueueBefore: ["yellow", "blue", "red"],
      lostCore: "yellow",
      livesBefore: 2,
      livesAfter: 2,
    },
  });
  assert.deepEqual(review, {
    reason: "enemy-shot",
    cause: "敵弾に被弾",
    tick: 418,
    coreQueue: "黄◎ → 青+ → 赤I",
    loss: "黄◎コアを喪失",
    advice: "敵の射線から上下へ早めに外れ、混色するなら青コアの無敵補助を残してください。",
  });
});

test("EXP-03: 時間切れはコアを失っていないことと火力変更を案内する", () => {
  const review = createFailureReview({
    failure: {
      tick: 899,
      reason: "boss-timeout",
      coreQueueBefore: ["red", "yellow"],
      lostCore: null,
      livesBefore: 3,
      livesAfter: 3,
    },
  });
  assert.equal(review.cause, "ボス制限時間を超過");
  assert.equal(review.coreQueue, "赤I → 黄◎");
  assert.equal(review.loss, "コア・残機の喪失なし");
  assert.match(review.advice, /赤コア/);
});

test("EXP-03: 不正な敗北記録は推測表示せず拒否する", () => {
  assert.throws(() => createFailureReview({ failure: null }), /failure snapshot/);
  assert.throws(() => createFailureReview({
    failure: { reason: "enemy-shot", coreQueueBefore: ["green"] },
  }), /coreQueueBefore/);
});
