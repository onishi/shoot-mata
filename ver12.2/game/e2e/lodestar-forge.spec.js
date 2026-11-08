import { expect, test } from "@playwright/test";

const evidence = (name) => new URL(`../../docs/evidence/${name}`, import.meta.url).pathname;

const insertCoinAndStart = async (page) => {
  await page.keyboard.press("KeyC");
  await page.keyboard.press("Enter");
};

test("previews the exact next field result before committing", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await insertCoinAndStart(page);
  await expect(canvas).toHaveAttribute("data-next-polarity", "push");
  await expect(canvas).toHaveAttribute("data-preview", "cobalt:lock@1,2|ember:lock@7,2|pearl:blocked@4,5");
  await expect(canvas).toHaveAttribute("aria-label", /next strike push.*Preview: cobalt will lock.*pearl will stay blocked/i);
  await page.screenshot({ path: evidence("m5-preview-first-field.png") });
  await page.keyboard.press("Space");
  await expect(canvas).toHaveAttribute("data-docked", "2");
  await expect(canvas).toHaveAttribute("data-next-polarity", "pull");
});

test("attract, credit, polarity feedback, pause, and reset are keyboard reachable", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-phase", "attract");
  await expect(canvas).toHaveAttribute("aria-label", /insert coin/i);
  await expect(canvas).toHaveAttribute("data-demo-step", "3", { timeout: 5000 });
  await expect(canvas).toHaveAttribute("data-demo-docked", "2");
  await page.screenshot({ path: evidence("m4-attract-demo.png") });
  await expect(canvas).toHaveAttribute("data-demo-step", "4", { timeout: 2500 });
  await expect(canvas).toHaveAttribute("data-demo-step", "0", { timeout: 2500 });
  await expect(canvas).toHaveAttribute("data-demo-docked", "0");
  await page.keyboard.press("KeyC");
  await expect(canvas).toHaveAttribute("data-phase", "ready");
  await expect(canvas).toHaveAttribute("data-audio-cue", "coin");
  await expect(canvas).toHaveAttribute("data-credits", "1");
  await expect(canvas).toHaveAttribute("data-docked", "0");
  await expect(canvas).toHaveAttribute("data-demo-step", "off");
  await expect(canvas).toHaveAttribute("data-demo-docked", "off");
  await page.screenshot({ path: evidence("m4-credit-ready.png") });

  await page.keyboard.press("Enter");
  await expect(canvas).toHaveAttribute("data-phase", "playing");
  await expect(canvas).toHaveAttribute("data-audio-scene", "play");
  await expect(canvas).toHaveAttribute("data-audio-cue", "start");
  await page.keyboard.press("Space");
  await expect(canvas).toHaveAttribute("data-polarity", "push");
  await expect(canvas).toHaveAttribute("data-docked", "2");
  await page.screenshot({ path: evidence("m1-first-field.png") });

  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-phase", "paused");
  await expect(canvas).toHaveAttribute("data-audio-scene", "silent");
  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-audio-scene", "play");
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

test("temper sigil offers a visible higher-scoring first chamber route", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await insertCoinAndStart(page);
  for (const key of ["ArrowRight", "ArrowRight", "Space"]) await page.keyboard.press(key);
  await expect(canvas).toHaveAttribute("data-sigil-lit", "true");
  await expect(canvas).toHaveAttribute("data-score", "5000");
  await expect(canvas).toHaveAttribute("data-audio-cue", "sigil");
  await expect(canvas).toHaveAttribute("aria-label", /temper sigil lit/i);
  await page.screenshot({ path: evidence("m4-temper-sigil.png") });
  for (const key of ["ArrowLeft", "Space", "Space"]) await page.keyboard.press(key);
  await expect(canvas).toHaveAttribute("data-phase", "won");
  await expect(canvas).toHaveAttribute("data-score", "12250");
});

