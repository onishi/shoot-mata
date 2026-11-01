import { describe, expect, it } from 'vitest';
import { MARGINALIA_IDS, marginaliaCandidates, marginaliaEffects } from '../src/content/marginalia';
import { createInitialState, step } from '../src/simulation/game';

describe('M4 marginalia growth', () => {
  it('offers one deterministic candidate from each implemented family', () => {
    const first = marginaliaCandidates(404, 'stage-01');
    expect(marginaliaCandidates(404, 'stage-01')).toEqual(first);
    expect(new Set(first)).toEqual(new Set(['longhand', 'rubric', 'redaction']));
  });

  it('makes all twelve notes reachable across midpoint and result offers', () => {
    const offered = new Set<string>();
    for (const stage of ['stage-01', 'stage-02', 'stage-03', 'stage-04', 'stage-05', 'stage-06'] as const) {
      for (const moment of ['midpoint', 'result'] as const) {
        const candidates = marginaliaCandidates(404, stage, moment);
        expect(candidates).toHaveLength(3);
        expect(candidates.map((id) => id === 'longhand' || id === 'footnote' || id === 'cross-reference' || id === 'errata').filter(Boolean)).toHaveLength(1);
        candidates.forEach((id) => offered.add(id));
      }
    }
    expect(offered).toEqual(new Set(MARGINALIA_IDS));
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

  it('preserves an empty ERRATA loop once and makes CITATION add a fifth return shot', () => {
    const empty = createInitialState(12);
    empty.enemies = [];
    empty.trail = Array.from({ length: 8 }, (_, index) => ({ x: (100 + index * 10) * 256, y: 100 * 256, bornTick: 0, segmentId: index }));
    empty.candidate = { polygon: [
      { x: 100 * 256, y: 100 * 256 }, { x: 500 * 256, y: 100 * 256 },
      { x: 500 * 256, y: 500 * 256 }, { x: 100 * 256, y: 500 * 256 }
    ], intersection: { x: 100 * 256, y: 100 * 256 }, startIndex: 3, area: 160000 };
    const corrected = step(empty, { collate: true }, 'normal', ['errata']).state;
    expect(corrected.trail).toHaveLength(9);
    expect(corrected.errataReadyAt).toBe(1 + 8 * 120);

    const cited = createInitialState(13);
    cited.enemies[0].x = 700 * 256; cited.enemies[0].y = 360 * 256;
    cited.candidate = { polygon: [
      { x: 100 * 256, y: 100 * 256 }, { x: 600 * 256, y: 100 * 256 },
      { x: 600 * 256, y: 600 * 256 }, { x: 100 * 256, y: 600 * 256 }
    ], intersection: { x: 100 * 256, y: 100 * 256 }, startIndex: 0, area: 250000 };
    cited.bullets = Array.from({ length: 4 }, (_, index) => ({
      id: cited.nextId++, x: (300 + index * 20) * 256, y: 360 * 256, vx: 0, vy: 0,
      radius: 8, kind: 'enemy' as const, annotated: false, capturable: true
    }));
    const returned = step(cited, { collate: true }, 'normal', ['citation']).state.bullets.filter((bullet) => bullet.kind === 'return');
    expect(returned).toHaveLength(5);
    expect(returned.some((bullet) => bullet.radius === 9)).toBe(true);
  });

  it('charges PALINODE ten extra gauge and exposes every remaining effect flag', () => {
    const state = createInitialState(14);
    state.gauge = 30;
    state.trail = Array.from({ length: 5 }, (_, index) => ({ x: (200 + index * 10) * 256, y: 360 * 256, bornTick: 0, segmentId: index }));
    expect(step(state, { retrace: true }).events.some((event) => event.type === 'retrace-started')).toBe(true);
    expect(step(state, { retrace: true }, 'normal', ['palinode']).events.some((event) => event.type === 'retrace-denied')).toBe(true);
    const effects = marginaliaEffects(MARGINALIA_IDS);
    expect(effects).toMatchObject({ footnote: true, crossReference: true, errata: true, gloss: true, ligature: true, underline: true, citation: true, palinode: true, afterword: true });
  });
});
