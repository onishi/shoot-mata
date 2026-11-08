import { expect, test } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

const evidence = new URL("../../docs/evidence/m5-release-runtime-audit.json", import.meta.url);
const manifestUrl = new URL("../../docs/evidence/m5-release-manifest.json", import.meta.url);
const screenshot = new URL("../../docs/evidence/m5-release-attract.png", import.meta.url);
const chambers = [
  ["Space", "ArrowLeft", "ArrowLeft", "ArrowDown", "ArrowDown", "Space"],
  ["ArrowRight", "Space", "ArrowRight", "Space", "Space"],
  ["ArrowRight", "Space", "ArrowDown", "ArrowRight", "Space", "Space"],
  ["Space", "ArrowDown", "Space", "Space", "ArrowLeft", "Space"],
  ["Space", "ArrowLeft", "ArrowLeft", "ArrowLeft", "Space", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowDown", "Space", "ArrowLeft", "Space", "Space", "Space"],
  ["ArrowRight", "ArrowDown", "ArrowDown", "Space", "ArrowLeft", "Space", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowUp", "ArrowUp", "Space", "Space", "Space", "Space", "Space"]
];

test("clean production package boots with version and reaches the final forge", async ({ page }) => {
  const failedResponses = [];
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push({ status: response.status(), url: response.url() });
  });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const canvas = page.locator("canvas");
  await expect(page).toHaveTitle("LODESTAR FORGE");
  await expect(canvas).toHaveAttribute("data-version", "v12.2");
  await expect(canvas).toHaveAttribute("data-phase", "attract");
  await page.screenshot({ path: screenshot.pathname });
  await page.keyboard.press("KeyC");
  await page.keyboard.press("Enter");
  for (let chamber = 0; chamber < chambers.length; chamber += 1) {
    for (const key of chambers[chamber]) await page.keyboard.press(key);
    await expect(canvas).toHaveAttribute("data-phase", "won");
    await expect(canvas).toHaveAttribute("data-chamber", String(chamber + 1));
    if (chamber < chambers.length - 1) await page.keyboard.press("Enter");
  }
  await expect(canvas).toHaveAttribute("data-score", "53750");
  expect(failedResponses).toEqual([]);
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  await writeFile(evidence, `${JSON.stringify({
    auditedAt: new Date().toISOString(),
    servedFrom: "dist via vite preview",
    version: await canvas.getAttribute("data-version"),
    finalPhase: await canvas.getAttribute("data-phase"),
    finalChamber: Number(await canvas.getAttribute("data-chamber")),
    finalScore: Number(await canvas.getAttribute("data-score")),
    failedResponses,
    manifestFileCount: manifest.fileCount,
    manifestTotalBytes: manifest.totalBytes,
    assessment: "pass"
  }, null, 2)}\n`, "utf8");
});
