import { expect, test } from '@playwright/test';

type QaWindow = Window & {
  __PALIMPSEST_APP_STATE__: () => {
    screen: string; marginaliaMoment: string; midpointMarginaliaTaken: boolean; marginalia: string[];
    game: { tick: number; player: { invulnerableUntil: number } };
  };
  __PALIMPSEST_ADVANCE__: (ticks: number) => number;
};

test('midpoint marginalia pauses, persists the selection and resumes play', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.evaluate(() => {
    const qa = window as unknown as QaWindow;
    const state = qa.__PALIMPSEST_APP_STATE__();
    state.game.tick = 10_799;
    state.game.player.invulnerableUntil = 20_000;
    qa.__PALIMPSEST_ADVANCE__(1);
  });
  let state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__());
  expect(state).toMatchObject({ screen: 'marginalia', marginaliaMoment: 'midpoint' });
  expect(state.game.tick).toBe(10_800);
  await page.locator('#game').screenshot({ path: '../docs/evidence/m4-04-midpoint-marginalia.png' });
  await page.keyboard.press('Enter');
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__());
  expect(state).toMatchObject({ screen: 'playing', midpointMarginaliaTaken: true });
  expect(state.marginalia).toHaveLength(1);
  const stored = await page.evaluate(() => window.localStorage.getItem('palimpsest-wake:v4.1:save'));
  expect(stored).toContain(state.marginalia[0]);
});
