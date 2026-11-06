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

async function pilot(page, targets, screenshotName) {
  let heldHorizontal = null;
  let reelHeld = false;
  let shelteredEvidenceTaken = false;

  for (let step = 0; step < 600; step++) {
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
    const sheltered = state.airspace === 1 && state.x >= 335 && state.x <= 625 && state.y >= 174 && state.y <= 346;
    const needClimb = count < 3 && state.y > target.y + 5;
    const shouldReel = needClimb && state.tension < (gusting && !sheltered ? 0.42 : 0.78);
    if (reelHeld !== shouldReel) {
      if (shouldReel) await page.keyboard.down("Space"); else await page.keyboard.up("Space");
      reelHeld = shouldReel;
    }
    if (screenshotName && sheltered && gusting && !shelteredEvidenceTaken) {
      await page.screenshot({ path: evidence(screenshotName) });
      shelteredEvidenceTaken = true;
    }
    await page.waitForTimeout(100);
  }
  if (heldHorizontal) await page.keyboard.up(heldHorizontal);
  if (reelHeld) await page.keyboard.up("Space");
  await expect.poll(async () => (await snapshot(page)).mode).toBe("won");
  return shelteredEvidenceTaken;
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
  await pilot(page, targets);
  await page.screenshot({ path: evidence("m1-won.png") });
  expect(await page.locator("canvas").getAttribute("aria-label")).toMatch(/cross into Cloud Lee/i);
});

test("the second airspace uses cloud shelter and remains keyboard-completable", async ({ page }) => {
  await launch(page);
  await pilot(page, [{ x: 300, y: 382 }, { x: 690, y: 252 }, { x: 405, y: 116 }]);
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snapshot(page)).airspace).toBe(1);
  await page.screenshot({ path: evidence("m2-cloud-lee-entry.png") });
  const sawShelter = await pilot(page, [{ x: 720, y: 382 }, { x: 245, y: 238 }, { x: 710, y: 108 }], "m2-cloud-lee-sheltered.png");
  expect(sawShelter).toBe(true);
  await page.screenshot({ path: evidence("m2-cloud-lee-won.png") });
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /Two skies answer/);
});
