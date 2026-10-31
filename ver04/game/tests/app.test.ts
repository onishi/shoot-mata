import { describe, expect, it } from 'vitest';
import { advance, autoPause, createAppState, transition, type AppState } from '../src/app/app';
import { STAGE_01_BOSS_START_TICK, STAGE_01_SPAWNS } from '../src/content/stage-01';
import { STAGE_02_BOSS_START_TICK, STAGE_02_SPAWNS } from '../src/content/stage-02';
import { STAGE_03_BOSS_START_TICK, STAGE_03_SPAWNS } from '../src/content/stage-03';
import { STAGE_04_BOSS_START_TICK, STAGE_04_SPAWNS } from '../src/content/stage-04';
import { STAGE_05_BOSS_START_TICK, STAGE_05_SPAWNS } from '../src/content/stage-05';
import { px } from '../src/core/math';

const start = (): AppState => transition(transition(createAppState(404), 'start'), 'confirm');

const fatalHit = (state: AppState): AppState => {
  state.game.player.health = 1;
  state.game.player.invulnerableUntil = 0;
  state.game.bullets = [{ id: state.game.nextId++, x: state.game.player.x, y: state.game.player.y, vx: 0, vy: 0, radius: 8, kind: 'enemy', annotated: false, capturable: true }];
  return advance(state).state;
};

describe('M2 application flow', () => {
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
    app = transition(transition(app, 'confirm'), 'confirm');
    expect(app.game.stageId).toBe('stage-02');
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
    app = transition(app, 'confirm');
    app.game.metrics.boss.defeated = true;
    app.screen = 'result';
    app = transition(app, 'confirm');
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
      app = transition(app, 'confirm');
      if (stageId !== 'stage-03') app = transition(app, 'confirm');
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
      app = transition(app, 'confirm');
      if (stageId !== 'stage-04') app = transition(app, 'confirm');
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
