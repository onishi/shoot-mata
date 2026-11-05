import { expect, test, type Page } from "@playwright/test";

const canvasFor = (page: Page) => page.locator("#game");

async function expectScreen(page: Page, screen: string): Promise<void> {
  await expect(canvasFor(page)).toHaveAttribute("data-screen", screen);
}

async function press(page: Page, key: string, count = 1): Promise<void> {
  for (let index = 0; index < count; index += 1) await page.keyboard.press(key);
}

async function stitch(page: Page, key: string, count: number): Promise<void> {
  await page.keyboard.down("Space");
  await press(page, key, count);
  await page.keyboard.up("Space");
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
  await expect(canvasFor(page)).toBeFocused();
});

test("panel brief pauses danger and the first move enters play", async ({ page }) => {
  await page.keyboard.press("Enter");
  await expectScreen(page, "playing");
  await expect(canvasFor(page)).toHaveAttribute("data-panel-brief", "true");
  await expect(canvasFor(page)).toHaveAttribute("data-tick", "0");
  await page.waitForTimeout(800);
  await expect(canvasFor(page)).toHaveAttribute("data-tick", "0");
  await page.screenshot({ path: "../docs/evidence/v8.1-panel-brief.png" });

  await page.keyboard.down("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.up("Space");
  await expect(canvasFor(page)).toHaveAttribute("data-panel-brief", "false");
  await expect(canvasFor(page)).toHaveAttribute("data-trail", "1");
  await page.screenshot({ path: "../docs/evidence/v8.1-first-stitch-coach.png" });
});

test("keyboard options persist sound and reduced motion across reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.keyboard.press("KeyO");
  await expectScreen(page, "settings");
  await expect(canvasFor(page)).toHaveAttribute("data-volume", "75");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("KeyM");
  await expect(canvasFor(page)).toHaveAttribute("data-volume", "50");
  await expect(canvasFor(page)).toHaveAttribute("data-reduced-motion", "true");
  await page.screenshot({ path: "../docs/evidence/m2-options.png" });
  await page.keyboard.press("Escape");
  await expectScreen(page, "title");

  await page.reload();
  await expect(canvasFor(page)).toBeFocused();
  await expect(canvasFor(page)).toHaveAttribute("data-volume", "50");
  await expect(canvasFor(page)).toHaveAttribute("data-reduced-motion", "true");
  await page.keyboard.press("Enter");
  await expectScreen(page, "playing");
  await page.keyboard.press("KeyO");
  await expectScreen(page, "settings");
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await expectScreen(page, "playing");
  expect(errors).toEqual([]);
});

test("campaign progress offers continue or panel one and recovers from damaged storage", async ({ page }) => {
  await page.keyboard.press("Enter");
  await stitch(page, "ArrowRight", 19);
  await press(page, "ArrowUp", 2);
  await stitch(page, "ArrowLeft", 19);
  await expectScreen(page, "won");
  await expect(canvasFor(page)).toHaveAttribute("data-highest-unlocked", "2");

  await page.reload();
  await expectScreen(page, "title");
  await expect(canvasFor(page)).toHaveAttribute("data-title-choice", "continue");
  await page.keyboard.press("Enter");
  await expectScreen(page, "playing");
  await expect(canvasFor(page)).toHaveAttribute("data-level", "2");

  await page.reload();
  await page.keyboard.press("ArrowDown");
  await expect(canvasFor(page)).toHaveAttribute("data-title-choice", "new");
  await page.keyboard.press("Enter");
  await expect(canvasFor(page)).toHaveAttribute("data-level", "1");

  await page.evaluate(() => localStorage.setItem("duskloom.progress.v1", "damaged"));
  await page.reload();
  await expect(canvasFor(page)).toHaveAttribute("data-highest-unlocked", "1");
  await expect(canvasFor(page)).toHaveAttribute("data-title-choice", "new");
});

