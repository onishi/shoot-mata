import { expect, test } from "@playwright/test";

const evidence = (name) => new URL(`../../docs/evidence/${name}`, import.meta.url).pathname;

const insertCoinAndStart = async (page) => {
  await page.keyboard.press("KeyC");
  await page.keyboard.press("Enter");
};

test("attract, credit, polarity feedback, pause, and reset are keyboard reachable", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-phase", "attract");
  await expect(canvas).toHaveAttribute("aria-label", /insert coin/i);
  await page.screenshot({ path: evidence("m4-attract.png") });
  await page.keyboard.press("KeyC");
  await expect(canvas).toHaveAttribute("data-phase", "ready");
  await expect(canvas).toHaveAttribute("data-credits", "1");
  await page.screenshot({ path: evidence("m4-credit-ready.png") });

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

test("a fresh credit reaches field feedback inside ten seconds and a clear inside thirty", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const canvas = page.locator("canvas");
  const startedAt = Date.now();
  await insertCoinAndStart(page);
  await page.keyboard.press("Space");
  expect(Date.now() - startedAt).toBeLessThan(10_000);
  await expect(canvas).toHaveAttribute("data-polarity", "push");
  await expect(canvas).toHaveAttribute("data-docked", "2");
  for (const key of ["ArrowLeft", "ArrowLeft", "ArrowDown", "ArrowDown", "Space"]) await page.keyboard.press(key);
  expect(Date.now() - startedAt).toBeLessThan(30_000);
  await expect(canvas).toHaveAttribute("data-phase", "won");
  await expect(canvas).toHaveAttribute("data-score", "9500");
  await page.screenshot({ path: evidence("m4-first-clear-score.png") });
});

test("the first field remains legible in a 640 by 480 cabinet viewport", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 480 });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await insertCoinAndStart(page);
  await page.keyboard.press("Space");
  await expect(canvas).toHaveAttribute("data-docked", "2");
  const box = await canvas.boundingBox();
  expect(box.width).toBeLessThanOrEqual(640);
  expect(Math.abs(box.width / box.height - 4 / 3)).toBeLessThan(0.01);
  await page.screenshot({ path: evidence("m4-first-field-640x480.png") });
});

test("real key sequence completes the first mold", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await insertCoinAndStart(page);
  await page.keyboard.press("Space");
  for (const key of ["ArrowLeft", "ArrowLeft", "ArrowDown", "ArrowDown", "Space"]) {
    await page.keyboard.press(key);
  }
  await expect(canvas).toHaveAttribute("data-phase", "won");
  await expect(canvas).toHaveAttribute("data-docked", "3");
  await expect(canvas).toHaveAttribute("aria-label", /Chamber 1 complete.*2 polarity flips/);
  await page.screenshot({ path: evidence("m1-won.png") });
  await page.keyboard.press("Enter");
  await expect(canvas).toHaveAttribute("data-phase", "playing");
  await expect(canvas).toHaveAttribute("data-chamber", "2");
  await expect(canvas).toHaveAttribute("data-docked", "0");
});

test("fixed iron brakes one seed and the second chamber is completable", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await insertCoinAndStart(page);
  await page.keyboard.press("Space");
  for (const key of ["ArrowLeft", "ArrowLeft", "ArrowDown", "ArrowDown", "Space", "Enter"]) {
    await page.keyboard.press(key);
  }
  await expect(canvas).toHaveAttribute("data-chamber", "2");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(canvas).toHaveAttribute("data-docked", "1");
  await page.screenshot({ path: evidence("m2-iron-brake.png") });

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await expect(canvas).toHaveAttribute("data-phase", "won");
  await expect(canvas).toHaveAttribute("aria-label", /Chamber 2 complete.*3 polarity flips/);
  await page.screenshot({ path: evidence("m2-won.png") });
});

test("axial pole holds one seed and the third chamber is completable", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await insertCoinAndStart(page);
  for (const key of [
    "Space", "ArrowLeft", "ArrowLeft", "ArrowDown", "ArrowDown", "Space", "Enter",
    "ArrowRight", "Space", "ArrowRight", "Space", "Space", "Enter"
  ]) await page.keyboard.press(key);
  await expect(canvas).toHaveAttribute("data-chamber", "3");

  for (const key of ["ArrowRight", "Space", "ArrowDown", "ArrowRight", "Space"]) {
    await page.keyboard.press(key);
  }
  await expect(canvas).toHaveAttribute("data-phase", "playing");
  await expect(canvas).toHaveAttribute("data-docked", "1");
  await page.screenshot({ path: evidence("m2-polar-veil.png") });

  await page.keyboard.press("Space");
  await expect(canvas).toHaveAttribute("data-phase", "won");
  await expect(canvas).toHaveAttribute("aria-label", /Chamber 3 complete.*3 polarity flips/);
  await page.screenshot({ path: evidence("m2-three-chambers-won.png") });
});

