import { expect, test, type Page } from "@playwright/test";

const canvasFor = (page: Page) => page.locator("#game");

async function expectScreen(page: Page, screen: string): Promise<void> {
  await expect(canvasFor(page)).toHaveAttribute("data-screen", screen);
}

async function press(page: Page, key: string, count = 1): Promise<void> {
  for (let index = 0; index < count; index += 1) await page.keyboard.press(key);
}

async function clearDeadLetter(page: Page): Promise<void> {
  await page.keyboard.press("Enter");
  await expectScreen(page, "playing");
  await press(page, "ArrowRight", 2);
  await page.keyboard.press("Enter");
  await press(page, "ArrowRight", 8);
  await expectScreen(page, "won");
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /DEAD LETTER delivered/);
}

async function record(page: Page, actions: string[]): Promise<void> {
  for (const action of actions) await page.keyboard.press(action);
  await page.keyboard.press("Enter");
}

async function deliver(page: Page, rightSteps: number): Promise<void> {
  await press(page, "ArrowRight", rightSteps);
  await expectScreen(page, "won");
  await page.keyboard.press("Enter");
}

async function expectContained(page: Page, selector: string, viewport: { width: number; height: number }): Promise<void> {
  const bounds = await page.locator(selector).boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("first-file guidance, one-beat undo, and echo ledger support discovery", async ({ page }) => {
  await page.keyboard.press("Enter");
  await expectScreen(page, "playing");
  await page.screenshot({ path: "../docs/evidence/v7.1-guidance-step-1.png" });
  await press(page, "ArrowRight", 2);
  await expect(canvasFor(page)).toHaveAttribute("data-turn", "2");
  await page.screenshot({ path: "../docs/evidence/v7.1-guidance-step-2.png" });
  await page.keyboard.press("KeyZ");
  await expect(canvasFor(page)).toHaveAttribute("data-turn", "1");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /1 echoes filed/);
  await page.keyboard.press("ArrowRight");
  await expect(canvasFor(page)).toHaveAttribute("data-turn", "1");
  await page.keyboard.press("KeyZ");
  await expect(canvasFor(page)).toHaveAttribute("data-turn", "0");
  await press(page, "ArrowRight", 2);
  await expect(canvasFor(page)).toHaveAttribute("data-gate", "open");
  await page.screenshot({ path: "../docs/evidence/v7.1-guidance-ledger.png" });
});

test("initial title and settings persist after reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await expectScreen(page, "title");
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /Selected DEAD LETTER, file 1 of 1 unlocked/);
  await page.screenshot({ path: "../docs/evidence/m2-e2e-title.png" });

  await page.keyboard.press("KeyS");
  await expect(canvasFor(page)).toBeFocused();
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /Settings\. Volume 75 percent\. High contrast off\. Reduced motion off/);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /Volume 100 percent\. High contrast on\. Reduced motion on/);
  await page.screenshot({ path: "../docs/evidence/m2-e2e-settings.png" });
  await page.keyboard.press("Escape");
  await page.reload();

  await page.keyboard.press("KeyS");
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /Volume 100 percent\. High contrast on\. Reduced motion on/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("palimpsest-post-v1") ?? "null"));
  expect(saved).toEqual({ unlockedLevel: 0, volume: 100, highContrast: true, reduceMotion: true });
  expect(errors).toEqual([]);
});

test("clearing the first file unlocks and preserves the second file", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await clearDeadLetter(page);
  await page.screenshot({ path: "../docs/evidence/m2-e2e-dead-letter-won.png" });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("palimpsest-post-v1") ?? "null"))).toMatchObject({ unlockedLevel: 1 });

  await page.reload();
  await expectScreen(page, "title");
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /Selected MOVING DEADLINE, file 2 of 2 unlocked/);
  await page.keyboard.press("ArrowLeft");
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /Selected DEAD LETTER/);
  await page.keyboard.press("ArrowRight");
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /Selected MOVING DEADLINE/);
  await page.keyboard.press("Enter");
  await expectScreen(page, "playing");
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /MOVING DEADLINE\. Turn 0/);
  expect(errors).toEqual([]);
});

