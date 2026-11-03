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

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
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