test("pull-bound seed waits through push and the fourth chamber is completable", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await insertCoinAndStart(page);
  for (const key of [
    "Space", "ArrowLeft", "ArrowLeft", "ArrowDown", "ArrowDown", "Space", "Enter",
    "ArrowRight", "Space", "ArrowRight", "Space", "Space", "Enter",
    "ArrowRight", "Space", "ArrowDown", "ArrowRight", "Space", "Space", "Enter"
  ]) await page.keyboard.press(key);
  await expect(canvas).toHaveAttribute("data-chamber", "4");

  await page.keyboard.press("Space");
  await expect(canvas).toHaveAttribute("data-docked", "2");
  await expect(canvas).toHaveAttribute("aria-label", /cobalt answers only pull/);
  await page.screenshot({ path: evidence("m3-cold-lodestone.png") });

  for (const key of ["ArrowDown", "Space", "Space", "ArrowLeft", "Space"]) {
    await page.keyboard.press(key);
  }
  await expect(canvas).toHaveAttribute("data-phase", "won");
  await expect(canvas).toHaveAttribute("data-docked", "3");
  await expect(canvas).toHaveAttribute("aria-label", /Chamber 4 complete.*4 polarity flips/);
  await page.screenshot({ path: evidence("m3-four-chambers-won.png") });

  await page.keyboard.press("Enter");
  await expect(canvas).toHaveAttribute("data-chamber", "5");
  for (const key of ["Space", "ArrowLeft", "ArrowLeft", "ArrowLeft", "Space"]) {
    await page.keyboard.press(key);
  }
  await expect(canvas).toHaveAttribute("data-phase", "playing");
  await expect(canvas).toHaveAttribute("data-docked", "2");
  await page.screenshot({ path: evidence("m3-tempered-relay.png") });

  for (const key of [
    "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowDown", "Space",
    "ArrowLeft", "Space", "Space", "Space"
  ]) await page.keyboard.press(key);
  await expect(canvas).toHaveAttribute("data-phase", "won");
  await expect(canvas).toHaveAttribute("data-docked", "3");
  await expect(canvas).toHaveAttribute("aria-label", /Chamber 5 complete.*6 polarity flips/);
  await page.screenshot({ path: evidence("m3-five-chambers-won.png") });

  await page.keyboard.press("Enter");
  await expect(canvas).toHaveAttribute("data-chamber", "6");
  for (const key of ["ArrowRight", "ArrowDown", "ArrowDown", "Space"]) {
    await page.keyboard.press(key);
  }
  await expect(canvas).toHaveAttribute("data-phase", "playing");
  await expect(canvas).toHaveAttribute("data-docked", "1");
  await expect(canvas).toHaveAttribute("aria-label", /cobalt answers only pull.*ember answers only push/);
  await page.screenshot({ path: evidence("m3-crown-crucible.png") });

  for (const key of [
    "ArrowLeft", "Space", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowUp", "ArrowUp",
    "Space", "Space", "Space", "Space", "Space"
  ]) await page.keyboard.press(key);
  await expect(canvas).toHaveAttribute("data-phase", "won");
  await expect(canvas).toHaveAttribute("data-docked", "3");
  await expect(canvas).toHaveAttribute("data-score", "53750");
  await expect(canvas).toHaveAttribute("aria-label", /Chamber 6 complete.*7 polarity flips.*reforge the final crucible/);
  await page.screenshot({ path: evidence("m3-ending.png") });
});

test("settings persist and corrupt saves recover safely", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await page.keyboard.press("KeyM");
  await expect(canvas).toHaveAttribute("aria-label", /Settings.*Sound selected/);
  await page.keyboard.press("ArrowLeft");
  await expect(canvas).toHaveAttribute("data-volume", "0.6");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(canvas).toHaveAttribute("data-reduced-motion", "true");
  await page.screenshot({ path: evidence("m2-settings.png") });
  await page.reload();
  await expect(canvas).toHaveAttribute("data-volume", "0.6");
  await expect(canvas).toHaveAttribute("data-reduced-motion", "true");

  await page.evaluate(() => localStorage.setItem("lodestar-forge:v12", "{broken"));
  await page.reload();
  await expect(canvas).toHaveAttribute("data-volume", "0.7");
  await expect(canvas).toHaveAttribute("data-reduced-motion", "false");
  await expect(canvas).toHaveAttribute("data-chamber", "1");
});

test("reaching a chamber resumes there after reload", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await insertCoinAndStart(page);
  for (const key of ["Space", "ArrowLeft", "ArrowLeft", "ArrowDown", "ArrowDown", "Space", "Enter"]) {
    await page.keyboard.press(key);
  }
  await expect(canvas).toHaveAttribute("data-chamber", "2");
  await page.reload();
  await expect(canvas).toHaveAttribute("data-phase", "attract");
  await expect(canvas).toHaveAttribute("data-chamber", "2");
  await insertCoinAndStart(page);
  await expect(canvas).toHaveAttribute("data-phase", "playing");
  await expect(canvas).toHaveAttribute("aria-label", /Chamber 2 active/);
});
