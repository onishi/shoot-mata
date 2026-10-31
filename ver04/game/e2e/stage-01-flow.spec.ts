import { expect, test } from '@playwright/test';

type Screen = 'title' | 'guide' | 'stage-intro' | 'playing' | 'paused' | 'continue' | 'result';
type QaWindow = Window & {
  __PALIMPSEST_ASSETS_READY__: Promise<unknown>;
  __PALIMPSEST_AUTOPLAY__: (ticks: number) => number;
  __PALIMPSEST_ADVANCE__: (ticks: number) => number;
  __PALIMPSEST_APP_STATE__: () => { screen: Screen; continuesRemaining: number; checkpointName: string; game: { stageId: string; tick: number; player: { health: number }; gauge: number } };
  __PALIMPSEST_STATE__: () => { bullets: unknown[]; trail: unknown[]; candidate: unknown; metrics: { loops: number; retraces: number } };
  __PALIMPSEST_QA_SCENARIO__: (scenario: 'damage' | 'setpiece' | 'stage-02-combat' | 'stage-02-setpiece' | 'stage-03-combat' | 'stage-03-setpiece' | 'stage-03-boss' | 'stage-04-combat' | 'stage-04-setpiece' | 'stage-04-boss' | 'boss-gate' | 'boss-defeat' | 'stage-02-boss') => Screen;
  __PALIMPSEST_AUDIO_READY__: () => Promise<void>;
  __PALIMPSEST_AUDIO_STATE__: () => { state: string; loaded: number; stems: number; stemStage: string | null; active: number; busLevels: Record<string, number>; cueCounts: Record<string, number> };
  __PALIMPSEST_AUDIO_BUS__: (bus: 'music' | 'se' | 'ui' | 'environment', level: number) => void;
};

test('campaign audio starts from a gesture, separates buses and follows every stage transition', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_STATE__().state)).toBe('uninitialized');
  await page.keyboard.press('Enter');
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_READY__());
  expect(await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_STATE__())).toMatchObject({ state: 'running', loaded: 41, stems: 0 });
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_STATE__().stems)).toBe(3);
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_BUS__('music', 0));
  const isolated = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_STATE__().busLevels);
  expect(isolated.music).toBe(0);
  expect(isolated.se).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_STATE__().stems)).toBe(0);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_STATE__().stems)).toBe(3);

  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('boss-gate'));
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('boss-defeat'));
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_STATE__().stemStage)).toBe('stage-02');
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-02-boss'));
  const stageTwoAudio = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_STATE__());
  expect(stageTwoAudio.stems).toBe(3);
  expect(stageTwoAudio.cueCounts['compiler-phase']).toBeGreaterThan(0);
  expect(stageTwoAudio.cueCounts['wind-lock']).toBeGreaterThan(0);
  expect(stageTwoAudio.cueCounts['seam-exposed']).toBeGreaterThan(0);

  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('boss-defeat'));
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_STATE__().stemStage)).toBe('stage-03');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_STATE__().stems)).toBe(0);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_STATE__().stemStage)).toBe('stage-03');
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-03-combat'));
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-03-setpiece'));
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-03-boss'));
  const stageThreeAudio = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_STATE__());
  expect(stageThreeAudio.stems).toBe(3);
  expect(stageThreeAudio.cueCounts['rain-wet']).toBeGreaterThan(0);
  expect(stageThreeAudio.cueCounts['basin-surge']).toBeGreaterThan(0);
  expect(stageThreeAudio.cueCounts['wet-annotation']).toBeGreaterThan(0);
  expect(stageThreeAudio.cueCounts['eel-phase']).toBeGreaterThan(0);
  expect(stageThreeAudio.cueCounts['eel-marked']).toBeGreaterThan(0);
  expect(stageThreeAudio.cueCounts['eel-hit']).toBeGreaterThan(0);

  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('boss-defeat'));
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_STATE__().stemStage)).toBe('stage-04');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_STATE__().stems)).toBe(0);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_STATE__().stemStage)).toBe('stage-04');
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-04-combat'));
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-04-setpiece'));
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-04-boss'));
  const stageFourAudio = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_AUDIO_STATE__());
  expect(stageFourAudio.stems).toBe(3);
  expect(stageFourAudio.cueCounts['heat-wave']).toBeGreaterThan(0);
  expect(stageFourAudio.cueCounts['cooling-field']).toBeGreaterThan(0);
  expect(stageFourAudio.cueCounts['courier-convert']).toBeGreaterThan(0);
  expect(stageFourAudio.cueCounts['ember-cooled']).toBeGreaterThan(0);
  expect(stageFourAudio.cueCounts['wall-hit']).toBeGreaterThan(0);
  expect(stageFourAudio.cueCounts['advocate-phase']).toBeGreaterThan(0);
});

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
  expect(bossGate.checkpointName).toBe('bailiff-gate');
  await scenario('boss-defeat');
  expect(await screen()).toBe('result');
  await canvas.screenshot({ path: '../docs/evidence/m2-03-result.png' });
  await page.keyboard.press('Enter');
  expect(await screen()).toBe('stage-intro');
  expect((await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__())).game).toMatchObject({ tick: 0 });
});

