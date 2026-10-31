import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EnemyKind, GameState, InputFrame } from '../src/core/types';
import { STAGE_03_DURATION_TICKS, STAGE_03_ENTITY_LIMITS, STAGE_03_SPAWNS } from '../src/content/stage-03';
import { createPilot } from '../src/simulation/autopilot';
import { createInitialState, step } from '../src/simulation/game';

const enemyKinds: EnemyKind[] = ['drip-scribe', 'gutter-frog', 'basin-bell', 'reed-needle'];
const hashState = (state: GameState): string => createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16);

const simulate = (seed: number, replay?: InputFrame[]) => {
  let state = createInitialState(seed, 'stage-03');
  const pilot = createPilot('stitch');
  const frames: InputFrame[] = [];
  let maxEnemies = 0; let maxEnemyBullets = 0; let currentCombatGap = 0; let maxCombatGap = 0;
  for (let tick = 0; tick < STAGE_03_DURATION_TICKS; tick += 1) {
    const input = replay?.[tick] ?? pilot(state); frames.push(input); state = step(state, input).state;
    const enemyBullets = state.bullets.filter((bullet) => bullet.kind === 'enemy').length;
    maxEnemies = Math.max(maxEnemies, state.enemies.length); maxEnemyBullets = Math.max(maxEnemyBullets, enemyBullets);
    currentCombatGap = state.enemies.length === 0 && enemyBullets === 0 ? currentCombatGap + 1 : 0;
    maxCombatGap = Math.max(maxCombatGap, currentCombatGap);
  }
  return { state, frames, maxEnemies, maxEnemyBullets, maxCombatGap, hash: hashState(state) };
};

describe('M3-06 Stage 3 evidence', () => {
  it('completes the rain progression within lifecycle, mechanic and determinism gates', () => {
    const first = simulate(3301);
    const replayHashes = Array.from({ length: 3 }, () => simulate(3301, first.frames).hash);
    const stats = first.state.metrics.enemyStats; const rain = first.state.metrics.rain;
    const gates = {
      allKindsSpawned: enemyKinds.every((kind) => stats[kind].spawned > 0),
      allKindsAttacked: enemyKinds.every((kind) => stats[kind].attacks > 0),
      allKindsDefeated: enemyKinds.every((kind) => stats[kind].defeated > 0),
      allSpawnsAccounted: enemyKinds.every((kind) => stats[kind].defeated + stats[kind].exited === stats[kind].spawned),
      rainWetsTrail: rain.trailPointsWetted > 0 && rain.wetTrailPeak > 0,
      wetAnnotationUsed: rain.wetAnnotatedShots > 0 && rain.wetDamage > 0,
      waterGateActivated: rain.basinSurges > 0 && rain.needleDashes > 0,
      noUnintendedFourSecondGap: first.maxCombatGap < 4 * 120,
      enemyLimit: first.maxEnemies <= STAGE_03_ENTITY_LIMITS.enemies && first.state.metrics.rejectedEnemies === 0,
      bulletLimit: first.maxEnemyBullets <= STAGE_03_ENTITY_LIMITS.enemyBullets && first.state.metrics.rejectedEnemyBullets === 0,
      deterministicReplay: new Set(replayHashes).size === 1 && replayHashes[0] === first.hash,
      stageDrained: first.state.enemies.length === 0
    };
    const report = { generatedAt: '2026-10-31', durationTicks: STAGE_03_DURATION_TICKS, scheduledSpawns: STAGE_03_SPAWNS.length,
      seed: 3301, finalHash: first.hash, replayHashes, maxEnemies: first.maxEnemies, maxEnemyBullets: first.maxEnemyBullets,
      maxCombatGapTicks: first.maxCombatGap, stats: Object.fromEntries(enemyKinds.map((kind) => [kind, stats[kind]])), rain,
      rejectedEnemies: first.state.metrics.rejectedEnemies, rejectedEnemyBullets: first.state.metrics.rejectedEnemyBullets, gates };
    const evidenceDir = resolve(import.meta.dirname, '../../docs/evidence'); mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(resolve(evidenceDir, 'm3-06-stage-03.json'), `${JSON.stringify(report, null, 2)}\n`);
    const rows = enemyKinds.map((kind) => `| ${kind} | ${stats[kind].spawned} | ${stats[kind].attacks} | ${stats[kind].defeated} | ${stats[kind].exited} |`).join('\n');
    const gateRows = Object.entries(gates).map(([name, passed]) => `| ${name} | ${passed ? 'PASS' : 'FAIL'} |`).join('\n');
    writeFileSync(resolve(evidenceDir, 'm3-06-stage-03.md'), `# M3-06 Stage 3 Report\n\n- Duration: ${STAGE_03_DURATION_TICKS} ticks (195 seconds)\n- Scheduled spawns: ${STAGE_03_SPAWNS.length}\n- Max enemies / enemy bullets: ${first.maxEnemies} / ${first.maxEnemyBullets}\n- Longest no-combat gap: ${first.maxCombatGap} ticks\n- Wet points / peak: ${rain.trailPointsWetted} / ${rain.wetTrailPeak}\n- Wet annotated shots / damage: ${rain.wetAnnotatedShots} / ${rain.wetDamage}\n- Determinism hashes: ${[first.hash, ...replayHashes].join(', ')}\n\n| Enemy | Spawned | Attacks | Defeated | Exited |\n| --- | ---: | ---: | ---: | ---: |\n${rows}\n\n| Gate | Result |\n| --- | --- |\n${gateRows}\n`);
    expect(gates).toEqual(Object.fromEntries(Object.keys(gates).map((gate) => [gate, true])));
  }, 120_000);
});
