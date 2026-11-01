import { expect, test } from '@playwright/test';

type RecoveryQa = Window & {
  __PALIMPSEST_ASSETS_READY__: Promise<unknown>;
  __PALIMPSEST_ADVANCE__: (ticks: number) => number;
  __PALIMPSEST_APP_STATE__: () => {
    marginalia: string[];
    game: {
      recovery: { active: string | null; afterwordProgress: number; afterwordReady: boolean; afterwordReadyUntil: number; afterwordRecoveryUntil: number; feedbackUntil: number };
      tick: number;
    };
  };
};

test('prepared RECOVERY state is visible in the combat HUD', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => (window as unknown as RecoveryQa).__PALIMPSEST_ASSETS_READY__);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.evaluate(() => {
    const qa = window as unknown as RecoveryQa;
    const app = qa.__PALIMPSEST_APP_STATE__();
    app.marginalia = ['afterword'];
    app.game.recovery.afterwordProgress = 3;
    app.game.recovery.afterwordReady = true;
    app.game.recovery.afterwordReadyUntil = app.game.tick + 360;
    app.game.recovery.feedbackUntil = app.game.tick + 120;
    qa.__PALIMPSEST_ADVANCE__(1);
  });
  const recovery = await page.evaluate(() => (window as unknown as RecoveryQa).__PALIMPSEST_APP_STATE__().game.recovery);
  expect(recovery).toMatchObject({ active: 'afterword', afterwordProgress: 3, afterwordReady: true });
  await page.locator('#game').screenshot({ path: '../docs/evidence/v4.1-03-recovery-hud.png' });
});
