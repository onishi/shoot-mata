import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'wide', width: 1280, height: 720 },
  { name: 'narrow', width: 640, height: 800 }
];

for (const viewport of viewports) {
  test(`${viewport.name} viewport keeps the complete canvas visible`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const canvas = page.locator('#game');
    const box = await canvas.boundingBox();

    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.5);
    expect(box.width / box.height).toBeCloseTo(16 / 9, 2);
    await page.screenshot({ path: `../docs/evidence/m4-title-${viewport.width}x${viewport.height}.png` });

    await page.keyboard.press('Tab');
    await expect(canvas).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(canvas).toHaveAttribute('data-phase', 'briefing');
    await page.keyboard.press('Enter');
    await expect(canvas).toHaveAttribute('data-phase', 'playing');
    await page.keyboard.press('Escape');
    await expect(canvas).toHaveAttribute('aria-label', /paused/i);
    await page.screenshot({ path: `../docs/evidence/m4-paused-${viewport.width}x${viewport.height}.png` });
  });
}

test('focus, dynamic name, and live announcements expose play state', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('#game');
  const live = page.locator('#live');

  await page.keyboard.press('Tab');
  await expect(canvas).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('aria-label', /Press Enter when ready/i);
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('aria-label', /Dim lamp, no warden pursuing/i);
  await page.keyboard.down('Space');
  await expect(canvas).toHaveAttribute('aria-label', /Bright lamp, flame warden pursuing/i);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await expect(live).toHaveText(/Star-seed gathered\. 1 of 3\./i);
  await expect(canvas).toHaveAttribute('aria-label', /1 of 3 star-seeds/i);
  await page.keyboard.up('Space');
});

test('representative animation maintains responsive frame pacing', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.down('Space');

  const intervals = await page.evaluate(() => new Promise((resolve) => {
    const samples = [];
    let previous = performance.now();
    const sample = (now) => {
      samples.push(now - previous);
      previous = now;
      if (samples.length === 120) resolve(samples.slice(10));
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));

  await page.keyboard.up('Space');
  const sorted = [...intervals].sort((a, b) => a - b);
  const average = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  console.log(`M4 frame pacing: average=${average.toFixed(2)}ms p95=${p95.toFixed(2)}ms samples=${intervals.length}`);
  expect(average).toBeLessThan(35);
  expect(p95).toBeLessThan(50);
});