test("two filed echoes synchronize CARBON COPIES and complete the file", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.evaluate(() => localStorage.setItem("palimpsest-post-v1", JSON.stringify({
    unlockedLevel: 3,
    volume: 0,
    highContrast: false,
    reduceMotion: true,
  })));
  await page.reload();
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /Selected CARBON COPIES, file 4 of 4 unlocked/);
  await page.keyboard.press("Enter");

  for (const key of ["ArrowUp", "ArrowUp", "ArrowRight", "ArrowRight", "Space", "Space", "ArrowRight", "ArrowRight"]) {
    await page.keyboard.press(key);
  }
  await page.keyboard.press("Enter");
  for (const key of ["ArrowDown", "ArrowDown", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight"]) {
    await page.keyboard.press(key);
  }
  await page.keyboard.press("Enter");
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /2 echoes filed/);
  await press(page, "ArrowRight", 7);
  await expect(canvasFor(page)).toHaveAttribute("data-gate", "open");
  await page.screenshot({ path: "../docs/evidence/m3-carbon-copies-synchronized.png" });
  await press(page, "ArrowRight", 2);
  await expectScreen(page, "won");
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /CARBON COPIES delivered/);
  await page.screenshot({ path: "../docs/evidence/m3-carbon-copies-won.png" });
  expect(errors).toEqual([]);
});

test("a filed echo crosses copy paper that blocks the original", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.evaluate(() => localStorage.setItem("palimpsest-post-v1", JSON.stringify({
    unlockedLevel: 4,
    volume: 0,
    highContrast: false,
    reduceMotion: true,
  })));
  await page.reload();
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /Selected AUTHORIZED COPY, file 5 of 5 unlocked/);
  await page.keyboard.press("Enter");
  for (const key of ["ArrowUp", "ArrowUp", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight"]) {
    await page.keyboard.press(key);
  }
  await page.keyboard.press("Enter");
  await press(page, "ArrowRight", 4);
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /Turn 4/);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "../docs/evidence/m3-authorized-copy-crossing.png" });
  await press(page, "ArrowRight", 3);
  await expect(canvasFor(page)).toHaveAttribute("data-gate", "open");
  await page.waitForTimeout(100);
  await page.screenshot({ path: "../docs/evidence/m3-authorized-copy-open.png" });
  await press(page, "ArrowRight", 2);
  await expectScreen(page, "won");
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /AUTHORIZED COPY delivered/);
  expect(errors).toEqual([]);
});

test("the final audit synchronizes two copies and closes the archive", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.evaluate(() => localStorage.setItem("palimpsest-post-v1", JSON.stringify({
    unlockedLevel: 5,
    volume: 0,
    highContrast: false,
    reduceMotion: true,
  })));
  await page.reload();
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /Selected FINAL AUDIT, file 6 of 6 unlocked/);
  await page.keyboard.press("Enter");

  for (const key of ["ArrowUp", "ArrowUp", "ArrowRight", "ArrowRight", "ArrowRight", "Space", "ArrowRight", "ArrowRight"]) {
    await page.keyboard.press(key);
  }
  await page.keyboard.press("Enter");
  for (const key of ["ArrowDown", "ArrowDown", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight"]) {
    await page.keyboard.press(key);
  }
  await page.keyboard.press("Enter");
  await press(page, "ArrowRight", 7);
  await expect(canvasFor(page)).toHaveAttribute("data-gate", "open");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "../docs/evidence/m3-final-audit-synchronized.png" });
  await press(page, "ArrowRight", 2);
  await expectScreen(page, "won");
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /Night archive complete/);
  await page.waitForTimeout(100);
  await page.screenshot({ path: "../docs/evidence/m3-final-audit-complete.png" });

  await page.keyboard.press("Enter");
  await expectScreen(page, "title");
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /Selected FINAL AUDIT, file 6 of 6 unlocked/);
  expect(errors).toEqual([]);
});