test('campaign advances through Stage 4, restores its checkpoints and preserves earlier flow', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('#game');
  const screen = () => page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__().screen);
  const scenario = (name: 'damage' | 'boss-gate' | 'boss-defeat') => page.evaluate((value) => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__(value), name);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await scenario('boss-gate');
  await scenario('boss-defeat');
  await page.keyboard.press('Enter');
  let state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__()) as unknown as { screen: Screen; checkpointName: string; continuesRemaining: number; game: { stageId: string; tick: number; player: { health: number }; gauge: number } };
  expect(state).toMatchObject({ screen: 'stage-intro', checkpointName: 'crosswind-entry', continuesRemaining: 1, game: { stageId: 'stage-02', tick: 0 } });
  await canvas.screenshot({ path: '../docs/evidence/m3-03-stage-02-intro.png' });
  await page.keyboard.press('Enter');

  await scenario('damage');
  expect(await screen()).toBe('continue');
  await page.keyboard.press('Enter');
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__()) as typeof state;
  expect(state).toMatchObject({ screen: 'stage-intro', checkpointName: 'crosswind-entry', continuesRemaining: 0, game: { stageId: 'stage-02', tick: 0, player: { health: 3 }, gauge: 50 } });
  await page.keyboard.press('Enter');

  await scenario('boss-gate');
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__()) as typeof state;
  expect(state.checkpointName).toBe('compiler-gate');
  await page.keyboard.press('Escape');
  const pausedTick = (await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__())).game.tick;
  await page.waitForTimeout(80);
  expect((await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__())).game.tick).toBe(pausedTick);
  await page.keyboard.press('Escape');
  await scenario('boss-defeat');
  expect(await screen()).toBe('result');
  await canvas.screenshot({ path: '../docs/evidence/m3-03-stage-02-result.png' });
  await page.keyboard.press('Enter');
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__()) as typeof state;
  expect(state).toMatchObject({ screen: 'stage-intro', checkpointName: 'rain-gallery-entry', continuesRemaining: 1, game: { stageId: 'stage-03', tick: 0 } });
  await canvas.screenshot({ path: '../docs/evidence/m3-08-stage-03-intro.png' });
  await page.keyboard.press('Enter');

  await scenario('damage');
  expect(await screen()).toBe('continue');
  const continueTick = (await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__())).game.tick;
  await page.waitForTimeout(80);
  expect((await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__())).game.tick).toBe(continueTick);
  await page.keyboard.press('Enter');
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__()) as typeof state;
  expect(state).toMatchObject({ screen: 'stage-intro', checkpointName: 'rain-gallery-entry', continuesRemaining: 0, game: { stageId: 'stage-03', tick: 0, player: { health: 3 }, gauge: 50 } });
  await page.keyboard.press('Enter');
  await scenario('boss-gate');
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__()) as typeof state;
  expect(state).toMatchObject({ screen: 'playing', checkpointName: 'eel-gate', game: { stageId: 'stage-03' } });
  expect(state.game.tick).toBeGreaterThanOrEqual(23400);
  await page.keyboard.press('Escape');
  const stageThreePausedTick = (await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__())).game.tick;
  await page.waitForTimeout(80);
  expect((await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__())).game.tick).toBe(stageThreePausedTick);
  await page.keyboard.press('Escape');
  await scenario('boss-defeat');
  expect(await screen()).toBe('result');
  await canvas.screenshot({ path: '../docs/evidence/m3-08-stage-03-result.png' });
  await page.keyboard.press('Enter');
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__()) as typeof state;
  expect(state).toMatchObject({ screen: 'stage-intro', checkpointName: 'burnt-footnote-entry', continuesRemaining: 1, game: { stageId: 'stage-04', tick: 0 } });
  await canvas.screenshot({ path: '../docs/evidence/m3-13-stage-04-intro.png' });
  await page.keyboard.press('Enter');

  await scenario('damage');
  expect(await screen()).toBe('continue');
  const stageFourContinueTick = (await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__())).game.tick;
  await page.waitForTimeout(80);
  expect((await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__())).game.tick).toBe(stageFourContinueTick);
  await page.keyboard.press('Enter');
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__()) as typeof state;
  expect(state).toMatchObject({ screen: 'stage-intro', checkpointName: 'burnt-footnote-entry', continuesRemaining: 0, game: { stageId: 'stage-04', tick: 0, player: { health: 3 }, gauge: 50 } });
  await page.keyboard.press('Enter');
  await scenario('boss-gate');
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__()) as typeof state;
  expect(state).toMatchObject({ screen: 'playing', checkpointName: 'advocate-gate', game: { stageId: 'stage-04' } });
  expect(state.game.tick).toBeGreaterThanOrEqual(23400);
  await page.keyboard.press('Escape');
  const stageFourPausedTick = (await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__())).game.tick;
  await page.waitForTimeout(80);
  expect((await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__())).game.tick).toBe(stageFourPausedTick);
  await page.keyboard.press('Escape');
  await scenario('boss-defeat');
  expect(await screen()).toBe('result');
  await canvas.screenshot({ path: '../docs/evidence/m3-13-stage-04-result.png' });
  await page.keyboard.press('Enter');
  expect(await screen()).toBe('title');

  // A fresh voyage verifies the independent per-stage revision at the second
  // Stage 3 boss checkpoint as well; the first half spent its revision at entry.
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await scenario('boss-gate');
  await scenario('boss-defeat');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await scenario('boss-gate');
  await scenario('boss-defeat');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await scenario('boss-gate');
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__()) as typeof state;
  expect(state).toMatchObject({ screen: 'playing', checkpointName: 'eel-gate', continuesRemaining: 1, game: { stageId: 'stage-03' } });
  await scenario('damage');
  expect(await screen()).toBe('continue');
  await page.keyboard.press('Enter');
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__()) as typeof state;
  expect(state).toMatchObject({ screen: 'stage-intro', checkpointName: 'eel-gate', continuesRemaining: 0, game: { stageId: 'stage-03', tick: 23400, player: { health: 3 }, gauge: 50 } });
  await page.keyboard.press('Enter');
  await scenario('boss-defeat');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await scenario('boss-gate');
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__()) as typeof state;
  expect(state).toMatchObject({ screen: 'playing', checkpointName: 'advocate-gate', continuesRemaining: 1, game: { stageId: 'stage-04' } });
  await scenario('damage');
  expect(await screen()).toBe('continue');
  await page.keyboard.press('Enter');
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_APP_STATE__()) as typeof state;
  expect(state).toMatchObject({ screen: 'stage-intro', checkpointName: 'advocate-gate', continuesRemaining: 0, game: { stageId: 'stage-04', tick: 23400, player: { health: 3 }, gauge: 50 } });
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

