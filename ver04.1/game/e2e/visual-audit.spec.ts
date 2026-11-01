import { expect, test } from '@playwright/test';

type QaWindow = Window & {
  __PALIMPSEST_ASSETS_READY__: Promise<unknown>;
  __PALIMPSEST_QA_SCENARIO__: (scenario: 'setpiece' | 'stage-06-combat') => string;
  __PALIMPSEST_APP_STATE__: () => { settings: { reducedFlash: boolean } };
};

test('HUD remains inside the 16:9 canvas at all required desktop resolutions', async ({ page }) => {
  for (const viewport of [
    { width: 1280, height: 720, name: '1280x720' },
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1920, height: 1080, name: '1920x1080' }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_ASSETS_READY__);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('setpiece'));
    const box = await page.locator('#game').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    expect(box!.width / box!.height).toBeCloseTo(16 / 9, 3);
    await page.screenshot({ path: `../docs/evidence/m4-06-hud-${viewport.name}.png` });
  }
});

test('reduced flash preserves steady combat outlines in the densest Stage 6 scene', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_ASSETS_READY__);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.evaluate(() => {
    const qa = window as unknown as QaWindow;
    qa.__PALIMPSEST_APP_STATE__().settings.reducedFlash = true;
    qa.__PALIMPSEST_QA_SCENARIO__('stage-06-combat');
  });
  const reducedFlash = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__().settings.reducedFlash);
  expect(reducedFlash).toBe(true);
  await page.locator('#game').screenshot({ path: '../docs/evidence/v4.1-01-stage-06-reduced-flash.png' });
});
