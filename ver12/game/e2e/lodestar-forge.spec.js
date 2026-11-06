import { expect, test } from "@playwright/test";

const evidence = (name) => new URL(`../../docs/evidence/${name}`, import.meta.url).pathname;

test("title, polarity feedback, pause, and reset are keyboard reachable", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-phase", "title");
  await expect(canvas).toHaveAttribute("aria-label", /Press Enter/);
  await page.screenshot({ path: evidence("m1-title.png") });

  await page.keyboard.press("Enter");
  await expect(canvas).toHaveAttribute("data-phase", "playing");
  await page.keyboard.press("Space");
  await expect(canvas).toHaveAttribute("data-polarity", "push");
  await expect(canvas).toHaveAttribute("data-docked", "2");
  await page.screenshot({ path: evidence("m1-first-field.png") });

  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-phase", "paused");
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyR");
  await expect(canvas).toHaveAttribute("data-docked", "0");
  expect(errors).toEqual([]);
});

test("real key sequence completes the first mold", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  for (const key of ["ArrowLeft", "ArrowLeft", "ArrowDown", "ArrowDown", "Space"]) {
    await page.keyboard.press(key);
  }
  await expect(canvas).toHaveAttribute("data-phase", "won");
  await expect(canvas).toHaveAttribute("data-docked", "3");
  await expect(canvas).toHaveAttribute("aria-label", /Forge complete.*2 polarity flips/);
  await page.screenshot({ path: evidence("m1-won.png") });
  await page.keyboard.press("Enter");
  await expect(canvas).toHaveAttribute("data-phase", "playing");
  await expect(canvas).toHaveAttribute("data-docked", "0");
});
