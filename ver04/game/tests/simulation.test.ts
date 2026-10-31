import { describe, expect, it } from 'vitest';
import { px } from '../src/core/math';
import { createInitialState, step } from '../src/simulation/game';
import { findLoopCandidate } from '../src/simulation/trail';
import type { GameState, InputFrame, TrailPoint } from '../src/core/types';

const run = (initial: GameState, frames: InputFrame[]): GameState => frames.reduce((state, input) => step(state, input).state, initial);
const trailPoint = (x: number, y: number, bornTick: number): TrailPoint => ({ x: px(x), y: px(y), bornTick, segmentId: bornTick });

describe('M1 deterministic playground', () => {
  it('detects the latest simple loop and keeps it available long enough to react', () => {
    const loopTrail = [trailPoint(100, 100, 0), trailPoint(500, 100, 1), trailPoint(500, 500, 2), trailPoint(100, 500, 3), trailPoint(100, 50, 4), trailPoint(300, 100, 5)];
    expect(findLoopCandidate(loopTrail)?.area).toBeGreaterThan(160000);
    let state = createInitialState();
    state.tick = 5; state.trail = loopTrail; state.player.x = px(300); state.player.y = px(100);
    state.candidate = { ...findLoopCandidate(loopTrail)!, expiresTick: 65 };
    state = step(state, {}).state;
    expect(state.candidate).not.toBeNull();
    state = step(state, { right: true }).state;
    expect(state.candidate).not.toBeNull();
  });

  it('never presents a loop with an off-screen vertex', () => {
    const offscreen = [trailPoint(100, 100, 0), trailPoint(500, 100, 1), trailPoint(1300, 500, 2), trailPoint(100, 500, 3), trailPoint(100, 50, 4), trailPoint(300, 100, 5)];
    expect(findLoopCandidate(offscreen)).toBeNull();
  });

  it('returns identical state for the same seed and input stream', () => {
    const frames = Array.from({ length: 500 }, (_, tick) => ({ up: tick % 120 < 30, down: tick % 120 >= 60 && tick % 120 < 90, fire: tick % 5 === 0 }));
    expect(run(createInitialState(77), frames)).toEqual(run(createInitialState(77), frames));
  });

  it('clamps movement to every screen edge', () => {
    let state = createInitialState();
    state = run(state, Array.from({ length: 1000 }, () => ({ left: true, up: true })));
    expect(state.player.x).toBe(px(13));
    expect(state.player.y).toBe(px(13));
    state = run(state, Array.from({ length: 1000 }, () => ({ right: true, down: true })));
    expect(state.player.x).toBe(px(1267));
    expect(state.player.y).toBe(px(707));
  });

  it('detects a loop, captures inside bullets, marks inside enemies and spends its trail', () => {
    let state = createInitialState();
    state.tick = 0;
    state.enemies[0].x = px(300); state.enemies[0].y = px(300);
    state.trail = [trailPoint(100, 100, 0), trailPoint(500, 100, 0), trailPoint(500, 500, 0), trailPoint(100, 500, 0), trailPoint(100, 80, 0), trailPoint(300, 100, 0)];
    state.player.x = px(300); state.player.y = px(100);
    state.candidate = { polygon: state.trail.slice(0, 4), intersection: state.trail[0], startIndex: 1, area: 160000 };
    state.bullets = [
      { id: 8, x: px(250), y: px(250), vx: 0, vy: 0, radius: 8, kind: 'enemy', annotated: false, capturable: true },
      { id: 9, x: px(600), y: px(250), vx: 0, vy: 0, radius: 8, kind: 'enemy', annotated: false, capturable: true }
    ];
    const result = step(state, { collate: true });
    expect(result.events).toContainEqual({ type: 'loop-collated', captured: 1, area: 160000 });
    expect(result.state.metrics.captured).toBe(1);
    expect(result.state.enemies[0].markedUntil).toBeGreaterThan(result.state.tick);
    expect(result.state.trail.length).toBeLessThan(state.trail.length);
  });

  it('spends 25 gauge to retrace and ignores enemy bullets while retracing', () => {
    let state = createInitialState();
    state.tick = 100;
    state.trail = [trailPoint(100, 200, 70), trailPoint(150, 200, 75), trailPoint(200, 200, 80), trailPoint(250, 200, 85)];
    state.player.x = px(250); state.player.y = px(200);
    state.bullets = [{ id: 8, x: px(250), y: px(200), vx: 0, vy: 0, radius: 8, kind: 'enemy', annotated: false, capturable: true }];
    state = step(state, { retrace: true }).state;
    expect(state.gauge).toBe(50);
    expect(state.player.health).toBe(3);
    expect(state.retrace).not.toBeNull();
  });

  it('rejects retrace when gauge is insufficient', () => {
    const state = createInitialState(); state.gauge = 24;
    expect(step(state, { retrace: true }).events).toContainEqual({ type: 'retrace-denied' });
  });

  it('removes a defeated hauler and records its first defeat tick instead of resetting it', () => {
    let state = createInitialState(99);
    state.enemies[0].health = 1;
    state.enemies[0].amplitude = 0;
    state.bullets = [{ id: 20, x: state.enemies[0].x, y: state.enemies[0].y, vx: 0, vy: 0, radius: 5, kind: 'player', annotated: false, capturable: false }];
    state = step(state, {}).state;
    expect(state.enemies).toHaveLength(0);
    expect(state.metrics.haulersDefeated).toBe(1);
    expect(state.metrics.firstHaulerDefeatTick).toBe(1);
  });

  it('counts failed COLLATE input separately from completed loops', () => {
    const result = step(createInitialState(), { collate: true });
    expect(result.state.metrics.missedCollates).toBe(1);
    expect(result.state.metrics.loops).toBe(0);
  });
});
