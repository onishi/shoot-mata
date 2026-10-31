import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EnemyKind, GameState, InputFrame } from '../src/core/types';
import { STAGE_01_DURATION_TICKS, STAGE_01_ENTITY_LIMITS, STAGE_01_SPAWNS } from '../src/content/stage-01';
import { createPilot } from '../src/simulation/autopilot';
import { createInitialState, step } from '../src/simulation/game';

const enemyKinds: EnemyKind[] = ['eraser-mite', 'bracket-gull', 'margin-skiff', 'folio-hauler'];
const hashState = (state: GameState): string => createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16);

const simulate = (seed: number, replay?: InputFrame[]) => {
  let state = createInitialState(seed);
  const pilot = createPilot('stitch');
  const frames: InputFrame[] = [];
  let maxEnemies = 0;
  let maxEnemyBullets = 0;
  let currentCombatGap = 0;
  let maxCombatGap = 0;
  for (let tick = 0; tick < STAGE_01_DURATION_TICKS; tick += 1) {
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

describe('M2-01 Stage 1 evidence', () => {
  it('completes the enemy progression within density, lifecycle and determinism gates', () => {
    const first = simulate(2401);
    const replayHashes = Array.from({ length: 3 }, () => simulate(2401, first.frames).hash);
    const stats = first.state.metrics.enemyStats;
    const gates = {
      allKindsSpawned: enemyKinds.every((kind) => stats[kind].spawned > 0),
      allKindsAttacked: enemyKinds.every((kind) => stats[kind].attacks > 0),
      allSpawnsAccounted: enemyKinds.every((kind) => stats[kind].defeated + stats[kind].exited === stats[kind].spawned),
      noUnintendedFourSecondGap: first.maxCombatGap < 4 * 120,
      enemyLimit: first.maxEnemies <= STAGE_01_ENTITY_LIMITS.enemies && first.state.metrics.rejectedEnemies === 0,
      bulletLimit: first.maxEnemyBullets <= STAGE_01_ENTITY_LIMITS.enemyBullets && first.state.metrics.rejectedEnemyBullets === 0,
      deterministicReplay: new Set(replayHashes).size === 1 && replayHashes[0] === first.hash,
      stageDrained: first.state.enemies.length === 0
    };

    const report = {
      generatedAt: '2026-10-31', durationTicks: STAGE_01_DURATION_TICKS,
      scheduledSpawns: STAGE_01_SPAWNS.length, seed: 2401,
      finalHash: first.hash, replayHashes, maxEnemies: first.maxEnemies,
      maxEnemyBullets: first.maxEnemyBullets, maxCombatGapTicks: first.maxCombatGap,
      stats, rejectedEnemies: first.state.metrics.rejectedEnemies,
      rejectedEnemyBullets: first.state.metrics.rejectedEnemyBullets, gates
    };
    const evidenceDir = resolve(import.meta.dirname, '../../docs/evidence');
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(resolve(evidenceDir, 'm2-01-stage-01.json'), `${JSON.stringify(report, null, 2)}\n`);
    const rows = enemyKinds.map((kind) => `| ${kind} | ${stats[kind].spawned} | ${stats[kind].attacks} | ${stats[kind].defeated} | ${stats[kind].exited} |`).join('\n');
    const gateRows = Object.entries(gates).map(([name, passed]) => `| ${name} | ${passed ? 'PASS' : 'FAIL'} |`).join('\n');
    writeFileSync(resolve(evidenceDir, 'm2-01-stage-01.md'), `# M2-01 Stage 1 Report\n\n- Duration: ${STAGE_01_DURATION_TICKS} ticks (180 seconds)\n- Scheduled spawns: ${STAGE_01_SPAWNS.length}\n- Max enemies / enemy bullets: ${first.maxEnemies} / ${first.maxEnemyBullets}\n- Longest no-combat gap: ${first.maxCombatGap} ticks\n- Determinism hashes: ${[first.hash, ...replayHashes].join(', ')}\n\n| Enemy | Spawned | Attacks | Defeated | Exited |\n| --- | ---: | ---: | ---: | ---: |\n${rows}\n\n| Gate | Result |\n| --- | --- |\n${gateRows}\n`);

    expect(gates).toEqual(Object.fromEntries(Object.keys(gates).map((gate) => [gate, true])));
  }, 120_000);
});
