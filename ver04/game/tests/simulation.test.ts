import { describe, expect, it } from 'vitest';
import { px } from '../src/core/math';
import { createInitialState, eelSegmentPoint, step } from '../src/simulation/game';
import { STAGE_01_BOSS_START_TICK, STAGE_01_SPAWNS } from '../src/content/stage-01';
import { STAGE_02_BOSS_START_TICK, STAGE_02_SPAWNS } from '../src/content/stage-02';
import { STAGE_03_BOSS_START_TICK, STAGE_03_SPAWNS } from '../src/content/stage-03';
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
    state.enemies[0].kind = 'folio-hauler';
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

  it('lets an Eraser Mite seek and remove a local trail section', () => {
    let state = createInitialState();
    state.tick = 100;
    state.trail = Array.from({ length: 12 }, (_, index) => trailPoint(600 + index * 4, 300, 80 + index));
    state.enemies[0].x = px(620); state.enemies[0].y = px(300);
    state.enemies[0].fireCooldown = 0;
    const before = state.trail.length;
    state = step(state, {}).state;
    expect(state.trail.length).toBeLessThan(before);
    expect(state.metrics.enemyStats['eraser-mite'].attacks).toBe(1);
  });

  it('gives Bracket Gulls a slow three-bullet fence and Margin Skiffs a faster three-shot burst', () => {
    let gull = createInitialState();
    gull.enemies[0].kind = 'bracket-gull'; gull.enemies[0].lane = -1; gull.enemies[0].fireCooldown = 0;
    gull = step(gull, {}).state;
    expect(gull.bullets.filter((bullet) => bullet.kind === 'enemy')).toHaveLength(3);
    expect(gull.metrics.enemyStats['bracket-gull'].attacks).toBe(1);

    let skiff = createInitialState();
    skiff.enemies[0].kind = 'margin-skiff'; skiff.enemies[0].fireCooldown = 0;
    skiff = step(skiff, {}).state;
    expect(skiff.bullets.filter((bullet) => bullet.kind === 'enemy')).toHaveLength(3);
    expect(skiff.metrics.enemyStats['margin-skiff'].attacks).toBe(1);
  });

  it('makes returned fire bypass the Folio Hauler front plate', () => {
    const makeState = (kind: 'player' | 'return') => {
      const state = createInitialState();
      state.enemies[0].kind = 'folio-hauler'; state.enemies[0].health = 100; state.enemies[0].maxHealth = 100;
      state.bullets = [{ id: 40, x: state.enemies[0].x, y: state.enemies[0].y, vx: 0, vy: 0, radius: 5, kind, annotated: kind === 'return', capturable: false }];
      return step(state, {}).state.enemies[0].health;
    };
    expect(makeState('player')).toBe(98);
    expect(makeState('return')).toBe(68);
  });

  it('counts an enemy defeat once when multiple shots overlap on the same tick', () => {
    let state = createInitialState();
    state.enemies[0].health = 1;
    state.bullets = [50, 51].map((id) => ({ id, x: state.enemies[0].x, y: state.enemies[0].y, vx: 0, vy: 0, radius: 5, kind: 'player' as const, annotated: false, capturable: false }));
    state = step(state, {}).state;
    expect(state.metrics.enemiesDefeated).toBe(1);
    expect(state.metrics.enemyStats['eraser-mite'].defeated).toBe(1);
  });

  it('spawns BLANK BAILIFF after the normal route and telegraphs before erasing the aimed trail fan', () => {
    let state = createInitialState();
    state.tick = STAGE_01_BOSS_START_TICK - 1;
    state.encounterIndex = STAGE_01_SPAWNS.length;
    state.enemies = [];
    state.trail = Array.from({ length: 16 }, (_, index) => trailPoint(780 + index * 8, 360, state.tick - index));
    let result = step(state, {});
    expect(result.events).toContainEqual({ type: 'boss-spawned' });
    expect(result.state.boss?.fanWarningUntil).toBeGreaterThan(result.state.tick);
    const before = result.state.trail.length;
    for (let tick = 0; tick < 90; tick += 1) result = step(result.state, {});
    expect(result.state.metrics.boss.fanErases).toBe(1);
    expect(result.state.metrics.boss.trailPointsErased).toBeGreaterThan(0);
    expect(result.state.trail.length).toBeLessThan(before);
  });

  it('makes returned fire strip a Bailiff armor text much faster than ordinary fire', () => {
    const hit = (kind: 'player' | 'return') => {
      let state = createInitialState();
      state.tick = STAGE_01_BOSS_START_TICK - 1;
      state.encounterIndex = STAGE_01_SPAWNS.length;
      state.enemies = [];
      state = step(state, {}).state;
      const boss = state.boss!;
      state.bullets = [{ id: 900, x: boss.x, y: boss.y, vx: 0, vy: 0, radius: 5, kind, annotated: kind === 'return', capturable: false }];
      return step(state, {}).state.boss!.armor;
    };
    expect(hit('return')).toBe(210);
    expect(hit('player')).toBe(299);
  });

  it('advances the Bailiff phase when an armor text is stripped', () => {
    let state = createInitialState();
    state.tick = STAGE_01_BOSS_START_TICK - 1;
    state.encounterIndex = STAGE_01_SPAWNS.length;
    state.enemies = [];
    state = step(state, {}).state;
    state.boss!.armor = 1;
    state.bullets = [{ id: 901, x: state.boss!.x, y: state.boss!.y, vx: 0, vy: 0, radius: 5, kind: 'return', annotated: true, capturable: false }];
    const result = step(state, {});
    expect(result.state.boss?.phase).toBe(2);
    expect(result.state.boss?.armorLayers).toBe(2);
    expect(result.events).toContainEqual({ type: 'boss-phase', phase: 2 });
  });

  it('applies weaker crosswind to the player than to the existing trail and reverses deterministically', () => {
    let state = createInitialState(22, 'stage-02');
    state.tick = 719;
    state.encounterIndex = STAGE_02_SPAWNS.length;
    state.enemies = [];
    state.player.x = px(500);
    state.trail = [trailPoint(400, 300, 700)];
    const playerX = state.player.x;
    const trailX = state.trail[0].x;
    const reversal = step(state, {});
    state = reversal.state;
    expect(state.player.x).toBeLessThan(playerX);
    expect(state.trail[0].x).toBeLessThan(trailX);
    expect(trailX - state.trail[0].x).toBeGreaterThan(playerX - state.player.x);
    expect(state.metrics.wind.reversals).toBe(1);
    expect(reversal.events).toContainEqual({ type: 'wind-reversed', direction: -1 });
  });

  it('gives all four Stage 2 enemies a distinct scheduled attack', () => {
    const kinds = ['index-kite', 'vane-scribe', 'cross-reference-pair', 'tab-binder'] as const;
    for (const kind of kinds) {
      let state = createInitialState(23, 'stage-02');
      state.encounterIndex = STAGE_02_SPAWNS.length;
      state.enemies[0].kind = kind;
      state.enemies[0].x = px(1000);
      state.enemies[0].spawnX = px(1000);
      state.enemies[0].fireCooldown = 0;
      state = step(state, {}).state;
      expect(state.metrics.enemyStats[kind].attacks).toBe(1);
      expect(state.bullets.some((bullet) => bullet.kind === 'enemy')).toBe(true);
    }
  });

  it('locks the Stage 2 wind and exposes the opposite seam when a loop contains the vane', () => {
    let state = createInitialState(24, 'stage-02');
    state.tick = STAGE_02_BOSS_START_TICK - 1;
    state.encounterIndex = STAGE_02_SPAWNS.length;
    state.enemies = [];
    state = step(state, {}).state;
    const boss = state.boss!;
    const vane = { x: boss.x - px(100), y: boss.y + boss.vaneSide * px(108) };
    state.candidate = {
      polygon: [
        { x: vane.x - px(60), y: vane.y - px(60) }, { x: vane.x + px(60), y: vane.y - px(60) },
        { x: vane.x + px(60), y: vane.y + px(60) }, { x: vane.x - px(60), y: vane.y + px(60) }
      ],
      intersection: vane, startIndex: 0, area: 14400, expiresTick: state.tick + 60
    };
    const locked = step(state, { collate: true });
    state = locked.state;
    expect(state.boss?.kind).toBe('crosswind-compiler');
    expect(state.boss!.windLockedUntil).toBeGreaterThan(state.tick);
    expect(state.boss!.seamExposedUntil).toBe(state.boss!.windLockedUntil);
    expect(state.metrics.compiler.windLocks).toBe(1);
    expect(locked.events).toContainEqual({ type: 'compiler-wind-locked', direction: 1 });
    expect(locked.events).toContainEqual({ type: 'compiler-seam-exposed', side: -1 });
  });

  it('rewards firing into the exposed Compiler seam over ordinary body fire', () => {
    const hit = (seam: boolean) => {
      let state = createInitialState(25, 'stage-02');
      state.tick = STAGE_02_BOSS_START_TICK - 1;
      state.encounterIndex = STAGE_02_SPAWNS.length;
      state.enemies = [];
      state = step(state, {}).state;
      const boss = state.boss!;
      if (seam) boss.seamExposedUntil = state.tick + 60;
      const point = seam ? { x: boss.x - px(100), y: boss.y - boss.vaneSide * px(108) } : boss;
      state.bullets = [{ id: 950, x: point.x, y: point.y, vx: 0, vy: 0, radius: 5, kind: 'player', annotated: false, capturable: false }];
      return step(state, {});
    };
    const ordinary = hit(false);
    const weakpoint = hit(true);
    expect(ordinary.state.boss!.maxHealth - ordinary.state.boss!.health).toBe(1);
    expect(weakpoint.state.boss!.maxHealth - weakpoint.state.boss!.health).toBe(44);
    expect(weakpoint.state.metrics.compiler.weakpointHits).toBe(1);
    expect(weakpoint.events).toContainEqual({ type: 'compiler-seam-hit' });
  });

  it('makes all four Stage 3 enemies attack with distinct rain roles', () => {
    const kinds = ['drip-scribe', 'gutter-frog', 'basin-bell', 'reed-needle'] as const;
    for (const kind of kinds) {
      let state = createInitialState(31, 'stage-03');
      state.encounterIndex = STAGE_03_SPAWNS.length; state.enemies[0].kind = kind;
      state.enemies[0].x = px(1000); state.enemies[0].spawnX = px(1000); state.enemies[0].fireCooldown = 0;
      state.trail = [trailPoint(600, 300, 0), { ...trailPoint(700, 300, 1), wetUntil: 700 }];
      state = step(state, {}).state;
      expect(state.metrics.enemyStats[kind].attacks).toBe(1);
    }
  });

  it('sags rain-wetted trail and triples wet annotation damage over ordinary fire', () => {
    let state = createInitialState(32, 'stage-03');
    state.encounterIndex = STAGE_03_SPAWNS.length; state.enemies = [state.enemies[0]];
    state.enemies[0].health = 100; state.enemies[0].maxHealth = 100; state.enemies[0].x = px(1000); state.enemies[0].y = px(300);
    state.enemies[0].spawnX = state.enemies[0].x; state.enemies[0].amplitude = 0;
    state.enemies[0].baseY = px(300);
    state.trail = [{ ...trailPoint(995, 250, 0), wetUntil: 600 }, { ...trailPoint(995, 350, 1), wetUntil: 600 }];
    const beforeY = state.trail[0].y;
    state.bullets = [{ id: 90, x: px(990), y: px(300), vx: px(10), vy: 0, radius: 4, kind: 'player', annotated: false, capturable: false }];
    state = step(state, {}).state;
    expect(state.trail[0].y).toBeGreaterThan(beforeY);
    expect(state.metrics.rain.wetAnnotatedShots).toBe(1);
    expect(state.enemies[0].health).toBe(82);
    expect(state.metrics.rain.wetDamage).toBe(18);
  });

  it('marks the active LACUNA EEL segment with a small loop and rewards wet annotation', () => {
    let state = createInitialState(33, 'stage-03');
    state.tick = STAGE_03_BOSS_START_TICK - 1; state.encounterIndex = STAGE_03_SPAWNS.length; state.enemies = [];
    state = step(state, {}).state;
    const boss = state.boss!; const segment = eelSegmentPoint(boss, state.tick, boss.activeSegment);
    state.candidate = { polygon: [
      { x: segment.x - px(55), y: segment.y - px(55) }, { x: segment.x + px(55), y: segment.y - px(55) },
      { x: segment.x + px(55), y: segment.y + px(55) }, { x: segment.x - px(55), y: segment.y + px(55) }
    ], intersection: segment, startIndex: 0, area: 12100, expiresTick: state.tick + 60 };
    const marked = step(state, { collate: true }); state = marked.state;
    expect(marked.events).toContainEqual({ type: 'eel-segment-marked', segment: 0 });
    expect(state.metrics.eel.segmentMarks).toBe(1);
    const target = eelSegmentPoint(state.boss!, state.tick + 1, 0);
    state.bullets = [{ id: 990, ...target, vx: 0, vy: 0, radius: 5, kind: 'player', annotated: true, wetAnnotated: true, capturable: false }];
    const hit = step(state, {});
    expect(hit.state.boss!.maxHealth - hit.state.boss!.health).toBe(96);
    expect(hit.state.metrics.eel.wetWeakpointHits).toBe(1);
    expect(hit.events).toContainEqual({ type: 'eel-segment-hit', segment: 0 });
  });
});