test("one-step undo restores heat, score, sigil, seeds, and smith without replay exploits", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await insertCoinAndStart(page);
  for (const key of ["ArrowRight", "ArrowRight", "Space"]) await page.keyboard.press(key);
  await expect(canvas).toHaveAttribute("data-undo", "ready");
  await expect(canvas).toHaveAttribute("data-sigil-lit", "true");
  await expect(canvas).toHaveAttribute("data-score", "5000");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("KeyU");
  await expect(canvas).toHaveAttribute("data-undo", "spent");
  await expect(canvas).toHaveAttribute("data-polarity", "pull");
  await expect(canvas).toHaveAttribute("data-docked", "0");
  await expect(canvas).toHaveAttribute("data-sigil-lit", "false");
  await expect(canvas).toHaveAttribute("data-score", "0");
  await expect(canvas).toHaveAttribute("aria-label", /undo spent/i);
  await page.keyboard.press("Space");
  await expect(canvas).toHaveAttribute("data-score", "5000");
  await page.keyboard.press("KeyU");
  await expect(canvas).toHaveAttribute("data-score", "5000");
  await expect(canvas).toHaveAttribute("data-undo", "spent");
  await page.screenshot({ path: evidence("m4-undo-spent.png") });
});

test("temper routes remain playable through all six chambers", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const canvas = page.locator("canvas");
  await insertCoinAndStart(page);
  const routes = [
    ["ArrowRight", "ArrowRight", "Space", "ArrowLeft", "Space", "Space"],
    ["Space", "Space", "Space", "ArrowRight", "ArrowRight", "Space", "Space"],
    ["ArrowLeft", "ArrowLeft", "Space", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowDown", "Space", "Space", "ArrowLeft", "ArrowDown", "Space"],
    ["ArrowRight", "ArrowDown", "Space", "Space", "Space", "ArrowLeft", "Space", "Space"],
    ["ArrowRight", "ArrowDown", "Space", "ArrowLeft", "ArrowUp", "ArrowLeft", "Space", "ArrowLeft", "ArrowLeft", "Space", "Space", "Space", "Space", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowDown", "Space", "Space"],
    ["ArrowRight", "ArrowDown", "ArrowDown", "Space", "ArrowLeft", "Space", "Space", "ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowUp", "Space", "ArrowRight", "ArrowDown", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowUp", "ArrowUp", "Space", "Space", "Space", "Space", "Space"]
  ];

  for (let index = 0; index < routes.length; index += 1) {
    for (const key of routes[index]) await page.keyboard.press(key);
    await expect(canvas).toHaveAttribute("data-phase", "won");
    await expect(canvas).toHaveAttribute("data-sigil-lit", "true");
    if (index < routes.length - 1) await page.keyboard.press("Enter");
  }
  await expect(canvas).toHaveAttribute("data-score", "76250");
  await expect(canvas).toHaveAttribute("data-forge-rank", "crown");
  await expect(canvas).toHaveAttribute("data-audio-cue", "masterwork");
  await expect(canvas).toHaveAttribute("aria-label", /Chamber 6 complete.*9 polarity flips.*CROWN MASTER/);
  await page.screenshot({ path: evidence("m5-masterwork-ending.png") });
});

test("forge heat reaches game over and a new credit continues the chamber", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await insertCoinAndStart(page);
  for (let i = 0; i < 6; i += 1) await page.keyboard.press("Space");
  await expect(canvas).toHaveAttribute("data-phase", "gameover");
  await expect(canvas).toHaveAttribute("data-heat-limit", "6");
  await expect(canvas).toHaveAttribute("data-audio-scene", "silent");
  await expect(canvas).toHaveAttribute("data-audio-cue", "gameover");
  await expect(canvas).toHaveAttribute("aria-label", /Game over.*Press C to continue.*record your score/i);
  await page.screenshot({ path: evidence("m4-gameover.png") });

  await page.keyboard.press("KeyR");
  await expect(canvas).toHaveAttribute("data-phase", "gameover");
  await page.keyboard.press("KeyC");
  await expect(canvas).toHaveAttribute("data-phase", "continue_ready");
  await page.screenshot({ path: evidence("m4-continue-ready.png") });
  await page.keyboard.press("Enter");
  await expect(canvas).toHaveAttribute("data-phase", "playing");
  await expect(canvas).toHaveAttribute("data-continues", "1");
  await expect(canvas).toHaveAttribute("data-score", "0");
  await expect(canvas).toHaveAttribute("data-audio-scene", "play");

  for (let i = 0; i < 6; i += 1) await page.keyboard.press("Space");
  await page.keyboard.press("Enter");
  await expect(canvas).toHaveAttribute("data-phase", "initials");
  await expect(canvas).toHaveAttribute("data-outcome", "over");
  await page.keyboard.press("Space");
  await expect(canvas).toHaveAttribute("data-phase", "ranking");
  await page.keyboard.press("Enter");
  await expect(canvas).toHaveAttribute("data-phase", "attract");
});

test("the first field remains legible in a 640 by 480 cabinet viewport", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 480 });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-demo-step", "3", { timeout: 5000 });
  await page.screenshot({ path: evidence("m4-attract-demo-640x480.png") });
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
  await expect(canvas).toHaveAttribute("data-forge-rank", "iron");
  await expect(canvas).toHaveAttribute("aria-label", /Chamber 6 complete.*7 polarity flips.*IRON FORGER.*record your initials/);
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
  await page.keyboard.press("ArrowUp");
  for (let i = 0; i < 6; i += 1) await page.keyboard.press("ArrowLeft");
  await expect(canvas).toHaveAttribute("data-volume", "0");
  await expect(canvas).toHaveAttribute("data-audio-muted", "true");
  for (let i = 0; i < 6; i += 1) await page.keyboard.press("ArrowRight");
  await expect(canvas).toHaveAttribute("data-volume", "0.6");
  await expect(canvas).toHaveAttribute("data-audio-muted", "false");
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