test("title, exposed thread, six-panel campaign, ending, and pause are visible in Chrome", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await expectScreen(page, "title");
  await page.screenshot({ path: "../docs/evidence/m1-title.png" });
  await page.keyboard.press("Enter");
  await expectScreen(page, "playing");

  await stitch(page, "ArrowRight", 8);
  await expect(canvasFor(page)).toHaveAttribute("data-trail", "8");
  await page.screenshot({ path: "../docs/evidence/m1-thread-exposed.png" });
  await page.keyboard.press("KeyR");
  await stitch(page, "ArrowRight", 19);
  await expect(canvasFor(page)).toHaveAttribute("data-trail", "0");
  await expect(canvasFor(page)).toHaveAttribute("data-repaired", "61");
  await page.screenshot({ path: "../docs/evidence/m1-area-repaired.png" });

  await press(page, "ArrowUp", 2);
  await stitch(page, "ArrowLeft", 19);
  await expectScreen(page, "won");
  await page.screenshot({ path: "../docs/evidence/m1-night-mended.png" });
  await page.keyboard.press("Enter");
  await expectScreen(page, "playing");
  await expect(canvasFor(page)).toHaveAttribute("data-level", "2");
  await expect(canvasFor(page)).toHaveAttribute("data-moths", "2");
  await page.screenshot({ path: "../docs/evidence/m2-crossed-shuttles.png" });

  await stitch(page, "ArrowRight", 19);
  await press(page, "ArrowUp", 2);
  await stitch(page, "ArrowLeft", 19);
  await press(page, "ArrowDown", 6);
  await stitch(page, "ArrowRight", 19);
  await press(page, "ArrowUp", 9);
  await stitch(page, "ArrowLeft", 19);
  await expectScreen(page, "won");
  await page.keyboard.press("Enter");
  await expectScreen(page, "playing");
  await expect(canvasFor(page)).toHaveAttribute("data-level", "3");
  await expect(canvasFor(page)).toHaveAttribute("data-moths", "1");
  await expect(canvasFor(page)).toHaveAttribute("data-repaired", "28");
  await page.screenshot({ path: "../docs/evidence/m2-looms-eye.png" });
  await page.keyboard.press("Escape");
  await expectScreen(page, "paused");
  await page.keyboard.press("Escape");
  await expectScreen(page, "playing");

  await stitch(page, "ArrowRight", 8);
  await press(page, "ArrowRight", 3);
  await stitch(page, "ArrowRight", 8);
  await expect(canvasFor(page)).toHaveAttribute("data-repaired", "64");
  await press(page, "ArrowUp", 2);
  await stitch(page, "ArrowLeft", 8);
  await expectScreen(page, "won");
  await page.screenshot({ path: "../docs/evidence/m2-three-panel-complete.png" });
  await expect(canvasFor(page)).toHaveAttribute("data-campaign-complete", "false");
  await page.keyboard.press("Enter");
  await expect(canvasFor(page)).toHaveAttribute("data-level", "4");
  await expect(canvasFor(page)).toHaveAttribute("data-hazard", "dormant");
  await stitch(page, "ArrowRight", 19);
  await press(page, "ArrowUp", 2);
  await stitch(page, "ArrowLeft", 19);
  await expectScreen(page, "won");
  await page.screenshot({ path: "../docs/evidence/m3-four-panel-complete.png" });
  await expect(canvasFor(page)).toHaveAttribute("data-campaign-complete", "false");
  await page.keyboard.press("Enter");
  await expect(canvasFor(page)).toHaveAttribute("data-level", "5");
  await expect(canvasFor(page)).toHaveAttribute("data-grain", "directional");
  await stitch(page, "ArrowDown", 13);
  await press(page, "ArrowRight", 6);
  await stitch(page, "ArrowUp", 13);
  await expectScreen(page, "won");
  await page.screenshot({ path: "../docs/evidence/m3-five-panel-complete.png" });
  await expect(canvasFor(page)).toHaveAttribute("data-campaign-complete", "false");
  await page.keyboard.press("Enter");
  await expect(canvasFor(page)).toHaveAttribute("data-level", "6");
  await expect(canvasFor(page)).toHaveAttribute("data-grain", "directional");
  await expect(canvasFor(page)).toHaveAttribute("data-hazard-column", "6");
  await page.screenshot({ path: "../docs/evidence/m3-dawn-sampler.png" });
  await stitch(page, "ArrowDown", 5);
  await press(page, "ArrowDown", 3);
  await stitch(page, "ArrowDown", 5);
  await press(page, "ArrowUp", 6);
  await press(page, "ArrowLeft");
  await stitch(page, "ArrowLeft", 8);
  await expectScreen(page, "won");
  await expect(canvasFor(page)).toHaveAttribute("data-campaign-complete", "true");
  await page.screenshot({ path: "../docs/evidence/m3-night-rewoven.png" });
  await page.keyboard.press("Enter");
  await expectScreen(page, "title");
  await expect(canvasFor(page)).toHaveAttribute("data-title-choice", "continue");
  await page.screenshot({ path: "../docs/evidence/m2-campaign-continue.png" });
  await page.reload();
  await expect(canvasFor(page)).toHaveAttribute("data-campaign-complete", "true");
  await page.keyboard.press("Enter");
  await expect(canvasFor(page)).toHaveAttribute("data-level", "6");
  expect(errors).toEqual([]);
});

test("the fourth panel telegraphs its flash needle before burning thread", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("duskloom.progress.v1", JSON.stringify({ highestUnlocked: 3, completed: false })));
  await page.reload();
  await expect(canvasFor(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(canvasFor(page)).toHaveAttribute("data-level", "4");
  await expect(canvasFor(page)).toHaveAttribute("data-panel-brief", "true");
  await page.keyboard.press("ArrowDown");
  await expect(canvasFor(page)).toHaveAttribute("data-panel-brief", "false");
  await expect(canvasFor(page)).toHaveAttribute("data-hazard", "warning", { timeout: 4000 });
  await expect(canvasFor(page)).toHaveAttribute("data-hazard-column", "6");
  await stitch(page, "ArrowRight", 5);
  await page.screenshot({ path: "../docs/evidence/m3-flash-needle-warning.png" });
  await expect(canvasFor(page)).toHaveAttribute("data-hazard", "active", { timeout: 2000 });
  await expect(canvasFor(page)).toHaveAttribute("data-spools", "2");
  await page.screenshot({ path: "../docs/evidence/m3-flash-needle-strike.png" });
});