test('Stage 2 Compiler preview shows the locked vane and exposed opposite seam', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_ASSETS_READY__);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-02-boss'));
  const state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_STATE__()) as unknown as {
    stageId: string; boss: { kind: string; windLockedUntil: number; seamExposedUntil: number }; tick: number;
    metrics: { compiler: { windLocks: number } };
  };
  expect(state.stageId).toBe('stage-02');
  expect(state.boss.kind).toBe('crosswind-compiler');
  expect(state.metrics.compiler.windLocks).toBeGreaterThan(0);
  expect(state.boss.windLockedUntil).toBeGreaterThanOrEqual(state.tick);
  expect(state.boss.seamExposedUntil).toBeGreaterThanOrEqual(state.tick);
  await page.locator('#game').screenshot({ path: '../docs/evidence/m3-02-crosswind-compiler.png' });
});

test('Stage 2 final visuals remain readable in combat, Tab Binder set piece and all Compiler phases', async ({ page }) => {
  const canvas = page.locator('#game');
  const begin = async (): Promise<void> => {
    await page.goto('/');
    await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_ASSETS_READY__);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
  };

  await begin();
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-02-combat'));
  await canvas.screenshot({ path: '../docs/evidence/m3-04-stage-02-combat.png' });

  await begin();
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-02-setpiece'));
  await canvas.screenshot({ path: '../docs/evidence/m3-04-stage-02-setpiece.png' });

  await begin();
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-02-boss'));
  await canvas.screenshot({ path: '../docs/evidence/m3-04-compiler-phase-1.png' });
  await page.evaluate(() => {
    const state = (window as unknown as QaWindow).__PALIMPSEST_STATE__() as unknown as { boss: { phase: number; vaneSide: number } };
    state.boss.phase = 2; state.boss.vaneSide = 1;
  });
  await page.waitForTimeout(50);
  await canvas.screenshot({ path: '../docs/evidence/m3-04-compiler-phase-2.png' });
  await page.evaluate(() => {
    const state = (window as unknown as QaWindow).__PALIMPSEST_STATE__() as unknown as { boss: { phase: number; vaneSide: number } };
    state.boss.phase = 3; state.boss.vaneSide = -1;
  });
  await page.waitForTimeout(50);
  await canvas.screenshot({ path: '../docs/evidence/m3-04-compiler-phase-3.png' });
});

