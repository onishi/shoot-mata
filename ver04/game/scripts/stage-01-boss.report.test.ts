import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STAGE_01_BOSS_START_TICK, STAGE_01_ENTITY_LIMITS, STAGE_01_SPAWNS } from '../src/content/stage-01';
import type { GameState, InputFrame } from '../src/core/types';
import { createPilot, type PilotName } from '../src/simulation/autopilot';
import { createInitialState, step } from '../src/simulation/game';

const hashState = (state: GameState): string => createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16);

const bossStart = (seed: number): GameState => {
  const state = createInitialState(seed);
  state.tick = STAGE_01_BOSS_START_TICK - 1;
  state.encounterIndex = STAGE_01_SPAWNS.length;
  state.enemies = [];
  state.bullets = [];
  state.trail = [];
  return step(state, {}).state;
};

const simulate = (pilotName: PilotName, replay?: InputFrame[]) => {
  let state = bossStart(2402);
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
  return { state, frames, maxEnemyBullets, duration: state.metrics.boss.defeatTick === null ? null : state.metrics.boss.defeatTick - STAGE_01_BOSS_START_TICK, hash: hashState(state) };
};

describe('M2-02 BLANK BAILIFF evidence', () => {
  it('proves the returned-fire route is faster, reaches every phase and remains deterministic', () => {
    const baseline = simulate('baseline');
    const stitch = simulate('stitch');
    const replay = simulate('stitch', stitch.frames);
    const gates = {
      baselineDefeatsBoss: baseline.state.metrics.boss.defeated,
      stitchDefeatsBoss: stitch.state.metrics.boss.defeated,
      routeAtLeastTwentyPercentFaster: stitch.duration !== null && baseline.duration !== null && stitch.duration <= baseline.duration * 0.8,
      allPhasesReached: stitch.state.metrics.boss.phaseReached.every(Boolean),
      returnedFireUsed: stitch.state.metrics.boss.returnedHits > 0,
      allArmorTextsStripped: stitch.state.metrics.boss.armorLayersStripped === 3,
      fanTelegraphedAndErased: stitch.state.metrics.boss.fanWarnings > 0 && stitch.state.metrics.boss.fanErases > 0 && stitch.state.metrics.boss.trailPointsErased > 0,
      attackDamageMeasured: Object.values(stitch.state.metrics.boss.damageByAttack).every((value) => value > 0),
      bulletLimit: stitch.maxEnemyBullets <= STAGE_01_ENTITY_LIMITS.enemyBullets && stitch.state.metrics.rejectedEnemyBullets === 0,
      deterministicReplay: replay.hash === stitch.hash
    };
    const report = {
      generatedAt: '2026-10-31', seed: 2402,
      baseline: { durationTicks: baseline.duration, maxEnemyBullets: baseline.maxEnemyBullets, metrics: baseline.state.metrics.boss, hash: baseline.hash },
      stitch: { durationTicks: stitch.duration, maxEnemyBullets: stitch.maxEnemyBullets, metrics: stitch.state.metrics.boss, hash: stitch.hash },
      replayHash: replay.hash, gates
    };
    const evidenceDir = resolve(import.meta.dirname, '../../docs/evidence');
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(resolve(evidenceDir, 'm2-02-blank-bailiff.json'), `${JSON.stringify(report, null, 2)}\n`);
    const gateRows = Object.entries(gates).map(([name, passed]) => `| ${name} | ${passed ? 'PASS' : 'FAIL'} |`).join('\n');
    writeFileSync(resolve(evidenceDir, 'm2-02-blank-bailiff.md'), `# M2-02 BLANK BAILIFF Report\n\n- Baseline defeat: ${baseline.duration ?? 'not defeated'} ticks\n- Stitch defeat: ${stitch.duration ?? 'not defeated'} ticks\n- Stitch / replay hashes: ${stitch.hash}, ${replay.hash}\n- Max enemy bullets: ${stitch.maxEnemyBullets}\n- Returned hits: ${stitch.state.metrics.boss.returnedHits}\n- Armor texts stripped: ${stitch.state.metrics.boss.armorLayersStripped}\n- Damage by fan / sweep / volley: ${stitch.state.metrics.boss.damageByAttack.fan} / ${stitch.state.metrics.boss.damageByAttack.sweep} / ${stitch.state.metrics.boss.damageByAttack.volley}\n\n| Gate | Result |\n| --- | --- |\n${gateRows}\n`);

    expect(gates).toEqual(Object.fromEntries(Object.keys(gates).map((gate) => [gate, true])));
  }, 120_000);
});
