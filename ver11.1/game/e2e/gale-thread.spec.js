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
      || (state.airspace === 2 && state.x >= 610 && state.x <= 860 && state.y >= 156 && state.y <= 314)
      || (state.airspace === 5 && state.x >= 390 && state.x <= 610 && state.y >= 326 && state.y <= 458);
    const gustDirection = Math.floor(state.elapsed / 6) % 2 === 0 ? 1 : -1;
    const inGaleLift = gusting && (
      (state.airspace === 3 && (
        (gustDirection === 1 && state.x >= 105 && state.x <= 355 && state.y >= 72 && state.y <= 454)
        || (gustDirection === -1 && state.x >= 605 && state.x <= 855 && state.y >= 72 && state.y <= 454)
      ))
      || (state.airspace === 5 && gustDirection === -1 && state.x >= 642 && state.x <= 870 && state.y >= 72 && state.y <= 454)
    );
    const needClimb = count < 3 && state.y > target.y + 5;
    const gateXs = state.airspace === 4 ? [360, 600] : state.airspace === 5 ? [570] : [];
    const gateAhead = gateXs.some((gateX) => (
      (state.x - gateX) * (target.x - gateX) <= 0 && Math.abs(state.x - gateX) < 125
    ));
    const shouldReel = gateAhead
      ? state.tension < 0.48
      : needClimb && !inGaleLift && state.tension < (gusting && !sheltered ? 0.42 : 0.78);
    if (reelHeld !== shouldReel) {
      if (shouldReel) await page.keyboard.down("Space"); else await page.keyboard.up("Space");
      reelHeld = shouldReel;
    }
    const inDowndraft = (state.airspace === 2 && state.x >= 390 && state.x <= 570 && state.y >= 78 && state.y <= 428)
      || (state.airspace === 5 && state.x >= 300 && state.x <= 460 && state.y >= 92 && state.y <= 338);
    const evidenceCondition = state.airspace === 4 || state.airspace === 5 ? state.message === "GATE IN TUNE" : state.airspace === 3 ? inGaleLift : state.airspace === 2 ? inDowndraft : sheltered && gusting;
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

test("first flight teaches release before tension becomes dangerous", async ({ page }) => {
  await launch(page);
  await page.keyboard.down("Space");
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /release space/i, { timeout: 5_000 });
  await page.screenshot({ path: evidence("v11.1-first-gale-coaching.png") });
  await page.keyboard.up("Space");
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /thread safe/i, { timeout: 3_000 });
  const state = await snapshot(page);
  expect(state.mode).toBe("playing");
  expect(state.tension).toBeLessThan(0.55);
});

test("title can revisit every unlocked airspace", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("gale-thread:v11", JSON.stringify({
    version: 1, unlockedAirspace: 5, volume: 0.75, reducedMotion: false,
  })));
  await page.reload();
  await expect.poll(async () => (await snapshot(page))?.airspace).toBe(5);
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /LAST HORIZON selected/i);
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect.poll(async () => (await snapshot(page))?.airspace).toBe(3);
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /TURNING TACK selected/i);
  await page.screenshot({ path: evidence("v11.1-airspace-select.png") });
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snapshot(page))?.mode).toBe("playing");
  expect((await snapshot(page)).airspace).toBe(3);
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
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /cross into RESONANT PASS/i);
});

test("the fifth airspace tunes the thread to cross both sound gates", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("gale-thread:v11", JSON.stringify({
    version: 1, unlockedAirspace: 4, volume: 0.75, reducedMotion: false,
  })));
  await page.reload();
  await expect.poll(async () => (await snapshot(page))?.airspace).toBe(4);
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snapshot(page))?.mode).toBe("playing");
  await page.screenshot({ path: evidence("m3-resonant-pass-entry.png") });

  await page.keyboard.down("ArrowLeft");
  await expect.poll(async () => (await snapshot(page))?.message, { timeout: 5_000 }).toBe("TUNE THE THREAD");
  const blocked = await snapshot(page);
  expect(blocked.x).toBeGreaterThanOrEqual(326);
  let reelHeld = false;
  let crossedInTune = false;
  for (let step = 0; step < 80; step++) {
    const state = await snapshot(page);
    if (state.message === "GATE IN TUNE") { crossedInTune = true; break; }
    const shouldReel = reelHeld ? state.tension < 0.52 : state.tension < 0.4;
    if (reelHeld !== shouldReel) {
      if (shouldReel) await page.keyboard.down("Space"); else await page.keyboard.up("Space");
      reelHeld = shouldReel;
    }
    await page.waitForTimeout(100);
  }
  if (reelHeld) await page.keyboard.up("Space");
  await page.keyboard.up("ArrowLeft");
  expect(crossedInTune).toBe(true);
  const tuned = await snapshot(page);
  expect(tuned.x).toBeLessThan(360);
  expect(tuned.tension).toBeGreaterThanOrEqual(0.32);
  expect(tuned.tension).toBeLessThanOrEqual(0.68);
  await page.screenshot({ path: evidence("m3-resonant-pass-tuned.png") });

  await page.keyboard.press("r");
  const usedGate = await pilot(page, [{ x: 225, y: 370 }, { x: 735, y: 236 }, { x: 225, y: 102 }], "m3-resonant-pass-tuned.png");
  expect(usedGate).toBe(true);
  await page.screenshot({ path: evidence("m3-resonant-pass-won.png") });
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /cross into LAST HORIZON/i);
});

