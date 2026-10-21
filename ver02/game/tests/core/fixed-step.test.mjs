import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceFixedStep,
  createFixedStepClock,
  setClockSuspended,
} from "../../src/core/fixed-step.mjs";

function runFrames(hz, durationMs) {
  const clock = createFixedStepClock();
  const ticks = [];
  const frameDurationMs = 1000 / hz;
  advanceFixedStep(clock, 0, (step, tick) => ticks.push({ step, tick }));
  for (let frame = 1; frame * frameDurationMs < durationMs; frame += 1) {
    advanceFixedStep(clock, frame * frameDurationMs, (step, tick) => ticks.push({ step, tick }));
  }
  advanceFixedStep(clock, durationMs, (step, tick) => ticks.push({ step, tick }));
  return { clock, ticks };
}

test("TECH-01: 30Hz、60Hz、144Hzの描画は2秒後に同じ120 tickへ到達する", () => {
  const runs = [30, 60, 144].map((hz) => runFrames(hz, 2000));

  for (const { clock, ticks } of runs) {
    assert.equal(clock.updateCount, 120);
    assert.equal(ticks.length, 120);
    assert.ok(Math.abs(clock.simulationTimeMs - 2000) < 1e-8);
    assert.ok(ticks.every(({ step }) => Math.abs(step - 1 / 60) < 1e-12));
  }
});

test("TECH-01: 長いdeltaは250ms受理・8 updateまでに制限し超過を記録する", () => {
  const clock = createFixedStepClock();
  const ticks = [];
  advanceFixedStep(clock, 100, () => {});
  const result = advanceFixedStep(clock, 10100, (step, tick) => ticks.push({ step, tick }));

  assert.equal(result.acceptedDeltaMs, 250);
  assert.equal(result.updates, 8);
  assert.equal(ticks.length, 8);
  assert.ok(result.droppedDeltaMs > 9800);
  assert.equal(clock.totalDroppedMs, result.droppedDeltaMs);
  assert.ok(result.alpha >= 0 && result.alpha < 1);
});

test("TECH-01: hidden中と復帰最初のframeは進めず通常frameから再開する", () => {
  const clock = createFixedStepClock();
  let updates = 0;
  const update = () => { updates += 1; };

  advanceFixedStep(clock, 0, update);
  advanceFixedStep(clock, 1000 / 60, update);
  assert.equal(updates, 1);

  setClockSuspended(clock, true);
  const hidden = advanceFixedStep(clock, 5000, update);
  assert.equal(hidden.updates, 0);
  assert.equal(updates, 1);

  setClockSuspended(clock, false);
  const resumed = advanceFixedStep(clock, 10000, update);
  assert.equal(resumed.updates, 0);
  assert.equal(clock.totalDroppedMs, 0);

  advanceFixedStep(clock, 10000 + 1000 / 60, update);
  assert.equal(updates, 2);
});

test("TECH-01: 補間率は端数だけを表しupdateの固定幅を変えない", () => {
  const clock = createFixedStepClock();
  const steps = [];
  advanceFixedStep(clock, 0, () => {});
  const result = advanceFixedStep(clock, 25, (step) => steps.push(step));

  assert.equal(result.updates, 1);
  assert.equal(steps.length, 1);
  assert.ok(Math.abs(steps[0] - 1 / 60) < 1e-12);
  assert.ok(Math.abs(result.alpha - 0.5) < 1e-12);
});

test("TECH-01: 不正な設定、時刻、非単調時刻を拒否する", () => {
  assert.throws(() => createFixedStepClock({ stepMs: 0 }), /stepMs/);
  assert.throws(() => createFixedStepClock({ maxUpdatesPerFrame: 1.5 }), /maxUpdatesPerFrame/);

  const clock = createFixedStepClock();
  assert.throws(() => advanceFixedStep(clock, Number.NaN, () => {}), /frameTimeMs/);
  advanceFixedStep(clock, 10, () => {});
  assert.throws(() => advanceFixedStep(clock, 9, () => {}), /monotonic/);
  assert.throws(() => setClockSuspended(clock, "yes"), /suspended/);
});
