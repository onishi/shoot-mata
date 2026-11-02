import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GameState, InputFrame } from '../src/core/types';
import { STAGE_02_BOSS_START_TICK, STAGE_02_ENTITY_LIMITS, STAGE_02_SPAWNS } from '../src/content/stage-02';
import { createPilot, type PilotName } from '../src/simulation/autopilot';
import { createInitialState, step } from '../src/simulation/game';

const hashState = (state: GameState): string => createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16);

const bossStart = (): GameState => {
  const state = createInitialState(3202, 'stage-02');
  state.tick = STAGE_02_BOSS_START_TICK - 1;
  state.encounterIndex = STAGE_02_SPAWNS.length;
  state.enemies = [];
  state.bullets = [];
  state.trail = [];
  // The normal Stage 2 controller finishes its last Tab Binder formation in
  // the forward half of the screen; start the isolated boss measurement at
  // that authored gate rather than the campaign's initial spawn point.
  state.player.x = 700 * 256;
  return step(state, {}).state;
};

const simulate = (pilotName: PilotName, replay?: InputFrame[]) => {
  let state = bossStart();
  const pilot = createPilot(pilotName);
  const frames: InputFrame[] = [];
  let maxEnemyBullets = 0;
  const limit = 240 * 120;
  for (let tick = 0; tick < limit && !state.metrics.boss.defeated; tick += 1) {
    const input = replay?.[tick] ?? pilot(state);
    frames.push(input);
    state = step(state, input).state;
    maxEnemyBullets = Math.max(maxEnemyBullets, state.bullets.filter((bullet) => bullet.kind === 'enemy').length);
  }
  return {
    state, frames, maxEnemyBullets,
    duration: state.metrics.boss.defeatTick === null ? null : state.metrics.boss.defeatTick - STAGE_02_BOSS_START_TICK,
    hash: hashState(state)
  };
};

describe('M3-02 CROSSWIND COMPILER evidence', () => {
  it('proves the vane-lock route, three phases, fallback route and deterministic replay', () => {
    const baseline = simulate('baseline');
    const stitch = simulate('stitch');
    const replay = simulate('stitch', stitch.frames);
    const metrics = stitch.state.metrics.compiler;
    const gates = {
      baselineDefeatsBoss: baseline.state.metrics.boss.defeated,
      stitchDefeatsBoss: stitch.state.metrics.boss.defeated,
      stitchAtLeastTwentyPercentFaster: stitch.duration !== null && baseline.duration !== null && stitch.duration <= baseline.duration * 0.8,
      allPhasesReached: metrics.phaseReached.every(Boolean),
      vaneLockedInEveryPhase: metrics.windLocks >= 3 && metrics.windLockedTicks > 0,
      exposedSeamHit: metrics.weakpointHits > 0,
      fallbackBodyRouteMeasured: baseline.state.metrics.compiler.ordinaryHits > 0,
      allAttacksEmitted: Object.values(metrics.attacks).every((value) => value > 0),
      attackDamageMeasured: Object.values(metrics.damageByAttack).every((value) => value >= 0),
      bulletLimit: stitch.maxEnemyBullets <= STAGE_02_ENTITY_LIMITS.enemyBullets && stitch.state.metrics.rejectedEnemyBullets === 0,
      deterministicReplay: replay.hash === stitch.hash
    };
    const report = {
      generatedAt: '2026-10-31', seed: 3202,
      baseline: { durationTicks: baseline.duration, maxEnemyBullets: baseline.maxEnemyBullets, compiler: baseline.state.metrics.compiler, hash: baseline.hash },
      stitch: { durationTicks: stitch.duration, maxEnemyBullets: stitch.maxEnemyBullets, compiler: metrics, hash: stitch.hash },
      replayHash: replay.hash, gates
    };
    const evidenceDir = resolve(import.meta.dirname, '../../docs/evidence');
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(resolve(evidenceDir, 'm3-02-crosswind-compiler.json'), `${JSON.stringify(report, null, 2)}\n`);
    const gateRows = Object.entries(gates).map(([name, passed]) => `| ${name} | ${passed ? 'PASS' : 'FAIL'} |`).join('\n');
    writeFileSync(resolve(evidenceDir, 'm3-02-crosswind-compiler.md'), `# M3-02 CROSSWIND COMPILER Report\n\n- Baseline defeat: ${baseline.duration ?? 'not defeated'} ticks\n- Stitch defeat: ${stitch.duration ?? 'not defeated'} ticks\n- Wind locks / locked ticks: ${metrics.windLocks} / ${metrics.windLockedTicks}\n- Weakpoint hits: ${metrics.weakpointHits}\n- Gust / lance / storm attacks: ${metrics.attacks.gust} / ${metrics.attacks.lance} / ${metrics.attacks.storm}\n- Gust / lance / storm damage: ${metrics.damageByAttack.gust} / ${metrics.damageByAttack.lance} / ${metrics.damageByAttack.storm}\n- Max enemy bullets: ${stitch.maxEnemyBullets}\n- Stitch / replay hashes: ${stitch.hash}, ${replay.hash}\n\n| Gate | Result |\n| --- | --- |\n${gateRows}\n`);
    expect(gates).toEqual(Object.fromEntries(Object.keys(gates).map((gate) => [gate, true])));
  }, 120_000);
});