test('Stage 3 final visuals expose rain, wet trail and water-gate roles', async ({ page }) => {
  await page.goto('/'); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-03-combat'));
  let state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_STATE__()) as unknown as {
    stageId: string; metrics: { rain: { trailPointsWetted: number; wetTrailPeak: number } };
  };
  expect(state.stageId).toBe('stage-03'); expect(state.metrics.rain.trailPointsWetted).toBeGreaterThan(0);
  expect(state.metrics.rain.wetTrailPeak).toBeGreaterThan(0);
  await page.locator('#game').screenshot({ path: '../docs/evidence/m3-09-stage-03-combat.png' });
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-03-setpiece'));
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_STATE__()) as unknown as typeof state;
  expect(state.metrics.rain.wetTrailPeak).toBeGreaterThan(0);
  await page.locator('#game').screenshot({ path: '../docs/evidence/m3-09-stage-03-setpiece.png' });
});

test('LACUNA EEL final visuals show its three sequential marked phases', async ({ page }) => {
  await page.goto('/'); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-03-boss'));
  let state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_STATE__()) as unknown as {
    boss: { kind: string; phase: number; segmentMarkedUntil: number } | null; tick: number;
    metrics: { eel: { segmentMarks: number; phaseReached: boolean[] } };
  };
  expect(state.boss?.kind).toBe('lacuna-eel'); expect(state.metrics.eel.segmentMarks).toBeGreaterThan(0);
  expect(state.boss!.segmentMarkedUntil).toBeGreaterThanOrEqual(state.tick);
  await page.locator('#game').screenshot({ path: '../docs/evidence/m3-09-lacuna-eel-phase-1.png' });
  await page.evaluate(() => {
    const state = (window as unknown as QaWindow).__PALIMPSEST_STATE__() as unknown as {
      tick: number; boss: { phase: number; activeSegment: number; health: number; segmentMarkedUntil: number };
      metrics: { eel: { phaseReached: boolean[] } };
    };
    state.boss.phase = 2; state.boss.activeSegment = 1; state.boss.health = 1100; state.boss.segmentMarkedUntil = state.tick + 720;
    state.metrics.eel.phaseReached = [true, true, false];
  });
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_ADVANCE__(30));
  await page.waitForTimeout(50);
  await page.locator('#game').screenshot({ path: '../docs/evidence/m3-09-lacuna-eel-phase-2.png' });
  await page.evaluate(() => {
    const state = (window as unknown as QaWindow).__PALIMPSEST_STATE__() as unknown as {
      tick: number; boss: { phase: number; activeSegment: number; health: number; segmentMarkedUntil: number };
      metrics: { eel: { phaseReached: boolean[] } };
    };
    state.boss.phase = 3; state.boss.activeSegment = 2; state.boss.health = 500; state.boss.segmentMarkedUntil = state.tick + 720;
    state.metrics.eel.phaseReached = [true, true, true];
  });
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_ADVANCE__(30));
  await page.waitForTimeout(50);
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_STATE__()) as unknown as typeof state;
  expect(state.metrics.eel.phaseReached).toEqual([true, true, true]);
  expect(state.boss?.phase).toBe(3);
  await page.locator('#game').screenshot({ path: '../docs/evidence/m3-09-lacuna-eel-phase-3.png' });
});

