import { expect, test } from '@playwright/test';

type SettingsState = {
  screen: string;
  settingsIndex: number;
  settingsWarning: boolean;
  settings: { bgm: number; se: number; screenShake: boolean; reducedFlash: boolean; difficulty: string };
  game: { tick: number };
};
type SettingsWindow = Window & {
  __PALIMPSEST_APP_STATE__: () => SettingsState;
  __PALIMPSEST_AUDIO_STATE__: () => { busLevels: Record<string, number> };
};
const appState = (page: import('@playwright/test').Page): Promise<SettingsState> =>
  page.evaluate(() => (window as unknown as SettingsWindow).__PALIMPSEST_APP_STATE__());

test('SETTINGS persists independently and applies audio buses immediately', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.keyboard.press('KeyS');
  expect(await appState(page)).toMatchObject({ screen: 'settings', settingsIndex: 0 });
  await page.keyboard.press('ArrowLeft');
  expect((await appState(page)).settings.bgm).toBe(65);
  const buses = await page.evaluate(() => (window as unknown as SettingsWindow).__PALIMPSEST_AUDIO_STATE__().busLevels);
  expect(buses.music).toBeCloseTo(0.65 ** 2);
  expect(buses.environment).toBeCloseTo(0.65 ** 2);

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  expect((await appState(page)).settings.se).toBe(70);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  expect((await appState(page)).settings).toMatchObject({ bgm: 65, se: 70, screenShake: false, reducedFlash: true, difficulty: 'proof' });
  await page.locator('#game').screenshot({ path: '../docs/evidence/m4-02-settings.png' });

  await page.reload();
  expect(await appState(page)).toMatchObject({ screen: 'title', settings: { bgm: 65, se: 70, screenShake: false, reducedFlash: true, difficulty: 'proof' } });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  expect((await appState(page)).settings.difficulty).toBe('proof');
  await page.keyboard.press('Escape');
  await page.keyboard.press('KeyS');
  expect((await appState(page)).screen).toBe('settings');
  await page.keyboard.press('Escape');
  expect((await appState(page)).screen).toBe('paused');
  const tick = (await appState(page)).game.tick;
  await page.waitForTimeout(80);
  expect((await appState(page)).game.tick).toBe(tick);
});

test('settings write rejection keeps the changed values in memory', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string): void {
      if (key.startsWith('palimpsest-wake:v4.1:settings')) throw new DOMException('denied', 'SecurityError');
      original.call(this, key, value);
    };
  });
  await page.goto('/');
  await page.keyboard.press('KeyS');
  await page.keyboard.press('ArrowLeft');
  expect(await appState(page)).toMatchObject({ screen: 'settings', settingsWarning: true, settings: { bgm: 65 } });
  await page.locator('#game').screenshot({ path: '../docs/evidence/m4-02-settings-unavailable.png' });
});
