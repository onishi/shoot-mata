import { expect, test } from '@playwright/test';

type FirstWakeState = {
  screen: string;
  tutorial: { active: boolean; eligible: boolean; completedAt: number | null; reflectedAt: number | null };
  game: { tick: number; metrics: { captured: number } };
};
type QaWindow = Window & {
  __PALIMPSEST_APP_STATE__: () => FirstWakeState;
  __PALIMPSEST_AUTOPLAY__: (ticks: number) => number;
};

test('fresh Chrome voyage completes First Wake and experienced or saved voyages do not repeat it', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  const canvas = page.locator('#game');
  await canvas.screenshot({ path: '../docs/evidence/v4.2-03-first-wake-prompt.png' });
  expect((await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__())).tutorial.active).toBe(true);

  // One continuous controller run preserves its human-scale loop intention.
  // 1400 ticks lands inside the two-second completion feedback window.
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUTOPLAY__(1400));
  const completed = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__());
  expect(completed.tutorial.completedAt).not.toBeNull();
  expect(completed.tutorial.completedAt!).toBeLessThanOrEqual(30 * 120);
  expect(completed.game.metrics.captured).toBeGreaterThan(0);
  await canvas.screenshot({ path: '../docs/evidence/v4.2-03-first-wake-complete.png' });

  await page.reload();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  expect((await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__())).tutorial.active).toBe(false);

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.keyboard.press('Enter');
  await page.reload();
  await page.keyboard.press('KeyC');
  await page.keyboard.press('Enter');
  const continued = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__());
  expect(continued.screen).toBe('playing');
  expect(continued.tutorial).toMatchObject({ active: false, eligible: false });
});
