import { expect, test } from '@playwright/test';

test('keyboard actions and pause are visible in Chrome', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/PALIMPSEST WAKE/);
  const canvas = page.locator('#game');
  await expect(canvas).toBeVisible();
  const hold = async (key: string, milliseconds: number): Promise<void> => {
    await page.keyboard.down(key);
    await page.waitForTimeout(milliseconds);
    await page.keyboard.up(key);
  };
  await page.keyboard.down('KeyZ');
  await page.waitForTimeout(250);
  await page.keyboard.up('KeyZ');
  await hold('ArrowUp', 400);
  await hold('ArrowRight', 400);
  await hold('ArrowDown', 350);
  await hold('ArrowLeft', 500);
  const bulletCount = await page.evaluate(() => (window as unknown as { __PALIMPSEST_STATE__: () => { bullets: unknown[] } }).__PALIMPSEST_STATE__().bullets.length);
  expect(bulletCount).toBeGreaterThan(0);
  const trailLength = await page.evaluate(() => (window as unknown as { __PALIMPSEST_STATE__: () => { trail: unknown[] } }).__PALIMPSEST_STATE__().trail.length);
  expect(trailLength).toBeGreaterThan(10);
  const loopReady = await page.evaluate(() => Boolean((window as unknown as { __PALIMPSEST_STATE__: () => { candidate: unknown } }).__PALIMPSEST_STATE__().candidate));
  expect(loopReady).toBe(true);
  await canvas.screenshot({ path: '../docs/evidence/m1-01-playing.png' });
  await page.keyboard.press('KeyC');
  await page.waitForTimeout(100);
  const retraces = await page.evaluate(() => (window as unknown as { __PALIMPSEST_STATE__: () => { metrics: { retraces: number } } }).__PALIMPSEST_STATE__().metrics.retraces);
  expect(retraces).toBe(1);
  await page.keyboard.press('KeyX');
  await page.waitForTimeout(100);
  const loops = await page.evaluate(() => (window as unknown as { __PALIMPSEST_STATE__: () => { metrics: { loops: number } } }).__PALIMPSEST_STATE__().metrics.loops);
  expect(loops).toBe(1);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  await canvas.screenshot({ path: 'test-results/m1-paused.png' });
});
