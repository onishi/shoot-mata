import { expect, test } from '@playwright/test';

type SavedApp = {
  screen: string;
  checkpointName: string;
  saveAvailable: boolean;
  saveWarning: boolean;
  game: { tick: number; stageId: string };
};
type SaveWindow = Window & {
  __PALIMPSEST_APP_STATE__: () => SavedApp;
  __PALIMPSEST_QA_SCENARIO__: (scenario: 'boss-gate') => string;
  __PALIMPSEST_ADVANCE__: (ticks: number) => number;
};

const state = (page: import('@playwright/test').Page): Promise<SavedApp> =>
  page.evaluate(() => (window as unknown as SaveWindow).__PALIMPSEST_APP_STATE__());

test('checkpoint save survives reload and CONTINUE SAVE resumes the boss gate', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.evaluate(() => (window as unknown as SaveWindow).__PALIMPSEST_QA_SCENARIO__('boss-gate'));
  expect(await state(page)).toMatchObject({ screen: 'playing', checkpointName: 'bailiff-gate', saveAvailable: true });

  await page.reload();
  expect(await state(page)).toMatchObject({ screen: 'title', saveAvailable: true });
  await page.locator('#game').screenshot({ path: '../docs/evidence/m4-01-title-save.png' });
  await page.keyboard.press('KeyC');
  expect(await state(page)).toMatchObject({ screen: 'stage-intro', checkpointName: 'bailiff-gate', game: { stageId: 'stage-01', tick: 21600 } });
});

test('corrupt current data is quarantined while an older-version key remains isolated', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('palimpsest-wake:v4.2:save', '{broken');
    localStorage.setItem('palimpsest-wake:v3.4:save', '{"legacy":true}');
  });
  await page.reload();
  expect(await state(page)).toMatchObject({ screen: 'title', saveAvailable: false, saveWarning: true });
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).toContain('palimpsest-wake:v3.4:save');
  expect(keys).not.toContain('palimpsest-wake:v4.2:save');
  expect(keys.some((key) => key.startsWith('palimpsest-wake:v4.2:save:quarantine:'))).toBe(true);
});

test('storage rejection warns once and the same memory session keeps advancing', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string): void {
      if (key.startsWith('palimpsest-wake:v4.2:save')) throw new DOMException('denied', 'SecurityError');
      original.call(this, key, value);
    };
  });
  await page.goto('/');
  await page.keyboard.press('Enter');
  expect(await state(page)).toMatchObject({ screen: 'stage-intro', saveWarning: true, saveAvailable: false });
  await page.locator('#game').screenshot({ path: '../docs/evidence/m4-01-save-unavailable.png' });
  await page.keyboard.press('Enter');
  expect((await state(page)).saveWarning).toBe(false);
  const tick = await page.evaluate(() => (window as unknown as SaveWindow).__PALIMPSEST_ADVANCE__(12));
  expect(tick).toBeGreaterThanOrEqual(12);
  expect(await state(page)).toMatchObject({ screen: 'playing', saveAvailable: false });
});
