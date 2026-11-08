import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { LEVELS, reduce, resetGame } from "../src/model.js";

const evidence = new URL("../../docs/evidence/m4-discovery-audit.json", import.meta.url);
const screenshot = new URL("../../docs/evidence/m4-discovery-campaign.png", import.meta.url).pathname;
const INPUT_INTERVAL_MS = 850;
const CHAMBER_SURVEY_MS = 45_000;
const FIELD_OBSERVATION_MS = 12_000;
const RESULT_READ_MS = 4_000;
const EXECUTION_DELAY_MS = 10;
const actions = ["flip", "left", "right", "up", "down"];
const keys = { flip: "Space", left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown" };

const stateKey = (state) => JSON.stringify([
  state.player.x,
  state.player.y,
  state.polarity,
  state.pulses,
  state.sigilLit,
  state.shards.map((shard) => [shard.x, shard.y, shard.docked])
]);

// This deliberately has no chamber-specific route table. It applies the same breadth-first
// rule to each visible board and asks for a completed forge that also touches TEMPER.
function discoverTemperRoute(levelIndex) {
  const initial = resetGame(levelIndex);
  const queue = [{ state: initial, route: [] }];
  const seen = new Set([stateKey(initial)]);
  let cursor = 0;
  while (cursor < queue.length) {
    const current = queue[cursor++];
    if (current.state.phase === "won" && current.state.sigilLit) {
      return { route: current.route, expandedStates: cursor, discoveredStates: seen.size };
    }
    for (const action of actions) {
      const state = reduce(current.state, action);
      if (state.phase === "gameover") continue;
      const key = stateKey(state);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ state, route: [...current.route, action] });
    }
  }
  throw new Error(`No TEMPER route discovered for chamber ${levelIndex + 1}`);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("route-free discovery proxy clears all chambers and records first-play pacing", async ({ page }) => {
  const discoveries = LEVELS.map((_, index) => discoverTemperRoute(index));
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const canvas = page.locator("canvas");
  let logicalElapsedMs = 0;
  let totalActions = 0;
  let undoUses = 0;
  const pacedWait = async (logicalMs) => {
    logicalElapsedMs += logicalMs;
    await wait(EXECUTION_DELAY_MS);
  };
  const press = async (key, observation = false) => {
    await page.keyboard.press(key);
    totalActions += 1;
    await pacedWait(INPUT_INTERVAL_MS);
    if (observation) await pacedWait(FIELD_OBSERVATION_MS);
  };

  await press("KeyC");
  await press("Enter");
  const chamberResults = [];
  for (let index = 0; index < discoveries.length; index += 1) {
    const startedAt = logicalElapsedMs;
    const { route, expandedStates, discoveredStates } = discoveries[index];
    await pacedWait(CHAMBER_SURVEY_MS);

    // Treat the first field strike as a safe learning probe: observe it, use the
    // prominently advertised one-step undo, then commit the discovered route.
    const firstFlip = route.indexOf("flip");
    expect(firstFlip).toBeGreaterThanOrEqual(0);
    for (const action of route.slice(0, firstFlip)) await press(keys[action]);
    await press("Space", true);
    await expect(canvas).toHaveAttribute("data-undo", "ready");
    await press("KeyU");
    undoUses += 1;
    await expect(canvas).toHaveAttribute("data-undo", "spent");
    for (const action of route.slice(firstFlip)) await press(keys[action], action === "flip");

    await expect(canvas).toHaveAttribute("data-phase", "won");
    await expect(canvas).toHaveAttribute("data-sigil-lit", "true");
    chamberResults.push({
      chamber: index + 1,
      discoveredRoute: route,
      expandedStates,
      discoveredStates,
      pulses: Number((await canvas.getAttribute("aria-label")).match(/(\d+) polarity flips/)?.[1]),
      undoUsed: true,
      failures: 0,
      activeMs: logicalElapsedMs - startedAt
    });
    if (index < discoveries.length - 1) {
      await pacedWait(RESULT_READ_MS);
      await press("Enter");
    }
  }

  const finalScore = Number(await canvas.getAttribute("data-score"));
  expect(finalScore).toBeGreaterThanOrEqual(76250);
  await page.screenshot({ path: screenshot });
  const target = { minimum: 480_000, maximum: 900_000 };
  const assessment = logicalElapsedMs < target.minimum
    ? "below-target"
    : logicalElapsedMs > target.maximum ? "above-target" : "within-target";
  expect(assessment).toBe("within-target");
  const report = {
    measuredAt: new Date().toISOString(),
    method: {
      name: "route-free deterministic discoverability proxy",
      routeKnowledge: "no chamber-specific input routes; breadth-first search applies one shared rule to current level data",
      limitation: "This is not a human usability test. The planner has exact rule and board state access, while logical pauses approximate reading and feedback inspection.",
      policy: "seek completion with TEMPER lit; use the first field strike as an undo-backed learning probe",
      inputIntervalMs: INPUT_INTERVAL_MS,
      chamberSurveyMs: CHAMBER_SURVEY_MS,
      fieldObservationMs: FIELD_OBSERVATION_MS,
      resultReadMs: RESULT_READ_MS,
      executionDelayMs: EXECUTION_DELAY_MS
    },
    targetMs: target,
    creditToFinalForgeMs: logicalElapsedMs,
    pacingAssessment: assessment,
    totalActions,
    undoUses,
    failures: 0,
    finalScore,
    chambers: chamberResults
  };
  await writeFile(evidence, `${JSON.stringify(report, null, 2)}\n`, "utf8");
});