test("a fresh archive can clear all six files without injected progress", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.keyboard.press("Enter");

  await record(page, ["ArrowRight", "ArrowRight"]);
  await deliver(page, 8);
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /MOVING DEADLINE/);

  await record(page, ["ArrowUp", "ArrowUp", ...Array(5).fill("ArrowRight")]);
  await deliver(page, 8);
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /MISSING MINUTE/);

  await record(page, ["ArrowUp", "ArrowUp", "Space", ...Array(5).fill("ArrowRight")]);
  await deliver(page, 9);
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /CARBON COPIES/);

  await record(page, ["ArrowUp", "ArrowUp", "ArrowRight", "ArrowRight", "Space", "Space", "ArrowRight", "ArrowRight"]);
  await record(page, ["ArrowDown", "ArrowDown", ...Array(6).fill("ArrowRight")]);
  await deliver(page, 9);
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /AUTHORIZED COPY/);

  await record(page, ["ArrowUp", "ArrowUp", ...Array(6).fill("ArrowRight")]);
  await deliver(page, 9);
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /FINAL AUDIT/);

  await record(page, ["ArrowUp", "ArrowUp", "ArrowRight", "ArrowRight", "ArrowRight", "Space", "ArrowRight", "ArrowRight"]);
  await record(page, ["ArrowDown", "ArrowDown", ...Array(6).fill("ArrowRight")]);
  await press(page, "ArrowRight", 9);
  await expectScreen(page, "won");
  await expect(canvasFor(page)).toHaveAttribute("aria-label", /Night archive complete/);
  await page.screenshot({ path: "../docs/evidence/m4-complete-through.png" });

  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("palimpsest-post-v1") ?? "null"))).toMatchObject({ unlockedLevel: 5 });
  expect(errors).toEqual([]);
});

test("required viewports, keyboard states, and representative frame pacing pass", async ({ page }) => {
  for (const viewport of [
    { width: 1280, height: 720, name: "1280x720" },
    { width: 640, height: 800, name: "640x800" },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expectContained(page, "#game", viewport);
    const canvasBounds = await canvasFor(page).boundingBox();
    expect(canvasBounds!.width / canvasBounds!.height).toBeCloseTo(16 / 9, 2);
    await page.screenshot({ path: `../docs/evidence/m4-title-${viewport.name}.png` });

    await page.keyboard.press("KeyS");
    await expect(canvasFor(page)).toBeFocused();
    await expect(canvasFor(page)).toHaveAttribute("aria-label", /Settings\. Volume 75 percent/);
    await expectContained(page, "#game", viewport);
    await page.screenshot({ path: `../docs/evidence/m4-settings-${viewport.name}.png` });
    await page.keyboard.press("Escape");
    await page.keyboard.press("Enter");
    await expect(canvasFor(page)).toHaveAttribute("aria-label", /DEAD LETTER\. Turn 0/);
    await page.keyboard.press("Escape");
    await expectScreen(page, "paused");
    await expect(canvasFor(page)).toHaveAttribute("aria-label", /paused\. Press Escape to resume or R to restart/);
    await page.screenshot({ path: `../docs/evidence/m4-paused-${viewport.name}.png` });
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.reload();
  const frameIntervals = await page.evaluate(() => new Promise<number[]>((resolve) => {
    const intervals: number[] = [];
    let previous = performance.now();
    const sample = (now: number) => {
      intervals.push(now - previous);
      previous = now;
      if (intervals.length === 120) resolve(intervals.slice(5));
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  const ordered = [...frameIntervals].sort((left, right) => left - right);
  const p95 = ordered[Math.floor(ordered.length * 0.95)];
  expect(p95).toBeLessThan(35);
});
