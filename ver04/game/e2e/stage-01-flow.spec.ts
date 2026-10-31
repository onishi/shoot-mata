import { expect, test } from '@playwright/test';

type Screen = 'title' | 'guide' | 'stage-intro' | 'playing' | 'paused' | 'continue' | 'result';
type QaWindow = Window & {
  __PALIMPSEST_ASSETS_READY__: Promise<unknown>;
  __PALIMPSEST_AUTOPLAY__: (ticks: number) => number;
  __PALIMPSEST_APP_STATE__: () => { screen: Screen; continuesRemaining: number; checkpointName: string; game: { tick: number; player: { health: number }; gauge: number } };
  __PALIMPSEST_STATE__: () => { bullets: unknown[]; trail: unknown[]; candidate: unknown; metrics: { loops: number; retraces: number } };
  __PALIMPSEST_QA_SCENARIO__: (scenario: 'damage' | 'setpiece' | 'boss-gate' | 'boss-defeat') => Screen;
};

test('Stage 1 title-to-result keyboard flow, continue and focus pause work in Chrome', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/PALIMPSEST WAKE/);
  const canvas = page.locator('#game');
  await expect(canvas).toBeVisible();
  const screen = () => page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__().screen);
  const scenario = (name: 'damage' | 'setpiece' | 'boss-gate' | 'boss-defeat') => page.evaluate((value) => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__(value), name);
  const hold = async (key: string, milliseconds: number): Promise<void> => {
    await page.keyboard.down(key); await page.waitForTimeout(milliseconds); await page.keyboard.up(key);
  };

  expect(await screen()).toBe('title');
  await canvas.screenshot({ path: '../docs/evidence/m2-03-title.png' });
  await page.keyboard.press('KeyG');
  expect(await screen()).toBe('guide');
  await canvas.screenshot({ path: '../docs/evidence/m2-03-guide.png' });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');
  expect(await screen()).toBe('stage-intro');
  await page.keyboard.press('Enter');
  expect(await screen()).toBe('playing');

  await hold('ArrowUp', 400); await hold('ArrowRight', 400); await hold('ArrowDown', 350); await hold('ArrowLeft', 500);
  await hold('KeyZ', 100);
  const playState = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_STATE__());
  expect(playState.bullets.length).toBeGreaterThan(0);
  expect(playState.trail.length).toBeGreaterThan(10);
  expect(Boolean(playState.candidate)).toBe(true);
  await page.keyboard.press('KeyX');
  await page.waitForTimeout(100);
  expect((await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_STATE__().metrics.loops))).toBe(1);
  await hold('ArrowDown', 150);
  await page.keyboard.press('KeyC');
  await page.waitForTimeout(100);
  expect((await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_STATE__().metrics.retraces))).toBe(1);

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect(await screen()).toBe('paused');
  const pausedTick = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__().game.tick);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__().game.tick)).toBe(pausedTick);
  await page.keyboard.press('Escape');
  expect(await screen()).toBe('playing');

  await scenario('damage');
  expect(await screen()).toBe('continue');
  await canvas.screenshot({ path: '../docs/evidence/m2-03-continue.png' });
  await page.keyboard.press('Enter');
  const restored = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__());
  expect(restored.screen).toBe('stage-intro');
  expect(restored.continuesRemaining).toBe(0);
  expect(restored.game.player.health).toBe(3);
  expect(restored.game.gauge).toBe(50);
  await page.keyboard.press('Enter');

  await scenario('boss-gate');
  const bossGate = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__());
  expect(bossGate.checkpointName).toBe('boss-gate');
  await scenario('boss-defeat');
  expect(await screen()).toBe('result');
  await canvas.screenshot({ path: '../docs/evidence/m2-03-result.png' });
  await page.keyboard.press('Enter');
  expect(await screen()).toBe('title');
});

test('Stage 1 final visual assets remain readable in combat, set piece and boss phases', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_ASSETS_READY__);
  const canvas = page.locator('#game');
  const scenario = (name: 'setpiece' | 'boss-gate') => page.evaluate((value) => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__(value), name);

  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUTOPLAY__(500));
  await canvas.screenshot({ path: '../docs/evidence/m2-04-combat.png' });

  await scenario('setpiece');
  await canvas.screenshot({ path: '../docs/evidence/m2-04-setpiece.png' });

  await page.reload();
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_ASSETS_READY__);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await scenario('boss-gate');
  await canvas.screenshot({ path: '../docs/evidence/m2-04-boss-phase-1.png' });
  await page.evaluate(() => {
    const boss = (window as unknown as QaWindow).__PALIMPSEST_STATE__() as unknown as { boss: { phase: number; armorLayers: number; armor: number } };
    boss.boss.phase = 3;
    boss.boss.armorLayers = 0;
    boss.boss.armor = 0;
  });
  await page.waitForTimeout(50);
  await canvas.screenshot({ path: '../docs/evidence/m2-04-boss-phase-3.png' });
});
