import { describe, expect, it } from 'vitest';
import { advance, autoPause, createAppState, transition, type AppState } from '../src/app/app';
import { STAGE_01_BOSS_START_TICK, STAGE_01_SPAWNS } from '../src/content/stage-01';
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
    expect(app.checkpointName).toBe('boss-gate');
    expect(app.checkpoint.tick).toBe(STAGE_01_BOSS_START_TICK);
    app.game.player.x = px(500);
    app = fatalHit(app);
    app = transition(app, 'confirm');
    expect(app.game.tick).toBe(STAGE_01_BOSS_START_TICK);
    expect(app.game.player.x).not.toBe(px(500));
    expect(app.game.bullets.filter((bullet) => bullet.kind === 'enemy')).toHaveLength(0);
    expect(app.game.boss).not.toBeNull();
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
