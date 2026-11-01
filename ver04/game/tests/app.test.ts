import { describe, expect, it } from 'vitest';
import { advance, autoPause, createAppState, transition, type AppState } from '../src/app/app';
import { STAGE_01_BOSS_START_TICK, STAGE_01_SPAWNS } from '../src/content/stage-01';
import { STAGE_02_BOSS_START_TICK, STAGE_02_SPAWNS } from '../src/content/stage-02';
import { STAGE_03_BOSS_START_TICK, STAGE_03_SPAWNS } from '../src/content/stage-03';
import { STAGE_04_BOSS_START_TICK, STAGE_04_SPAWNS } from '../src/content/stage-04';
import { STAGE_05_BOSS_START_TICK, STAGE_05_SPAWNS } from '../src/content/stage-05';
import { STAGE_06_BOSS_START_TICK, STAGE_06_SPAWNS } from '../src/content/stage-06';
import { px } from '../src/core/math';

const start = (): AppState => transition(transition(createAppState(404), 'start'), 'confirm');
const chooseMarginalia = (state: AppState): AppState => transition(transition(state, 'confirm'), 'confirm');

const fatalHit = (state: AppState): AppState => {
  state.game.player.health = 1;
  state.game.player.invulnerableUntil = 0;
  state.game.bullets = [{ id: state.game.nextId++, x: state.game.player.x, y: state.game.player.y, vx: 0, vy: 0, radius: 8, kind: 'enemy', annotated: false, capturable: true }];
  return advance(state).state;
};

