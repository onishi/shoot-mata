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
