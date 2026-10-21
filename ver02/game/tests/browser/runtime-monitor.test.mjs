import assert from "node:assert/strict";
import test from "node:test";
import { auditRuntimeResources, createRuntimeMonitor, recordRuntimeFrame } from "../../src/browser/runtime-monitor.mjs";

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
