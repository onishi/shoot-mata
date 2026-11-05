import { test, expect } from "@playwright/test";

async function state(page) {
  return page.evaluate(() => window.__SIGNAL_GARDEN__);
}

async function waitForNode(page, node, timeout = 12_000) {
  await expect.poll(async () => (await state(page)).node, { timeout }).toBe(node);
}

test("keyboard route opens all flowers, loops, and reaches the receiver", async ({ page }) => {
  test.setTimeout(55_000);
  const messages = [];
  page.on("console", (message) => { if (["error", "warning"].includes(message.type())) messages.push(message.text()); });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("aria-label", /title/i);
  await page.screenshot({ path: "../docs/evidence/m1-title.png" });
  await canvas.press("Enter");

  await canvas.press("ArrowRight");
  await canvas.press("Space");
  await canvas.press("ArrowRight");
  await canvas.press("Space");
  await waitForNode(page, "returnA");
  await page.screenshot({ path: "../docs/evidence/m1-two-flowers-return.png" });

  await canvas.press("ArrowRight");
  await canvas.press("Space");
  await waitForNode(page, "rain");

  await canvas.press("ArrowLeft");
  await canvas.press("Space");
  await expect.poll(async () => (await state(page)).phase, { timeout: 15_000 }).toBe("gardenWon");
  expect((await state(page)).blooms).toEqual({ moon: true, rain: true, bell: true });
  await page.screenshot({ path: "../docs/evidence/m1-won.png" });

  await canvas.press("Enter");
  await expect.poll(async () => (await state(page)).garden).toBe(1);
  await canvas.press("ArrowRight");
  await canvas.press("Space");
  await canvas.press("ArrowRight");
  await canvas.press("Space");
  await expect.poll(async () => (await state(page)).pendingSwitches[2]).toEqual({ value: 1, remaining: 2 });
  await page.screenshot({ path: "../docs/evidence/m2-sleeping-crown-pending.png" });
  await waitForNode(page, "returnA");

  await canvas.press("ArrowRight");
  await canvas.press("Space");
  await canvas.press("ArrowLeft");
  await canvas.press("Space");
  await waitForNode(page, "rain");
  await expect.poll(async () => (await state(page)).switches[2]).toBe(0);
  await expect.poll(async () => (await state(page)).phase, { timeout: 15_000 }).toBe("won");
  await page.screenshot({ path: "../docs/evidence/m2-second-garden-won.png" });
  expect(messages).toEqual([]);
});

test("unsafe default route loses lives and R resets", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await canvas.press("Enter");
  await expect.poll(async () => (await state(page)).lives, { timeout: 10_000 }).toBe(2);
  await page.screenshot({ path: "../docs/evidence/m1-strike-reset.png" });
  await canvas.press("r");
  await expect.poll(async () => (await state(page)).lives).toBe(3);
  expect((await state(page)).node).toBe("root");
});

test("pause stops the flow and resumes with Escape", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await canvas.press("Enter");
  await canvas.press("Escape");
  const before = await state(page);
  await page.waitForTimeout(1200);
  const after = await state(page);
  expect(after.phase).toBe("paused");
  expect(after.node).toBe(before.node);
  await canvas.press("Escape");
  await expect.poll(async () => (await state(page)).phase).toBe("playing");
});