test('Stage 4 final visuals expose heat erosion, cooling shadow and all four enemy roles', async ({ page }) => {
  await page.goto('/'); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-04-combat'));
  let state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_STATE__()) as unknown as {
    stageId: string; metrics: { heat: { trailPointsBurned: number; trailPointsCooled: number; coolingCollates: number; courierConversions: number } };
  };
  expect(state.stageId).toBe('stage-04');
  expect(state.metrics.heat.trailPointsBurned).toBeGreaterThan(0);
  expect(state.metrics.heat.trailPointsCooled).toBeGreaterThan(0);
  expect(state.metrics.heat.coolingCollates).toBeGreaterThan(0);
  await page.locator('#game').screenshot({ path: '../docs/evidence/m3-14-stage-04-combat.png' });

  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-04-setpiece'));
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_STATE__()) as unknown as typeof state;
  expect(state.metrics.heat.trailPointsBurned).toBeGreaterThan(0);
  expect(state.metrics.heat.trailPointsCooled).toBeGreaterThan(0);
  await page.locator('#game').screenshot({ path: '../docs/evidence/m3-14-stage-04-setpiece.png' });
});

test('CINDER ADVOCATE final visuals show its permanent heat wall, cooled counterfire and all phases', async ({ page }) => {
  await page.goto('/'); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_QA_SCENARIO__('stage-04-boss'));
  let state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_STATE__()) as unknown as {
    tick: number; boss: { kind: string; phase: number; health: number; cycleStartedAt: number } | null;
    bullets: Array<{ sourceAttack?: string; cooledEmber?: boolean }>;
    metrics: { advocate: { embersCooled: number; cooledHits: number; wallActiveTicks: number; phaseReached: boolean[] } };
  };
  expect(state.boss?.kind).toBe('cinder-advocate');
  expect(state.metrics.advocate.embersCooled).toBeGreaterThan(0);
  expect(state.metrics.advocate.cooledHits).toBeGreaterThan(0);
  expect(state.metrics.advocate.wallActiveTicks).toBeGreaterThan(0);
  expect(state.bullets.some((bullet) => bullet.cooledEmber)).toBe(true);
  await page.evaluate(() => {
    const state = (window as unknown as QaWindow).__PALIMPSEST_STATE__() as unknown as {
      tick: number; boss: { phase: number; health: number; phaseStartedAt: number; cycleStartedAt: number };
      bullets: Array<{ x: number; y: number; cooledEmber?: boolean }>;
      metrics: { advocate: { phaseReached: boolean[] } };
    };
    state.boss.phase = 1; state.boss.health = 1700; state.boss.phaseStartedAt = state.tick; state.boss.cycleStartedAt = state.tick;
    state.metrics.advocate.phaseReached = [true, false, false];
    const cooled = state.bullets.find((bullet) => bullet.cooledEmber);
    if (cooled) { cooled.x = 730 * 256; cooled.y = 175 * 256; }
  });
  await page.waitForTimeout(20);
  await page.locator('#game').screenshot({ path: '../docs/evidence/m3-14-cinder-advocate-phase-1.png' });

  await page.evaluate(() => {
    const state = (window as unknown as QaWindow).__PALIMPSEST_STATE__() as unknown as {
      tick: number; boss: { phase: number; health: number; phaseStartedAt: number; cycleStartedAt: number };
      metrics: { advocate: { phaseReached: boolean[] } };
    };
    state.boss.phase = 2; state.boss.health = 1100; state.boss.phaseStartedAt = state.tick; state.boss.cycleStartedAt = state.tick;
    state.metrics.advocate.phaseReached = [true, true, false];
  });
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_ADVANCE__(90));
  await page.locator('#game').screenshot({ path: '../docs/evidence/m3-14-cinder-advocate-phase-2.png' });

  await page.evaluate(() => {
    const state = (window as unknown as QaWindow).__PALIMPSEST_STATE__() as unknown as {
      tick: number; boss: { phase: number; health: number; phaseStartedAt: number; cycleStartedAt: number };
      metrics: { advocate: { phaseReached: boolean[] } };
    };
    state.boss.phase = 3; state.boss.health = 500; state.boss.phaseStartedAt = state.tick; state.boss.cycleStartedAt = state.tick;
    state.metrics.advocate.phaseReached = [true, true, true];
  });
  await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_ADVANCE__(170));
  await page.waitForTimeout(50);
  state = await page.evaluate(() => (window as unknown as QaWindow).__PALIMPSEST_STATE__()) as unknown as typeof state;
  expect(state.boss?.phase).toBe(3);
  expect(state.bullets.some((bullet) => bullet.sourceAttack === 'advocate-verdict')).toBe(true);
  await page.locator('#game').screenshot({ path: '../docs/evidence/m3-14-cinder-advocate-phase-3.png' });
});