test("the fifth panel explains and enforces its directional grain", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("duskloom.progress.v1", JSON.stringify({ highestUnlocked: 4, completed: false })));
  await page.reload();
  await page.keyboard.press("Enter");
  await expect(canvasFor(page)).toHaveAttribute("data-level", "5");
  await expect(canvasFor(page)).toHaveAttribute("data-grain", "directional");
  await stitch(page, "ArrowDown", 1);
  await stitch(page, "ArrowRight", 1);
  await expect(canvasFor(page)).toHaveAttribute("data-last-event", "grain");
  await expect(canvasFor(page)).toHaveAttribute("data-trail", "1");
  await page.screenshot({ path: "../docs/evidence/m3-warp-gate-grain.png" });
  await page.keyboard.press("KeyR");
  await stitch(page, "ArrowDown", 13);
  await press(page, "ArrowRight", 6);
  await stitch(page, "ArrowUp", 13);
  await expectScreen(page, "won");
});

test("the final panel combines the island, grain, and telegraphed needle", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("duskloom.progress.v1", JSON.stringify({ highestUnlocked: 5, completed: false })));
  await page.reload();
  await page.keyboard.press("Enter");
  await expect(canvasFor(page)).toHaveAttribute("data-level", "6");
  await expect(canvasFor(page)).toHaveAttribute("data-repaired", "28");
  await stitch(page, "ArrowDown", 1);
  await stitch(page, "ArrowRight", 1);
  await expect(canvasFor(page)).toHaveAttribute("data-last-event", "grain");
  await expect(canvasFor(page)).toHaveAttribute("data-hazard", "warning", { timeout: 4000 });
  await page.screenshot({ path: "../docs/evidence/m3-dawn-sampler-warning.png" });

  await page.keyboard.press("KeyR");
  await stitch(page, "ArrowDown", 5);
  await press(page, "ArrowDown", 3);
  await stitch(page, "ArrowDown", 5);
  await press(page, "ArrowUp", 6);
  await press(page, "ArrowLeft");
  await stitch(page, "ArrowLeft", 8);
  await expectScreen(page, "won");
});

test("the unraveller cuts exposed thread and can exhaust every spool", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.keyboard.press("Enter");
  await stitch(page, "ArrowRight", 11);
  await expect(canvasFor(page)).toHaveAttribute("data-trail", "11");
  await page.waitForTimeout(380);
  await stitch(page, "ArrowRight", 1);
  await expect(canvasFor(page)).toHaveAttribute("data-spools", "2");

  await stitch(page, "ArrowRight", 12);
  await expect(canvasFor(page)).toHaveAttribute("data-spools", "1");
  await stitch(page, "ArrowRight", 12);
  await expectScreen(page, "lost");
  await expect(canvasFor(page)).toHaveAttribute("data-spools", "0");
  await page.screenshot({ path: "../docs/evidence/m1-thread-undone.png" });
  await page.keyboard.press("Enter");
  await expectScreen(page, "playing");
  await expect(canvasFor(page)).toHaveAttribute("data-spools", "3");
  expect(errors).toEqual([]);
});

test("required viewports, keyboard states, accessible names, and frame pacing pass", async ({ page }) => {
  for (const viewport of [
    { width: 1280, height: 720, name: "1280x720" },
    { width: 640, height: 800, name: "640x800" },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expect(canvasFor(page)).toBeFocused();
    await expectContained(page, "#game", viewport);
    const canvasBounds = await canvasFor(page).boundingBox();
    expect(canvasBounds!.width / canvasBounds!.height).toBeCloseTo(16 / 9, 2);
    await expect(canvasFor(page)).toHaveAttribute("aria-label", /DUSKLOOM title/);
    await page.screenshot({ path: `../docs/evidence/m4-title-${viewport.name}.png` });

    await page.keyboard.press("KeyO");
    await expectScreen(page, "settings");
    await expect(canvasFor(page)).toBeFocused();
    await expect(canvasFor(page)).toHaveAttribute("aria-label", /Options\. Sound volume 75 percent/);
    await expectContained(page, "#game", viewport);
    await page.screenshot({ path: `../docs/evidence/m4-options-${viewport.name}.png` });
    await page.keyboard.press("Escape");
    await page.keyboard.press("Enter");
    await expect(canvasFor(page)).toHaveAttribute("aria-label", /Panel 1 of 6, FIRST LIGHT\. Hold Space while moving into the dark/);
    await page.keyboard.press("ArrowDown");
    await expect(canvasFor(page)).toHaveAttribute("aria-label", /playing\. Panel 1 of 6, FIRST LIGHT/);
    await page.keyboard.press("Escape");
    await expectScreen(page, "paused");
    await expect(canvasFor(page)).toHaveAttribute("aria-label", /paused\. Panel 1 of 6/);
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
