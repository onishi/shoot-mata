import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const reportUrl = new URL("../../../phases/phase-09/performance-soak.json", import.meta.url);

test("TECH-05/07: checked-in five-minute loaded soak is complete and within explicit thresholds", async () => {
  const report = JSON.parse(await readFile(reportUrl, "utf8"));
  assert.equal(report.schemaVersion, 1);
  assert.match(report.buildId, /^phase09-performance-soak-/);
  assert.equal(report.condition.renderPasses, 4);
  assert.ok(report.result.elapsedMs >= 300_000);
  assert.ok(report.result.completedCampaigns >= 5);
  assert.ok(report.result.completedStages >= 20);
  assert.equal(report.result.sameSeedReplayMatches, true);
  assert.equal(report.result.qaFailure, null);
  assert.ok(report.result.fps >= report.thresholds.minimumFps);
  assert.ok(report.result.droppedRatio <= report.thresholds.maximumDroppedRatio);
  assert.ok(report.result.maxFrameMs <= report.thresholds.maximumSingleFrameMs);
  assert.ok(report.result.postWarmupHeapGrowthBytes <= report.thresholds.maximumHeapGrowthBytes);
  assert.ok(report.result.postWarmupResourceGrowth <= report.thresholds.maximumPostWarmupResourceGrowth);
  assert.ok(report.result.postWarmupDomGrowth <= report.thresholds.maximumPostWarmupDomGrowth);
  assert.equal(report.result.consoleWarnings, 0);
  assert.equal(report.result.consoleErrors, 0);
  assert.deepEqual(report.result.externalOrigins, []);
  assert.equal(report.metricSamples.length, 11);
  assert.equal(report.passed, true);
});

test("TECH-05: workload evidence cannot claim a physical low-end device", async () => {
  const report = JSON.parse(await readFile(reportUrl, "utf8"));
  assert.equal(report.environment.actualLowEndDeviceObserved, false);
  assert.match(report.condition.limitations, /not evidence from a physical low-end device/);
});