test("the final airspace weaves every learned wind rule into the finale", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("gale-thread:v11", JSON.stringify({
    version: 1, unlockedAirspace: 5, volume: 0.75, reducedMotion: false,
  })));
  await page.reload();
  await expect.poll(async () => (await snapshot(page))?.airspace).toBe(5);
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snapshot(page))?.mode).toBe("playing");
  await page.screenshot({ path: evidence("m3-last-horizon-entry.png") });
  const crossedGate = await pilot(page, [
    { x: 230, y: 374 }, { x: 744, y: 238 }, { x: 228, y: 102 },
  ], "m3-last-horizon-weave.png");
  expect(crossedGate).toBe(true);
  await page.screenshot({ path: evidence("m3-last-horizon-finale.png") });
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /six-sky chorus is complete/i);
});

test("a fresh save flies all six airspaces into the final chorus", async ({ page }) => {
  test.setTimeout(180_000);
  const consoleProblems = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") consoleProblems.push(message.text());
  });
  await launch(page);
  const routes = [
    [{ x: 300, y: 382 }, { x: 690, y: 252 }, { x: 405, y: 116 }],
    [{ x: 720, y: 382 }, { x: 245, y: 238 }, { x: 710, y: 108 }],
    [{ x: 250, y: 372 }, { x: 735, y: 238 }, { x: 250, y: 102 }],
    [{ x: 255, y: 365 }, { x: 705, y: 230 }, { x: 255, y: 96 }],
    [{ x: 225, y: 370 }, { x: 735, y: 236 }, { x: 225, y: 102 }],
    [{ x: 230, y: 374 }, { x: 744, y: 238 }, { x: 228, y: 102 }],
  ];
  for (let airspace = 0; airspace < routes.length; airspace++) {
    await expect.poll(async () => (await snapshot(page)).airspace).toBe(airspace);
    await pilot(page, routes[airspace]);
    if (airspace < routes.length - 1) await page.keyboard.press("Enter");
  }
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /six-sky chorus is complete/i);
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("gale-thread:v11")).unlockedAirspace)).toBe(5);
  expect(consoleProblems).toEqual([]);
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

test("M4 viewport, keyboard accessibility, and frame pacing audit", async ({ page }) => {
  const canvas = page.locator("canvas");
  for (const viewport of [{ width: 1280, height: 720 }, { width: 640, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("gale-thread:v11"));
    await page.reload();
    const suffix = `${viewport.width}x${viewport.height}`;
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.5);
    expect(box.width / box.height).toBeCloseTo(16 / 9, 2);
    await page.screenshot({ path: evidence(`m4-title-${suffix}.png`) });

    await page.keyboard.press("Tab");
    await expect(canvas).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(canvas).toHaveAttribute("aria-label", /0 of 3 chimes.*Tension/i);
    await page.keyboard.press("s");
    await expect(canvas).toHaveAttribute("aria-label", /Settings.*Sound volume 75 percent.*Reduced motion off/i);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(canvas).toHaveAttribute("aria-label", /Reduced motion selected.*Reduced motion on/i);
    await page.screenshot({ path: evidence(`m4-settings-${suffix}.png`) });
    await page.keyboard.press("Escape");
    await expect(canvas).toBeFocused();
    await expect(canvas).toHaveAttribute("aria-label", /Paused/i);
    await page.screenshot({ path: evidence(`m4-paused-${suffix}.png`) });
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.keyboard.press("Enter");
  await page.keyboard.down("ArrowRight");
  const samples = await page.evaluate(() => new Promise((resolve) => {
    const deltas = [];
    let previous;
    function sample(now) {
      if (previous !== undefined) deltas.push(now - previous);
      previous = now;
      if (deltas.length >= 180) resolve(deltas);
      else requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  }));
  await page.keyboard.up("ArrowRight");
  const ordered = samples.slice().sort((a, b) => a - b);
  const p95 = ordered[Math.floor(ordered.length * 0.95)];
  const maximum = ordered.at(-1);
  console.log(`M4 frame pacing: ${samples.length} samples, p95 ${p95.toFixed(2)}ms, max ${maximum.toFixed(2)}ms`);
  expect(p95).toBeLessThan(25);
});

test("M4 compact final airspace and finale remain legible", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 800 });
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("gale-thread:v11", JSON.stringify({
    version: 1, unlockedAirspace: 5, volume: 0.75, reducedMotion: true,
  })));
  await page.reload();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snapshot(page))?.mode).toBe("playing");
  await page.screenshot({ path: evidence("m4-last-horizon-640x800.png") });
  await pilot(page, [{ x: 230, y: 374 }, { x: 744, y: 238 }, { x: 228, y: 102 }]);
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /six-sky chorus is complete/i);
  await page.screenshot({ path: evidence("m4-finale-640x800.png") });
});