test("final score accepts lever initials, saves top five, and returns to attract", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const canvas = page.locator("canvas");
  await insertCoinAndStart(page);
  for (const key of [
    "Space", "ArrowLeft", "ArrowLeft", "ArrowDown", "ArrowDown", "Space", "Enter",
    "ArrowRight", "Space", "ArrowRight", "Space", "Space", "Enter",
    "ArrowRight", "Space", "ArrowDown", "ArrowRight", "Space", "Space", "Enter",
    "Space", "ArrowDown", "Space", "Space", "ArrowLeft", "Space", "Enter",
    "Space", "ArrowLeft", "ArrowLeft", "ArrowLeft", "Space",
    "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowDown", "Space",
    "ArrowLeft", "Space", "Space", "Space", "Enter",
    "ArrowRight", "ArrowDown", "ArrowDown", "Space", "ArrowLeft", "Space",
    "ArrowRight", "ArrowRight", "ArrowRight", "ArrowUp", "ArrowUp",
    "Space", "Space", "Space", "Space", "Space"
  ]) await page.keyboard.press(key);
  await expect(canvas).toHaveAttribute("data-phase", "won");
  await page.keyboard.press("Enter");
  await expect(canvas).toHaveAttribute("data-phase", "initials");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");
  await expect(canvas).toHaveAttribute("data-initials", "BBB");
  await page.screenshot({ path: evidence("m4-initials.png") });
  await page.keyboard.press("Space");
  await expect(canvas).toHaveAttribute("data-phase", "ranking");
  await expect(canvas).toHaveAttribute("data-audio-scene", "silent");
  await expect(canvas).toHaveAttribute("data-audio-cue", "ranking");
  await expect(canvas).toHaveAttribute("data-ranking-count", "1");
  await expect(canvas).toHaveAttribute("aria-label", /Local top five ranking.*53750/);
  await page.screenshot({ path: evidence("m4-ranking.png") });
  await page.keyboard.press("Enter");
  await expect(canvas).toHaveAttribute("data-phase", "attract");
  await page.reload();
  await expect(canvas).toHaveAttribute("data-ranking-count", "1");
});
