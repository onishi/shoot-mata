import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EnemyKind, GameState, InputFrame } from '../src/core/types';
import { STAGE_02_DURATION_TICKS, STAGE_02_ENTITY_LIMITS, STAGE_02_SPAWNS } from '../src/content/stage-02';
import { createPilot } from '../src/simulation/autopilot';
import { createInitialState, step } from '../src/simulation/game';

const enemyKinds: EnemyKind[] = ['index-kite', 'vane-scribe', 'cross-reference-pair', 'tab-binder'];
const hashState = (state: GameState): string => createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16);

const simulate = (seed: number, replay?: InputFrame[]) => {
  let state = createInitialState(seed, 'stage-02');
  const pilot = createPilot('stitch');
  const frames: InputFrame[] = [];
  let maxEnemies = 0;
  let maxEnemyBullets = 0;
  let currentCombatGap = 0;
  let maxCombatGap = 0;
  for (let tick = 0; tick < STAGE_02_DURATION_TICKS; tick += 1) {
    const input = replay?.[tick] ?? pilot(state);
    frames.push(input);
    state = step(state, input).state;
    const enemyBullets = state.bullets.filter((bullet) => bullet.kind === 'enemy').length;
    maxEnemies = Math.max(maxEnemies, state.enemies.length);
    maxEnemyBullets = Math.max(maxEnemyBullets, enemyBullets);
    currentCombatGap = state.enemies.length === 0 && enemyBullets === 0 ? currentCombatGap + 1 : 0;
    maxCombatGap = Math.max(maxCombatGap, currentCombatGap);
  }
  return { state, frames, maxEnemies, maxEnemyBullets, maxCombatGap, hash: hashState(state) };
};

describe('M3-01 Stage 2 evidence', () => {
  it('completes the crosswind progression within lifecycle, mechanic and determinism gates', () => {
    const first = simulate(3201);
    const replayHashes = Array.from({ length: 3 }, () => simulate(3201, first.frames).hash);
    const stats = first.state.metrics.enemyStats;
    const wind = first.state.metrics.wind;
    const gates = {
      allKindsSpawned: enemyKinds.every((kind) => stats[kind].spawned > 0),
      allKindsAttacked: enemyKinds.every((kind) => stats[kind].attacks > 0),
      allKindsDefeated: enemyKinds.every((kind) => stats[kind].defeated > 0),
      allSpawnsAccounted: enemyKinds.every((kind) => stats[kind].defeated + stats[kind].exited === stats[kind].spawned),
      bothWindDirectionsCollated: wind.collatesLeft > 0 && wind.collatesRight > 0,
      reversalWindowCollated: wind.collatesNearReversal > 0,
      allReversalsObserved: wind.reversals === Math.floor((STAGE_02_DURATION_TICKS - 1) / (6 * 120)),
      noUnintendedFourSecondGap: first.maxCombatGap < 4 * 120,
      enemyLimit: first.maxEnemies <= STAGE_02_ENTITY_LIMITS.enemies && first.state.metrics.rejectedEnemies === 0,
      bulletLimit: first.maxEnemyBullets <= STAGE_02_ENTITY_LIMITS.enemyBullets && first.state.metrics.rejectedEnemyBullets === 0,
      deterministicReplay: new Set(replayHashes).size === 1 && replayHashes[0] === first.hash,
      stageDrained: first.state.enemies.length === 0
    };

    const report = {
      generatedAt: '2026-10-31', durationTicks: STAGE_02_DURATION_TICKS,
      scheduledSpawns: STAGE_02_SPAWNS.length, seed: 3201,
      finalHash: first.hash, replayHashes, maxEnemies: first.maxEnemies,
      maxEnemyBullets: first.maxEnemyBullets, maxCombatGapTicks: first.maxCombatGap,
      stats: Object.fromEntries(enemyKinds.map((kind) => [kind, stats[kind]])), wind,
      rejectedEnemies: first.state.metrics.rejectedEnemies,
      rejectedEnemyBullets: first.state.metrics.rejectedEnemyBullets, gates
    };
    const evidenceDir = resolve(import.meta.dirname, '../../docs/evidence');
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(resolve(evidenceDir, 'm3-01-stage-02.json'), `${JSON.stringify(report, null, 2)}\n`);
    const rows = enemyKinds.map((kind) => `| ${kind} | ${stats[kind].spawned} | ${stats[kind].attacks} | ${stats[kind].defeated} | ${stats[kind].exited} |`).join('\n');
    const gateRows = Object.entries(gates).map(([name, passed]) => `| ${name} | ${passed ? 'PASS' : 'FAIL'} |`).join('\n');
    writeFileSync(resolve(evidenceDir, 'm3-01-stage-02.md'), `# M3-01 Stage 2 Report\n\n- Duration: ${STAGE_02_DURATION_TICKS} ticks (180 seconds)\n- Scheduled spawns: ${STAGE_02_SPAWNS.length}\n- Max enemies / enemy bullets: ${first.maxEnemies} / ${first.maxEnemyBullets}\n- Longest no-combat gap: ${first.maxCombatGap} ticks\n- Wind reversals: ${wind.reversals}\n- COLLATE left / right / near reversal: ${wind.collatesLeft} / ${wind.collatesRight} / ${wind.collatesNearReversal}\n- Determinism hashes: ${[first.hash, ...replayHashes].join(', ')}\n\n| Enemy | Spawned | Attacks | Defeated | Exited |\n| --- | ---: | ---: | ---: | ---: |\n${rows}\n\n| Gate | Result |\n| --- | --- |\n${gateRows}\n`);

    expect(gates).toEqual(Object.fromEntries(Object.keys(gates).map((gate) => [gate, true])));
  }, 120_000);
});
