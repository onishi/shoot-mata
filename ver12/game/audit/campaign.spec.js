import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const evidence = new URL("../../docs/evidence/m4-campaign-audit.json", import.meta.url);
const INPUT_INTERVAL_MS = 850;
const CHAMBER_SURVEY_MS = 6_000;
const RESULT_READ_MS = 4_000;

const chambers = [
  ["Space", "ArrowLeft", "ArrowLeft", "ArrowDown", "ArrowDown", "Space"],
  ["ArrowRight", "Space", "ArrowRight", "Space", "Space"],
  ["ArrowRight", "Space", "ArrowDown", "ArrowRight", "Space", "Space"],
  ["Space", "ArrowDown", "Space", "Space", "ArrowLeft", "Space"],
  [
    "Space", "ArrowLeft", "ArrowLeft", "ArrowLeft", "Space",
    "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowDown", "Space",
    "ArrowLeft", "Space", "Space", "Space"
  ],
  [
    "ArrowRight", "ArrowDown", "ArrowDown", "Space", "ArrowLeft", "Space",
    "ArrowRight", "ArrowRight", "ArrowRight", "ArrowUp", "ArrowUp",
    "Space", "Space", "Space", "Space", "Space"
  ]
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("human-paced six-chamber credit and 180-frame performance audit", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const canvas = page.locator("canvas");

  const performance = await page.evaluate(async () => {
    const longTasks = [];
    const observer = typeof PerformanceObserver === "undefined" ? null : new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) longTasks.push(entry.duration);
    });
    try {
      observer?.observe({ type: "longtask", buffered: true });
    } catch {
      // Long Tasks are optional in some Chromium builds; frame timings remain authoritative.
    }
    const frames = await new Promise((resolve) => {
      const values = [];
      const sample = (time) => {
        values.push(time);
        if (values.length >= 181) resolve(values);
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    observer?.disconnect();
    const gaps = frames.slice(1).map((time, index) => time - frames[index]);
    const sorted = [...gaps].sort((a, b) => a - b);
    return {
      sampledFrames: gaps.length,
      durationMs: frames.at(-1) - frames[0],
      averageFrameMs: gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length,
      p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
      maxFrameMs: Math.max(...gaps),
      framesOver25Ms: gaps.filter((gap) => gap > 25).length,
      longTaskCount: longTasks.length,
      longestTaskMs: longTasks.length ? Math.max(...longTasks) : 0
    };
  });
  expect(performance.sampledFrames).toBe(180);
  expect(performance.p95FrameMs).toBeLessThan(20);
  expect(performance.maxFrameMs).toBeLessThan(25);
  expect(performance.framesOver25Ms).toBe(0);
  expect(performance.longTaskCount).toBe(0);

  const startedAt = Date.now();
  await page.keyboard.press("KeyC");
  await wait(INPUT_INTERVAL_MS);
  await page.keyboard.press("Enter");

  const chamberResults = [];
  for (let index = 0; index < chambers.length; index += 1) {
    const chamberStartedAt = Date.now();
    await wait(CHAMBER_SURVEY_MS);
    for (const key of chambers[index]) {
      await page.keyboard.press(key);
      await wait(INPUT_INTERVAL_MS);
    }
    await expect(canvas).toHaveAttribute("data-phase", "won");
    chamberResults.push({
      chamber: index + 1,
      actions: chambers[index].length,
      activeMs: Date.now() - chamberStartedAt,
      pulses: Number((await canvas.getAttribute("aria-label")).match(/(\d+) polarity flips/)?.[1])
    });
    if (index < chambers.length - 1) {
      await wait(RESULT_READ_MS);
      await page.keyboard.press("Enter");
    }
  }

  const completedAt = Date.now();
  await expect(canvas).toHaveAttribute("data-score", "53750");
  const campaignDurationMs = completedAt - startedAt;
  const pacingAssessment = campaignDurationMs < 180_000
    ? "below-target"
    : campaignDurationMs > 360_000 ? "above-target" : "within-target";
  const report = {
    measuredAt: new Date().toISOString(),
    viewport: { width: 1280, height: 720 },
    pacingModel: {
      inputIntervalMs: INPUT_INTERVAL_MS,
      chamberSurveyMs: CHAMBER_SURVEY_MS,
      resultReadMs: RESULT_READ_MS,
      maximumNoInputMs: CHAMBER_SURVEY_MS
    },
    campaign: {
      creditToFinalForgeMs: campaignDurationMs,
      totalActions: chambers.reduce((sum, actions) => sum + actions.length, 2),
      finalScore: Number(await canvas.getAttribute("data-score")),
      chambers: chamberResults,
      knownRouteTargetMs: { minimum: 180_000, maximum: 360_000 },
      pacingAssessment
    },
    performance: { ...performance, assessment: "pass" }
  };
  await writeFile(evidence, `${JSON.stringify(report, null, 2)}\n`, "utf8");
});
