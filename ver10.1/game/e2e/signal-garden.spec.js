import { test, expect } from "@playwright/test";

async function state(page) {
  return page.evaluate(() => window.__SIGNAL_GARDEN__);
}

async function waitForNode(page, node, timeout = 12_000) {
  await expect.poll(async () => (await state(page)).node, { timeout, intervals: [50, 50, 100] }).toBe(node);
}

test("keyboard route opens all flowers, loops, and reaches the receiver", async ({ page }) => {
  test.setTimeout(95_000);
  const messages = [];
  page.on("console", (message) => { if (["error", "warning"].includes(message.type())) messages.push(message.text()); });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("aria-label", /title/i);
  await page.screenshot({ path: "../docs/evidence/m1-title.png" });
  await canvas.press("Enter");

  const opening = await state(page);
  await page.waitForTimeout(1000);
  expect((await state(page)).node).toBe(opening.node);
  expect((await state(page)).steps).toBe(0);
  await page.screenshot({ path: "../docs/evidence/v10.1-guided-opening.png" });

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
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("signal-garden:v10:progress")))).toEqual({ version: 1, latestGarden: 1 });
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
  await expect.poll(async () => (await state(page)).phase, { timeout: 15_000 }).toBe("gardenWon");
  await page.screenshot({ path: "../docs/evidence/m2-second-garden-won.png" });

  await canvas.press("Enter");
  await expect.poll(async () => (await state(page)).garden).toBe(2);
  await canvas.press("ArrowLeft");
  await canvas.press("Space");
  await canvas.press("ArrowLeft");
  await canvas.press("Space");
  await expect.poll(async () => (await state(page)).pendingSwitches[2]).toEqual({ value: 1, remaining: 2 });
  await page.screenshot({ path: "../docs/evidence/m2-turning-root-entry.png" });
  await waitForNode(page, "returnA");
  await waitForNode(page, "crown");
  await canvas.press("ArrowLeft");
  await canvas.press("Space");
  await canvas.press("ArrowLeft");
  await canvas.press("Space");
  await expect.poll(async () => (await state(page)).phase, { timeout: 15_000 }).toBe("gardenWon");
  await page.screenshot({ path: "../docs/evidence/m2-third-garden-won.png" });

  await canvas.press("Enter");
  await expect.poll(async () => (await state(page)).garden).toBe(3);
  await canvas.press("ArrowRight");
  await canvas.press("ArrowRight");
  await canvas.press("Space");
  await waitForNode(page, "returnA");

  await canvas.press("ArrowRight");
  await canvas.press("Space");
  await page.screenshot({ path: "../docs/evidence/m3-twin-current-linked.png" });
  await waitForNode(page, "rain");
  expect((await state(page)).switches).toEqual([1, 1, 1]);
  await canvas.press("Space");
  await canvas.press("ArrowLeft");
  await canvas.press("Space");
  await expect.poll(async () => (await state(page)).phase, { timeout: 15_000 }).toBe("gardenWon");
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("signal-garden:v10:progress")))).toEqual({ version: 1, latestGarden: 4 });
  await page.screenshot({ path: "../docs/evidence/m3-fourth-garden-won.png" });

  await canvas.press("Enter");
  await expect.poll(async () => (await state(page)).garden).toBe(4);
  expect((await state(page)).flowMs).toBe(1100);
  await canvas.press("ArrowRight");
  await canvas.press("Space");
  await canvas.press("ArrowRight");
  await canvas.press("Space");
  await expect.poll(async () => (await state(page)).flowMs, { timeout: 8_000 }).toBe(520);
  await page.screenshot({ path: "../docs/evidence/m3-quickening-vine-fast.png" });
  await waitForNode(page, "calm");
  expect((await state(page)).flowMs).toBe(1100);

  await canvas.press("ArrowRight");
  await canvas.press("Space");
  await canvas.press("ArrowLeft");
  await canvas.press("Space");
  await expect.poll(async () => (await state(page)).phase, { timeout: 15_000 }).toBe("gardenWon");
  await page.screenshot({ path: "../docs/evidence/m3-fifth-garden-won.png" });

  await canvas.press("Enter");
  await expect.poll(async () => (await state(page)).garden).toBe(5);
  await canvas.press("ArrowRight");
  await canvas.press("ArrowRight");
  await page.keyboard.down("Space");
  await expect.poll(async () => (await state(page)).heldActive).toBe(true);
  await waitForNode(page, "returnA");
  await page.screenshot({ path: "../docs/evidence/m3-tending-crown-held.png" });
  await page.keyboard.up("Space");
  await expect.poll(async () => (await state(page)).heldActive).toBe(false);
  await canvas.press("ArrowRight");
  await canvas.press("Space");
  await expect.poll(async () => (await state(page)).phase, { timeout: 15_000 }).toBe("won");
  await expect.poll(async () => (await state(page)).finaleComplete, { timeout: 6_000 }).toBe(true);
  await page.screenshot({ path: "../docs/evidence/m3-finale.png" });
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

