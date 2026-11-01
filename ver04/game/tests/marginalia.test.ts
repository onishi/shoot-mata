import { describe, expect, it } from 'vitest';
import { marginaliaCandidates, marginaliaEffects } from '../src/content/marginalia';
import { createInitialState, step } from '../src/simulation/game';

describe('M4 marginalia growth', () => {
  it('offers one deterministic candidate from each implemented family', () => {
    const first = marginaliaCandidates(404, 'stage-01');
    expect(marginaliaCandidates(404, 'stage-01')).toEqual(first);
    expect(new Set(first)).toEqual(new Set(['longhand', 'rubric', 'redaction']));
  });

  it('stacks LONGHAND while paying its maximum-gauge cost', () => {
    const state = createInitialState(7);
    state.tick = 384;
    state.gauge = 100;
    state.trail = [
      { x: state.player.x - 30 * 256, y: state.player.y, bornTick: 0, segmentId: 1 },
      { x: state.player.x, y: state.player.y, bornTick: 384, segmentId: 2 }
    ];
    const ordinary = step(state, {}).state;
    const longhand = step(state, {}, 'normal', ['longhand']).state;
    expect(ordinary.trail).toHaveLength(1);
    expect(longhand.trail).toHaveLength(2);
    expect(longhand.gauge).toBe(90);
    expect(marginaliaEffects(['longhand', 'longhand']).trailLifetimeBonus).toBeCloseTo(1.4);
  });

  it('makes RUBRIC annotated fire pierce a marked enemy with a slower cadence', () => {
    const state = createInitialState(9);
    const enemy = state.enemies[0];
    enemy.x = 600 * 256; enemy.y = 360 * 256;
    enemy.markedUntil = 200;
    enemy.health = 100;
    state.bullets = [{ id: state.nextId++, x: enemy.x, y: enemy.y, vx: 0, vy: 0, radius: 4, kind: 'player', annotated: true, capturable: false }];
    const result = step(state, { fire: true }, 'normal', ['rubric']).state;
    expect(result.enemies[0].health).toBeLessThan(100);
    expect(result.bullets.some((bullet) => bullet.annotated && bullet.kind === 'player')).toBe(true);
    expect(result.player.fireCooldown).toBe(13);
  });

  it('raises REDACTION capture capacity from 18 to 24', () => {
    const make = () => {
      const state = createInitialState(11);
      state.gauge = 0;
      state.candidate = { polygon: [
        { x: 100 * 256, y: 100 * 256 }, { x: 1100 * 256, y: 100 * 256 },
        { x: 1100 * 256, y: 650 * 256 }, { x: 100 * 256, y: 650 * 256 }
      ], intersection: { x: 100 * 256, y: 100 * 256 }, startIndex: 0, area: 550000 };
      state.bullets = Array.from({ length: 24 }, (_, index) => ({
        id: state.nextId++, x: (400 + index) * 256, y: 360 * 256, vx: 0, vy: 0,
        radius: 8, kind: 'enemy' as const, annotated: false, capturable: true
      }));
      return state;
    };
    expect(step(make(), { collate: true }).state.metrics.captured).toBe(18);
    expect(step(make(), { collate: true }, 'normal', ['redaction']).state.metrics.captured).toBe(24);
  });
});
