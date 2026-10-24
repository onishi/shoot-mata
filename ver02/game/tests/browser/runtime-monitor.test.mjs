import assert from "node:assert/strict";
import test from "node:test";
import { auditRuntimeResources, createRuntimeMonitor, recordRuntimeFrame, suspendRuntimeMonitor } from "../../src/browser/runtime-monitor.mjs";

test("TECH-05/07: fixed window reports fps, stalls, and dropped simulation time", () => {
  const monitor = createRuntimeMonitor({ sampleWindowMs: 1_000 });
  for (let frame = 0; frame <= 60; frame += 1) {
    recordRuntimeFrame(monitor, frame * (1_000 / 60), frame === 30 ? 2 : 0);
  }
  assert.ok(Math.abs(monitor.completed.fps - 60) < 0.001);
  assert.equal(monitor.completed.longFrames, 0);
  assert.ok(monitor.completed.maxFrameMs < 17);
  assert.equal(monitor.completed.droppedMs, 2);
});

test("TECH-05/07: completed window is not changed by later inspection stalls", () => {
  const monitor = createRuntimeMonitor({ sampleWindowMs: 1_000 });
  for (let frame = 0; frame <= 60; frame += 1) {
    recordRuntimeFrame(monitor, frame * (1_000 / 60));
  }
  const completed = monitor.completed;
  recordRuntimeFrame(monitor, 10_000, 9_000);
  assert.equal(monitor.completed, completed);
  assert.equal(monitor.completed.longFrames, 0);
  assert.equal(monitor.completed.droppedMs, 0);
  assert.ok(monitor.completed.maxFrameMs < 17);
});

test("TECH-04/05: pause duration is excluded from the runtime sample", () => {
  const monitor = createRuntimeMonitor({ sampleWindowMs: 1_000 });
  for (let frame = 0; frame <= 30; frame += 1) recordRuntimeFrame(monitor, frame * (1_000 / 60));
  suspendRuntimeMonitor(monitor);
  for (let frame = 31; frame <= 61; frame += 1) recordRuntimeFrame(monitor, 10_000 + frame * (1_000 / 60));
  assert.ok(Math.abs(monitor.completed.fps - 60) < 0.001);
  assert.equal(monitor.completed.longFrames, 0);
  assert.ok(monitor.completed.maxFrameMs < 17);
});

test("TECH-06/07: resource audit totals bytes and exposes external origins", () => {
  const audit = auditRuntimeResources([
    { name: "http://localhost/game/main.mjs", encodedBodySize: 100, transferSize: 400 },
    { name: "https://example.test/track", encodedBodySize: 5, transferSize: 10 },
  ], "http://localhost");
  assert.deepEqual(audit, {
    resourceCount: 2,
    encodedBytes: 105,
    transferBytes: 410,
    externalOrigins: ["https://example.test"],
  });
});

test("TECH-05/07: long soak reports post-warmup heap, resource, and DOM growth", () => {
  const monitor = createRuntimeMonitor({ sampleWindowMs: 300_000, metricIntervalMs: 30_000, warmupMs: 60_000 });
  for (let second = 0; second <= 300; second += 1) {
    recordRuntimeFrame(monitor, second * 1_000, 0, {
      heapBytes: 8_000_000 + second * 1_000,
      resourceCount: second < 30 ? 60 : 63,
      domNodes: 48,
    });
  }
  assert.equal(monitor.completed.metricSamples.length, 11);
  assert.equal(monitor.completed.heapGrowthBytes, 240_000);
  assert.equal(monitor.completed.resourceGrowth, 0);
  assert.equal(monitor.completed.domGrowth, 0);
});

test("TECH-05/07: invalid soak configuration and metrics fail closed", () => {
  assert.throws(() => createRuntimeMonitor({ sampleWindowMs: 1_000, warmupMs: 1_000 }), /warmupMs/);
  assert.throws(() => createRuntimeMonitor({ metricIntervalMs: 0 }), /metricIntervalMs/);
  const monitor = createRuntimeMonitor();
  assert.throws(() => recordRuntimeFrame(monitor, 0, 0, { heapBytes: -1 }), /heapBytes/);
});
