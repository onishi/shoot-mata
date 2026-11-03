import { expect, test, type Page } from "@playwright/test";

const canvasFor = (page: Page) => page.locator("#game");

async function expectState(page: Page, state: string, stage?: string): Promise<void> {
  await expect(canvasFor(page)).toHaveAttribute("data-game-state", state);
  if (stage) await expect(canvasFor(page)).toHaveAttribute("data-stage", stage);
}

async function advance(page: Page, milliseconds: number): Promise<void> {
  await page.clock.runFor(milliseconds);
}

async function pulseAt(page: Page, elapsed: number, target: number): Promise<number> {
  await advance(page, target - elapsed);
  await page.keyboard.press("Space");
  return target;
}

async function holdFirstRain(page: Page): Promise<void> {
  let elapsed = 0;
  for (const target of [2_200, 7_600, 12_700]) elapsed = await pulseAt(page, elapsed, target);
  await advance(page, 18_100 - elapsed);
  await expectState(page, "won", "first-rain");
  await expect(canvasFor(page)).toHaveAttribute("data-health", "3");
}

async function holdShoreCall(page: Page): Promise<void> {
  await page.keyboard.press("Enter");
  await expectState(page, "playing", "shore-call");
  await advance(page, 2_200);
  await page.keyboard.press("Space");
  await advance(page, 50);
  await page.keyboard.down("ArrowDown");
  await advance(page, 2_250);
  await page.keyboard.up("ArrowDown");
  await page.keyboard.down("ArrowUp");
  await advance(page, 1_400);
  await page.keyboard.up("ArrowUp");
  await advance(page, 700);
  await page.keyboard.press("Space");
  await advance(page, 4_400);
  await page.keyboard.press("Space");
  await advance(page, 4_400);
  await page.keyboard.press("Space");
  await advance(page, 6_700);
  await expectState(page, "won", "shore-call");
  await expect(canvasFor(page)).toHaveAttribute("data-health", "3");
  await expect(canvasFor(page)).toHaveAttribute("data-score", "10");
}

async function holdSplitCurrent(page: Page): Promise<void> {
  await page.keyboard.press("Enter");
  await expectState(page, "playing", "split-current");
  await advance(page, 1_150);
  await page.keyboard.press("Space");
  await advance(page, 5_000);
  await page.keyboard.press("Space");
  await advance(page, 5_950);
  await expectState(page, "won", "split-current");
  await expect(canvasFor(page)).toHaveAttribute("data-health", "3");
  await expect(canvasFor(page)).toHaveAttribute("data-score", "6");
  await expect(canvasFor(page)).toHaveAttribute("data-charges", "1");
}

async function holdReedGate(page: Page): Promise<void> {
  await page.keyboard.press("Enter");
  await expectState(page, "playing", "reed-gate");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowUp");
  await advance(page, 1_200);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("ArrowUp");
  await advance(page, 800);
  await page.keyboard.press("Space");
  await advance(page, 600);
  await page.screenshot({ path: "../docs/evidence/m3-reed-gate-playing.png" });
  await advance(page, 4_600);
  await page.keyboard.press("Space");
  await advance(page, 6_900);
  await expectState(page, "won", "reed-gate");
  await expect(canvasFor(page)).toHaveAttribute("data-health", "3");
  await expect(canvasFor(page)).toHaveAttribute("data-score", "6");
}

async function expectContained(page: Page, selector: string, viewport: { width: number; height: number }): Promise<void> {
  const box = await page.locator(selector).boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("keyboard campaign covers pause, representative loss, and all four wins", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await expectState(page, "title", "first-rain");
  await page.keyboard.press("Enter");
  await expectState(page, "playing", "first-rain");
  await page.keyboard.press("Escape");
  await expectState(page, "paused", "first-rain");
  await advance(page, 2_000);
  await expect(canvasFor(page)).toHaveAttribute("data-health", "3");
  await page.keyboard.press("Escape");

  await advance(page, 18_100);
  await expectState(page, "lost", "first-rain");
  await expect(canvasFor(page)).toHaveAttribute("data-health", "0");
  await page.keyboard.press("Enter");
  await holdFirstRain(page);
  await holdShoreCall(page);
  await holdSplitCurrent(page);
  await holdReedGate(page);

  await page.screenshot({ path: "../docs/evidence/m3-reed-gate-complete.png" });
  expect(errors).toEqual([]);
});

test("settings persist through reload using keyboard controls", async ({ page }) => {
  await page.keyboard.press("KeyS");
  await expectState(page, "settings");
  await expect(page.locator("#volume")).toBeFocused();
  for (let index = 0; index < 4; index += 1) await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");

  await expect(page.locator("#volume-value")).toHaveText("30%");
  await expect(page.locator("#high-contrast")).toBeChecked();
  await expect(page.locator("#reduced-motion")).toBeChecked();
  await page.keyboard.press("KeyS");
  await expectState(page, "title");
  await page.reload();

  await expect(canvasFor(page)).toHaveAttribute("data-high-contrast", "true");
  await expect(canvasFor(page)).toHaveAttribute("data-reduced-motion", "true");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("ripplekeep:v6:settings") ?? "null"));
  expect(stored).toEqual({ volume: 30, highContrast: true, reducedMotion: true });
});

test("title, settings, play, and pause remain contained in both required viewports", async ({ page }) => {
  for (const viewport of [
    { width: 1280, height: 720, name: "1280x720" },
    { width: 640, height: 800, name: "640x800" }
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expectContained(page, "#game", viewport);
    const canvas = await canvasFor(page).boundingBox();
    expect(canvas!.width / canvas!.height).toBeCloseTo(16 / 9, 2);
    await page.screenshot({ path: `../docs/evidence/m2-e2e-title-${viewport.name}.png` });

    await page.keyboard.press("KeyS");
    await expectState(page, "settings");
    await expectContained(page, ".settings-card", viewport);
    await page.screenshot({ path: `../docs/evidence/m2-e2e-settings-${viewport.name}.png` });
    await page.keyboard.press("KeyS");
    await page.keyboard.press("Enter");
    await expectState(page, "playing", "first-rain");
    await expectContained(page, "#game", viewport);
    await page.keyboard.press("Escape");
    await expectState(page, "paused", "first-rain");
    await expect(page.locator("#controls")).toContainText("Escape: resume");
    await page.screenshot({ path: `../docs/evidence/m2-e2e-paused-${viewport.name}.png` });
  }
});