describe('M2 application flow', () => {
  it('pauses once at the Stage midpoint, applies a note, and resumes the same tick', () => {
    let app = start();
    app.game.tick = STAGE_01_BOSS_START_TICK / 2 - 1;
    app = advance(app).state;
    expect(app.screen).toBe('marginalia');
    expect(app.marginaliaMoment).toBe('midpoint');
    const stoppedTick = app.game.tick;
    app.game.player.health = 1;
    expect(advance(app).state.game.tick).toBe(stoppedTick);
    app = transition(app, 'confirm');
    expect(app.screen).toBe('playing');
    expect(app.midpointMarginaliaTaken).toBe(true);
    expect(app.marginalia).toHaveLength(1);
    expect(app.game.player.health).toBe(3);
    app = advance(app).state;
    expect(app.game.tick).toBe(stoppedTick + 1);
  });
  it('connects title, guide, intro, play and pause without advancing simulation on overlays', () => {
    let app = createAppState();
    app = transition(app, 'guide');
    expect(app.screen).toBe('guide');
    const tick = app.game.tick;
    expect(advance(app).state.game.tick).toBe(tick);
    app = transition(app, 'back');
    app = transition(app, 'start');
    expect(app.screen).toBe('stage-intro');
    app = transition(app, 'confirm');
    app = advance(app, { fire: true }).state;
    expect(app.game.tick).toBe(1);
    app = transition(app, 'pause');
    expect(advance(app).state.game.tick).toBe(1);
    expect(transition(app, 'pause').screen).toBe('playing');
  });

  it('stops at zero health and spends the single continue to restore the harbor checkpoint', () => {
    let app = fatalHit(start());
    expect(app.screen).toBe('continue');
    expect(app.game.player.health).toBe(0);
    const stoppedTick = app.game.tick;
    expect(advance(app).state.game.tick).toBe(stoppedTick);
    app = transition(app, 'confirm');
    expect(app.screen).toBe('stage-intro');
    expect(app.continuesRemaining).toBe(0);
    expect(app.game.player.health).toBe(3);
    expect(app.game.gauge).toBe(50);
    expect(app.game.tick).toBe(0);
    app = transition(app, 'confirm');
    app = fatalHit(app);
    expect(app.continuesRemaining).toBe(0);
    expect(transition(app, 'confirm').screen).toBe('title');
  });

  it('records the boss gate and restores it without stale enemy fire', () => {
    let app = start();
    app.game.tick = STAGE_01_BOSS_START_TICK - 1;
    app.game.encounterIndex = STAGE_01_SPAWNS.length;
    app.game.enemies = [];
    app = advance(app).state;
    expect(app.checkpointName).toBe('bailiff-gate');
    expect(app.checkpoint.tick).toBe(STAGE_01_BOSS_START_TICK);
    app.game.player.x = px(500);
    app = fatalHit(app);
    app = transition(app, 'confirm');
    expect(app.game.tick).toBe(STAGE_01_BOSS_START_TICK);
    expect(app.game.player.x).not.toBe(px(500));
    expect(app.game.bullets.filter((bullet) => bullet.kind === 'enemy')).toHaveLength(0);
    expect(app.game.boss).not.toBeNull();
  });

  it('continues from the Stage 1 result into a fresh Stage 2 voyage', () => {
    let app = start();
    app.game.tick = STAGE_01_BOSS_START_TICK - 1;
    app.game.encounterIndex = STAGE_01_SPAWNS.length;
    app.game.enemies = [];
    app = advance(app).state;
    app.game.boss!.armorLayers = 0;
    app.game.boss!.health = 1;
    app.game.bullets = [{ id: app.game.nextId++, x: app.game.boss!.x, y: app.game.boss!.y, vx: 0, vy: 0, radius: 5, kind: 'return', annotated: true, capturable: false }];
    app = advance(app).state;
    app = transition(app, 'confirm');
    expect(app.screen).toBe('marginalia');
    expect(advance(app).state.game.tick).toBe(app.game.tick);
    app = transition(app, 'confirm');
    expect(app.screen).toBe('stage-intro');
    expect(app.game.stageId).toBe('stage-02');
    expect(app.game.tick).toBe(0);
    expect(app.checkpointName).toBe('crosswind-entry');
    expect(app.continuesRemaining).toBe(1);
  });

  it('restores both Stage 2 checkpoints and stops on every overlay', () => {
    let app = start();
    app.game.metrics.boss.defeated = true;
    app.screen = 'result';
    app = chooseMarginalia(app);
    expect(app.game.stageId).toBe('stage-02');
    app = transition(app, 'confirm');
    app = fatalHit(app);
    expect(app.screen).toBe('continue');
    const entryTick = app.game.tick;
    expect(advance(app).state.game.tick).toBe(entryTick);
    app = transition(transition(app, 'confirm'), 'confirm');
    expect(app.game.tick).toBe(0);
    expect(app.game.player.health).toBe(3);

    app.game.tick = STAGE_02_BOSS_START_TICK - 1;
    app.game.encounterIndex = STAGE_02_SPAWNS.length;
    app.game.enemies = [];
    app = advance(app).state;
    expect(app.checkpointName).toBe('compiler-gate');
    expect(app.checkpoint.tick).toBe(STAGE_02_BOSS_START_TICK);
    app.game.player.x = px(500);
    app.continuesRemaining = 1;
    app = fatalHit(app);
    app = transition(app, 'confirm');
    expect(app.screen).toBe('stage-intro');
    expect(app.game.tick).toBe(STAGE_02_BOSS_START_TICK);
    expect(app.game.player.x).not.toBe(px(500));
    expect(app.game.bullets.filter((bullet) => bullet.kind === 'enemy')).toHaveLength(0);
    expect(app.game.boss?.kind).toBe('crosswind-compiler');
  });

  it('continues from Stage 2 through Stage 3 and restores both rain-gallery checkpoints', () => {
    let app = start();
    app.game.metrics.boss.defeated = true;
    app.screen = 'result';
    app = chooseMarginalia(app);
    app.game.metrics.boss.defeated = true;
    app.screen = 'result';
    app = chooseMarginalia(app);
    expect(app).toMatchObject({ screen: 'stage-intro', checkpointName: 'rain-gallery-entry', continuesRemaining: 1 });
    expect(app.game).toMatchObject({ stageId: 'stage-03', tick: 0 });

    app = transition(app, 'confirm');
    app = fatalHit(app);
    expect(app.screen).toBe('continue');
    const stoppedTick = app.game.tick;
    expect(advance(app).state.game.tick).toBe(stoppedTick);
    app = transition(app, 'confirm');
    expect(app).toMatchObject({ screen: 'stage-intro', checkpointName: 'rain-gallery-entry', continuesRemaining: 0 });
    expect(app.game).toMatchObject({ stageId: 'stage-03', tick: 0, gauge: 50, player: { health: 3 } });

    app = transition(app, 'confirm');
    app.game.tick = STAGE_03_BOSS_START_TICK - 1;
    app.game.encounterIndex = STAGE_03_SPAWNS.length;
    app.game.enemies = [];
    app = advance(app).state;
    expect(app.checkpointName).toBe('eel-gate');
    expect(app.checkpoint.tick).toBe(STAGE_03_BOSS_START_TICK);
    app.game.player.x = px(500);
    app.continuesRemaining = 1;
    app = fatalHit(app);
    app = transition(app, 'confirm');
    expect(app.screen).toBe('stage-intro');
    expect(app.game.tick).toBe(STAGE_03_BOSS_START_TICK);
    expect(app.game.player.x).not.toBe(px(500));
    expect(app.game.bullets.filter((bullet) => bullet.kind === 'enemy')).toHaveLength(0);
    expect(app.game.boss?.kind).toBe('lacuna-eel');
  });

  it('continues from Stage 3 through Stage 4 and restores both burnt-footnote checkpoints', () => {
    let app = start();
    for (const stageId of ['stage-01', 'stage-02', 'stage-03'] as const) {
      expect(app.game.stageId).toBe(stageId);
      app.game.metrics.boss.defeated = true;
      app.screen = 'result';
      app = chooseMarginalia(app);
    }
    expect(app).toMatchObject({ screen: 'stage-intro', checkpointName: 'burnt-footnote-entry', continuesRemaining: 1 });
    expect(app.game).toMatchObject({ stageId: 'stage-04', tick: 0 });

    app = transition(app, 'confirm');
    app = fatalHit(app);
    expect(app.screen).toBe('continue');
    const stoppedTick = app.game.tick;
    expect(advance(app).state.game.tick).toBe(stoppedTick);
    app = transition(app, 'confirm');
    expect(app).toMatchObject({ screen: 'stage-intro', checkpointName: 'burnt-footnote-entry', continuesRemaining: 0 });
    expect(app.game).toMatchObject({ stageId: 'stage-04', tick: 0, gauge: 50, player: { health: 3 } });

    app = transition(app, 'confirm');
    app.game.tick = STAGE_04_BOSS_START_TICK - 1;
    app.game.encounterIndex = STAGE_04_SPAWNS.length;
    app.game.enemies = [];
    app = advance(app).state;
    expect(app.checkpointName).toBe('advocate-gate');
    expect(app.checkpoint.tick).toBe(STAGE_04_BOSS_START_TICK);
    app.game.player.x = px(500);
    app.continuesRemaining = 1;
    app = fatalHit(app);
    app = transition(app, 'confirm');
    expect(app.screen).toBe('stage-intro');
    expect(app.game.tick).toBe(STAGE_04_BOSS_START_TICK);
    expect(app.game.player.x).not.toBe(px(500));
    expect(app.game.bullets.filter((bullet) => bullet.kind === 'enemy')).toHaveLength(0);
    expect(app.game.boss?.kind).toBe('cinder-advocate');
  });

  it('continues from Stage 4 through Stage 5 and restores both mirror-chamber checkpoints', () => {
    let app = start();
    for (const stageId of ['stage-01', 'stage-02', 'stage-03', 'stage-04'] as const) {
      expect(app.game.stageId).toBe(stageId);
      app.game.metrics.boss.defeated = true;
      app.screen = 'result';
      app = chooseMarginalia(app);
    }
    expect(app).toMatchObject({ screen: 'stage-intro', checkpointName: 'mirror-chamber-entry', continuesRemaining: 1 });
    expect(app.game).toMatchObject({ stageId: 'stage-05', tick: 0 });

    app = transition(app, 'confirm');
    app = fatalHit(app);
    expect(app.screen).toBe('continue');
    const stoppedTick = app.game.tick;
    expect(advance(app).state.game.tick).toBe(stoppedTick);
    app = transition(app, 'confirm');
    expect(app).toMatchObject({ screen: 'stage-intro', checkpointName: 'mirror-chamber-entry', continuesRemaining: 0 });
    expect(app.game).toMatchObject({ stageId: 'stage-05', tick: 0, gauge: 50, player: { health: 3 } });

    app = transition(app, 'confirm');
    app.game.tick = STAGE_05_BOSS_START_TICK - 1;
    app.game.encounterIndex = STAGE_05_SPAWNS.length;
    app.game.enemies = [];
    app = advance(app).state;
    expect(app.checkpointName).toBe('apocrypha-gate');
    expect(app.checkpoint.tick).toBe(STAGE_05_BOSS_START_TICK);
    app.game.player.x = px(500);
    app.continuesRemaining = 1;
    app = fatalHit(app);
    app = transition(app, 'confirm');
    expect(app.screen).toBe('stage-intro');
    expect(app.game.tick).toBe(STAGE_05_BOSS_START_TICK);
    expect(app.game.player.x).not.toBe(px(500));
    expect(app.game.bullets.filter((bullet) => bullet.kind === 'enemy')).toHaveLength(0);
    expect(app.game.boss?.kind).toBe('apocrypha-twins');
  });

  it('continues from Stage 5 through Stage 6, restores both final checkpoints and completes the campaign', () => {
    let app = start();
    for (const stageId of ['stage-01', 'stage-02', 'stage-03', 'stage-04', 'stage-05'] as const) {
      expect(app.game.stageId).toBe(stageId);
      app.game.score = 1000;
      app.game.metrics.loops = 2;
      app.game.metrics.captured = 3;
      app.game.metrics.boss.defeated = true;
      app.screen = 'result';
      app = chooseMarginalia(app);
    }
    expect(app).toMatchObject({ screen: 'stage-intro', checkpointName: 'original-dawn-entry', continuesRemaining: 1 });
    expect(app.game).toMatchObject({ stageId: 'stage-06', tick: 0 });
    expect(app.campaign).toMatchObject({ stagesCompleted: 5, score: 5000, collates: 10, returnedFire: 15, complete: false });

    app = transition(app, 'confirm');
    app = fatalHit(app);
    expect(app.screen).toBe('continue');
    const stoppedTick = app.game.tick;
    expect(advance(app).state.game.tick).toBe(stoppedTick);
    app = transition(app, 'confirm');
    expect(app).toMatchObject({ screen: 'stage-intro', checkpointName: 'original-dawn-entry', continuesRemaining: 0 });
    expect(app.game).toMatchObject({ stageId: 'stage-06', tick: 0, gauge: 50, player: { health: 3 } });

    app = transition(app, 'confirm');
    app.game.tick = STAGE_06_BOSS_START_TICK - 1;
    app.game.encounterIndex = STAGE_06_SPAWNS.length;
    app.game.enemies = [];
    app = advance(app).state;
    expect(app.checkpointName).toBe('last-editor-gate');
    expect(app.checkpoint.tick).toBe(STAGE_06_BOSS_START_TICK);
    app.game.player.x = px(500);
    app.continuesRemaining = 1;
    app = fatalHit(app);
    app = transition(app, 'confirm');
    expect(app.screen).toBe('stage-intro');
    expect(app.game.tick).toBe(STAGE_06_BOSS_START_TICK);
    expect(app.game.player.x).not.toBe(px(500));
    expect(app.game.bullets.filter((bullet) => bullet.kind === 'enemy')).toHaveLength(0);
    expect(app.game.boss?.kind).toBe('last-editor');

    app = transition(app, 'confirm');
    app.game.boss!.phase = 3;
    app.game.boss!.editorRulesMask = 0b11111;
    app.game.boss!.signatureExposedUntil = app.game.tick + 60;
    app.game.boss!.health = 1;
    app.game.score = 2400;
    app.game.metrics.loops = 7;
    app.game.metrics.captured = 11;
    app.game.metrics.damage = 2;
    app.game.bullets = [{ id: app.game.nextId++, x: app.game.boss!.x, y: app.game.boss!.y, vx: 0, vy: 0, radius: 5, kind: 'return', annotated: true, capturable: false }];
    app = advance(app).state;
    expect(app.screen).toBe('result');
    app = chooseMarginalia(app);
    expect(app.screen).toBe('ending');
    expect(app.campaign).toMatchObject({ stagesCompleted: 6, score: 67400, collates: 17, returnedFire: 26, damage: 2, complete: true });
    const endingTick = app.game.tick;
    expect(advance(app).state.game.tick).toBe(endingTick);
    app = transition(app, 'confirm');
    expect(app.screen).toBe('campaign-result');
    expect(advance(app).state.game.tick).toBe(endingTick);
    expect(transition(app, 'confirm').screen).toBe('title');
  });

  it('enters result when the boss is defeated and auto-pauses only active play', () => {
    let app = start();
    app.game.tick = STAGE_01_BOSS_START_TICK - 1;
    app.game.encounterIndex = STAGE_01_SPAWNS.length;
    app.game.enemies = [];
    app = advance(app).state;
    app.game.boss!.armorLayers = 0;
    app.game.boss!.health = 1;
    app.game.bullets = [{ id: app.game.nextId++, x: app.game.boss!.x, y: app.game.boss!.y, vx: 0, vy: 0, radius: 5, kind: 'return', annotated: true, capturable: false }];
    app = advance(app).state;
    expect(app.screen).toBe('result');
    expect(autoPause(app).screen).toBe('result');
    expect(autoPause(start()).screen).toBe('paused');
  });
});
