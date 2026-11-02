import { expect, test } from '@playwright/test';

type RecoveryQa = Window & {
  __PALIMPSEST_ASSETS_READY__: Promise<unknown>;
  __PALIMPSEST_ADVANCE__: (ticks: number) => number;
  __PALIMPSEST_APP_STATE__: () => {
    marginalia: string[];
    settings: { difficulty: 'echo' | 'normal' | 'proof' };
    game: {
      recovery: { active: string | null; afterwordProgress: number; afterwordReady: boolean; afterwordReadyUntil: number; afterwordRecoveryUntil: number; feedbackUntil: number };
      echoForecast: { available: boolean; feedbackUntil: number; source: string | null };
      metrics: { damage: number; echoForecasts: number };
      player: { x: number; y: number };
      bullets: Array<{ id: number; x: number; y: number; vx: number; vy: number; radius: number; kind: 'enemy'; annotated: boolean; capturable: boolean; sourceAttack: 'enemy-sniper' }>;
      nextId: number;
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
  await page.locator('#game').screenshot({ path: '../docs/evidence/v4.2-01-recovery-hud.png' });
});

test('ECHO forecasts the first collision and shows an actionable evade cue', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => (window as unknown as RecoveryQa).__PALIMPSEST_ASSETS_READY__);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.evaluate(() => {
    const qa = window as unknown as RecoveryQa;
    const app = qa.__PALIMPSEST_APP_STATE__();
    app.settings.difficulty = 'echo';
    app.game.bullets.push({
      id: app.game.nextId++, x: app.game.player.x, y: app.game.player.y,
      vx: 0, vy: 0, radius: 8, kind: 'enemy', annotated: false,
      capturable: true, sourceAttack: 'enemy-sniper'
    });
    qa.__PALIMPSEST_ADVANCE__(1);
  });
  const result = await page.evaluate(() => {
    const game = (window as unknown as RecoveryQa).__PALIMPSEST_APP_STATE__().game;
    return { forecast: game.echoForecast, damage: game.metrics.damage, forecasts: game.metrics.echoForecasts, tick: game.tick };
  });
  expect(result.damage).toBe(0);
  expect(result.forecasts).toBe(1);
  expect(result.forecast.available).toBe(false);
  expect(result.forecast.feedbackUntil).toBeGreaterThan(result.tick);
  await page.locator('#game').screenshot({ path: '../docs/evidence/v4.2-05-echo-forecast.png' });
});
