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
  let conditionEvidenceTaken = false;

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
    const sheltered = (state.airspace === 1 && state.x >= 335 && state.x <= 625 && state.y >= 174 && state.y <= 346)
      || (state.airspace === 2 && state.x >= 610 && state.x <= 860 && state.y >= 156 && state.y <= 314);
    const gustDirection = Math.floor(state.elapsed / 6) % 2 === 0 ? 1 : -1;
    const inGaleLift = state.airspace === 3 && gusting && (
      (gustDirection === 1 && state.x >= 105 && state.x <= 355 && state.y >= 72 && state.y <= 454)
      || (gustDirection === -1 && state.x >= 605 && state.x <= 855 && state.y >= 72 && state.y <= 454)
    );
    const needClimb = count < 3 && state.y > target.y + 5;
    const shouldReel = needClimb && !inGaleLift && state.tension < (gusting && !sheltered ? 0.42 : 0.78);
    if (reelHeld !== shouldReel) {
      if (shouldReel) await page.keyboard.down("Space"); else await page.keyboard.up("Space");
      reelHeld = shouldReel;
    }
    const inDowndraft = state.airspace === 2 && state.x >= 390 && state.x <= 570 && state.y >= 78 && state.y <= 428;
    const evidenceCondition = state.airspace === 3 ? inGaleLift : state.airspace === 2 ? inDowndraft : sheltered && gusting;
    if (screenshotName && evidenceCondition && !conditionEvidenceTaken) {
      await page.screenshot({ path: evidence(screenshotName) });
      conditionEvidenceTaken = true;
    }
    await page.waitForTimeout(100);
  }
  if (heldHorizontal) await page.keyboard.up(heldHorizontal);
  if (reelHeld) await page.keyboard.up("Space");
  await expect.poll(async () => (await snapshot(page)).mode).toBe("won");
  return conditionEvidenceTaken;
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
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /cross into FALLING WEFT/i);
});

test("the third airspace crosses sinking air and completes the M2 route", async ({ page }) => {
  await launch(page);
  await pilot(page, [{ x: 300, y: 382 }, { x: 690, y: 252 }, { x: 405, y: 116 }]);
  await page.keyboard.press("Enter");
  await pilot(page, [{ x: 720, y: 382 }, { x: 245, y: 238 }, { x: 710, y: 108 }]);
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snapshot(page)).airspace).toBe(2);
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("gale-thread:v11")).unlockedAirspace)).toBe(2);
  await page.screenshot({ path: evidence("m2-falling-weft-entry.png") });
  const crossedDowndraft = await pilot(page, [{ x: 250, y: 372 }, { x: 735, y: 238 }, { x: 250, y: 102 }], "m2-falling-weft-sinking.png");
  expect(crossedDowndraft).toBe(true);
  await page.screenshot({ path: evidence("m2-falling-weft-won.png") });
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /cross into TURNING TACK/i);
});

test("the fourth airspace rides a forecast gale upward and remains keyboard-completable", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("gale-thread:v11", JSON.stringify({
    version: 1, unlockedAirspace: 3, volume: 0.75, reducedMotion: false,
  })));
  await page.reload();
  await expect.poll(async () => (await snapshot(page))?.airspace).toBe(3);
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snapshot(page))?.mode).toBe("playing");
  await page.screenshot({ path: evidence("m3-turning-tack-entry.png") });
  await page.keyboard.down("ArrowLeft");
  await page.keyboard.down("Space");
  await expect.poll(async () => (await snapshot(page)).x).toBeLessThan(300);
  await page.keyboard.up("ArrowLeft");
  await expect.poll(async () => (await snapshot(page)).elapsed).toBeGreaterThan(3.75);
  await page.keyboard.up("Space");
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /Riding gale lift/i, { timeout: 2_000 });
  const beforeLift = await snapshot(page);
  await page.screenshot({ path: evidence("m3-turning-tack-lifting.png") });
  await page.waitForTimeout(450);
  const afterLift = await snapshot(page);
  expect(afterLift.y).toBeLessThan(beforeLift.y - 20);
  expect(afterLift.tension).toBeLessThan(beforeLift.tension);
  await page.keyboard.press("r");
  await expect.poll(async () => (await snapshot(page)).elapsed).toBeLessThan(0.5);
  await pilot(page, [{ x: 255, y: 365 }, { x: 705, y: 230 }, { x: 255, y: 96 }]);
  await page.screenshot({ path: evidence("m3-turning-tack-won.png") });
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /Four skies answer/i);
});

test("settings and reached airspace persist across reloads", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("gale-thread:v11", JSON.stringify({
    version: 1, unlockedAirspace: 2, volume: 0.75, reducedMotion: false,
  })));
  await page.reload();
  await expect.poll(async () => (await snapshot(page))?.airspace).toBe(2);
  let state = await snapshot(page);
  expect(state.airspace).toBe(2);
  expect(state.mode).toBe("title");
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /GALE THREAD title/);

  await page.keyboard.press("s");
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /Sound volume 75 percent/);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /Reduced motion on/);
  await page.screenshot({ path: evidence("m2-settings.png") });
  await page.keyboard.press("Escape");
  await page.reload();
  await expect.poll(async () => (await snapshot(page))?.airspace).toBe(2);
  state = await snapshot(page);
  expect(state.airspace).toBe(2);
  expect(state.preferences.volume).toBe(1);
  expect(state.preferences.reducedMotion).toBe(true);
});

test("a corrupt save safely returns to defaults", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("gale-thread:v11", "{not-json"));
  await page.reload();
  await expect.poll(async () => (await snapshot(page))?.airspace).toBe(0);
  const state = await snapshot(page);
  expect(state.airspace).toBe(0);
  expect(state.preferences.volume).toBe(0.75);
  expect(state.preferences.reducedMotion).toBe(false);
});