test("sound and reduced motion settings persist and corrupt saves recover", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await canvas.press("m");
  await canvas.press("v");
  await expect(page.locator("#volume")).toHaveText("SOUND 50%");
  await expect(page.locator("#motion")).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "../docs/evidence/m2-settings-reduced-motion.png" });
  await page.reload();
  await expect(page.locator("#volume")).toHaveText("SOUND 50%");
  await expect(page.locator("#motion")).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await state(page))?.settings).toEqual({ version: 1, volume: 0.5, reducedMotion: true });

  await page.evaluate(() => localStorage.setItem("signal-garden:v10:settings", "broken"));
  await page.reload();
  await expect(page.locator("#volume")).toHaveText("SOUND 100%");
  await expect(page.locator("#motion")).toHaveAttribute("aria-pressed", "false");
  await expect.poll(async () => (await state(page))?.settings).toEqual({ version: 1, volume: 1, reducedMotion: false });
});

test("latest unlocked garden resumes after reload and corrupt progress recovers", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("signal-garden:v10:progress", JSON.stringify({ version: 1, latestGarden: 4 })));
  await page.reload();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("aria-label", /Garden 5 ready/i);
  await page.screenshot({ path: "../docs/evidence/m2-progress-resume.png" });
  await canvas.press("Enter");
  await expect.poll(async () => (await state(page))?.garden).toBe(4);
  expect((await state(page)).node).toBe("root");
  expect((await state(page)).lives).toBe(3);

  await page.evaluate(() => localStorage.setItem("signal-garden:v10:progress", JSON.stringify({ version: 8, latestGarden: 4 })));
  await page.reload();
  await expect(canvas).toHaveAttribute("aria-label", /Garden 1 ready/i);
  await canvas.press("Enter");
  await expect.poll(async () => (await state(page))?.garden).toBe(0);
});

test("the sixth garden resumes from saved progress", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("signal-garden:v10:progress", JSON.stringify({ version: 1, latestGarden: 5 })));
  await page.reload();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("aria-label", /Garden 6 ready/i);
  await canvas.press("Enter");
  await expect.poll(async () => (await state(page))?.garden).toBe(5);
  expect((await state(page)).heldActive).toBe(false);
});

test("desktop and narrow layouts keep the game and controls inside the viewport", async ({ page }) => {
  const messages = [];
  page.on("console", (message) => { if (["error", "warning"].includes(message.type())) messages.push(message.text()); });

  for (const viewport of [{ width: 1280, height: 720, name: "1280x720" }, { width: 640, height: 800, name: "640x800" }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    expect(Math.abs(box.width / box.height - 16 / 9)).toBeLessThan(0.02);
    for (const button of [page.locator("#volume"), page.locator("#motion")]) {
      const buttonBox = await button.boundingBox();
      expect(buttonBox.x).toBeGreaterThanOrEqual(0);
      expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(viewport.width);
    }
    await page.screenshot({ path: `../docs/evidence/m4-title-${viewport.name}.png` });
    await canvas.press("Enter");
    await canvas.press("Escape");
    await page.screenshot({ path: `../docs/evidence/m4-paused-${viewport.name}.png` });
  }
  expect(messages).toEqual([]);
});

test("keyboard focus, accessible names, and live status cover the main flow", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeFocused();
  await expect(canvas).toHaveAttribute("aria-label", /title.*Garden 1 ready.*Enter/i);

  await page.keyboard.press("Tab");
  await expect(page.locator("#volume")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#volume")).toHaveAttribute("aria-label", /50 percent/i);
  await expect(page.locator("#live")).toHaveText(/50 percent/i);

  await page.keyboard.press("Tab");
  await expect(page.locator("#motion")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#motion")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#live")).toHaveText(/Reduced motion on/i);

  await canvas.focus();
  await canvas.press("Enter");
  await expect(canvas).toHaveAttribute("aria-label", /Garden 1.*playing.*0 of 3 flowers.*3 lives.*FORK switch selected/i);
  await canvas.press("ArrowRight");
  await expect(canvas).toHaveAttribute("aria-label", /GRAFT switch selected/i);
  await canvas.press("Space");
  await expect(page.locator("#live")).toHaveText(/GRAFT route changed to BELL FLOWER/i);
  await canvas.press("Escape");
  await expect(canvas).toHaveAttribute("aria-label", /paused/i);
  await canvas.press("Enter");
  await expect(canvas).toHaveAttribute("aria-label", /playing/i);
});

test("representative rendering stays within the frame-time budget", async ({ page }) => {
  await page.goto("/");
  await page.locator("canvas").press("Enter");
  const metrics = await page.evaluate(() => new Promise((resolve) => {
    const samples = [];
    let previous = performance.now();
    function sample(now) {
      samples.push(now - previous);
      previous = now;
      if (samples.length < 180) requestAnimationFrame(sample);
      else {
        const steady = samples.slice(10).sort((a, b) => a - b);
        resolve({
          samples: steady.length,
          p95: steady[Math.floor(steady.length * 0.95)],
          max: steady.at(-1),
        });
      }
    }
    requestAnimationFrame(sample);
  }));
  expect(metrics.samples).toBe(170);
  expect(metrics.p95).toBeLessThan(25);
  console.log(`render-frame p95=${metrics.p95.toFixed(2)}ms max=${metrics.max.toFixed(2)}ms samples=${metrics.samples}`);
});
