import { expect, test } from "@playwright/test";

const evidence = (name) => new URL(`../../docs/evidence/${name}`, import.meta.url).pathname;

async function snapshot(page) {
  return page.evaluate(() => window.__GALE_THREAD__?.snapshot());
}

async function launch(page) {
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /GALE THREAD title/);
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snapshot(page))?.mode).toBe("playing");
}

test("title, pause, and thread failure are keyboard reachable", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: evidence("m1-title.png") });
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await snapshot(page)).mode).toBe("paused");
  await page.keyboard.press("Escape");
  await page.keyboard.down("Space");
  await expect.poll(async () => (await snapshot(page)).mode, { timeout: 12_000 }).toBe("lost");
  await page.keyboard.up("Space");
  await page.screenshot({ path: evidence("m1-thread-parted.png") });
  await page.keyboard.press("r");
  await expect.poll(async () => (await snapshot(page)).mode).toBe("playing");
});

test("adaptive real-key pilot gathers three chimes and lands", async ({ page }) => {
  await launch(page);
  const targets = [{ x: 300, y: 382 }, { x: 690, y: 252 }, { x: 405, y: 116 }];
  let heldHorizontal = null;
  let reelHeld = false;

  for (let step = 0; step < 520; step++) {
    const state = await snapshot(page);
    if (state.mode === "won") break;
    expect(state.mode).toBe("playing");
    const count = state.ribbons.filter(Boolean).length;
    const target = count < 3 ? targets[count] : { x: 480, y: 488 };
    const desiredHorizontal = state.x < target.x - 14 ? "ArrowRight" : state.x > target.x + 14 ? "ArrowLeft" : null;
    if (heldHorizontal !== desiredHorizontal) {
      if (heldHorizontal) await page.keyboard.up(heldHorizontal);
      if (desiredHorizontal) await page.keyboard.down(desiredHorizontal);
      heldHorizontal = desiredHorizontal;
    }
    const cyclePhase = state.elapsed % 6;
    const gusting = cyclePhase >= 4.2;
    const needClimb = count < 3 && state.y > target.y + 5;
    const shouldReel = needClimb && state.tension < (gusting ? 0.42 : 0.78);
    if (reelHeld !== shouldReel) {
      if (shouldReel) await page.keyboard.down("Space"); else await page.keyboard.up("Space");
      reelHeld = shouldReel;
    }
    if (count === 2 && Math.abs(state.x - targets[2].x) < 100 && state.y < 190) {
      await page.screenshot({ path: evidence("m1-gust-flight.png") });
    }
    await page.waitForTimeout(100);
  }
  if (heldHorizontal) await page.keyboard.up(heldHorizontal);
  if (reelHeld) await page.keyboard.up("Space");
  await expect.poll(async () => (await snapshot(page)).mode).toBe("won");
  await page.screenshot({ path: evidence("m1-won.png") });
  expect(await page.locator("canvas").getAttribute("aria-label")).toMatch(/sky answers/i);
});
