import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EnemyKind, GameState, InputFrame } from '../src/core/types';
import { STAGE_06_DURATION_TICKS, STAGE_06_ENTITY_LIMITS, STAGE_06_SPAWNS } from '../src/content/stage-06';
import { createPilot } from '../src/simulation/autopilot';
import { createInitialState, step } from '../src/simulation/game';

const enemyKinds: EnemyKind[] = ['binding-wasp', 'revision-hound', 'null-choir', 'archive-palanquin'];
const hashState = (state: GameState): string => createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16);

const simulate = (seed: number, replay?: InputFrame[]) => {
  let state = createInitialState(seed, 'stage-06');
  const pilot = createPilot('stitch');
  const frames: InputFrame[] = [];
  let maxEnemies = 0; let maxEnemyBullets = 0; let currentCombatGap = 0; let maxCombatGap = 0;
  for (let tick = 0; tick < STAGE_06_DURATION_TICKS; tick += 1) {
    const input = replay?.[tick] ?? pilot(state); frames.push(input); state = step(state, input).state;
    const enemyBullets = state.bullets.filter((bullet) => bullet.kind === 'enemy').length;
    maxEnemies = Math.max(maxEnemies, state.enemies.length); maxEnemyBullets = Math.max(maxEnemyBullets, enemyBullets);
    currentCombatGap = state.enemies.length === 0 && enemyBullets === 0 ? currentCombatGap + 1 : 0;
    maxCombatGap = Math.max(maxCombatGap, currentCombatGap);
  }
  return { state, frames, maxEnemies, maxEnemyBullets, maxCombatGap, hash: hashState(state) };
};

describe('M3-21 Stage 6 evidence', () => {
  it('recomposes four rules into a deterministic original-folio progression', () => {
    const first = simulate(3601);
    const replayHashes = Array.from({ length: 3 }, () => simulate(3601, first.frames).hash);
    const stats = first.state.metrics.enemyStats; const original = first.state.metrics.original!;
    const gates = {
      allKindsSpawned: enemyKinds.every((kind) => stats[kind].spawned > 0),
      allKindsAttacked: enemyKinds.every((kind) => stats[kind].attacks > 0),
      allKindsResolved: enemyKinds.every((kind) => stats[kind].defeated + stats[kind].exited === stats[kind].spawned),
      everyFolioVisited: Object.values(original.folioTicks).every((ticks) => ticks > 0),
      inheritedRulesUsed: first.state.metrics.wind.trailDrift > 0 && first.state.metrics.rain.drops > 0
        && first.state.metrics.heat.waves > 0 && first.state.metrics.mirror!.falseTrailPeak > 0,
      rolesActivated: original.bindingLinks > 0 && original.houndRevisions > 0 && original.choirVerses > 0 && original.palanquinSalvos > 0,
      choirCanBeOpened: original.choirHoles > 0,
      writingInherited: original.inheritedCollates > 0 && original.synthesisCollates > 0,
      noUnintendedFourSecondGap: first.maxCombatGap < 4 * 120,
      enemyLimit: first.maxEnemies <= STAGE_06_ENTITY_LIMITS.enemies && first.state.metrics.rejectedEnemies === 0,
      bulletLimit: first.maxEnemyBullets <= STAGE_06_ENTITY_LIMITS.enemyBullets && first.state.metrics.rejectedEnemyBullets === 0,
      deterministicReplay: new Set(replayHashes).size === 1 && replayHashes[0] === first.hash,
      stageDrained: first.state.enemies.length === 0
    };
    const report = { generatedAt: '2026-11-01', durationTicks: STAGE_06_DURATION_TICKS, scheduledSpawns: STAGE_06_SPAWNS.length,
      seed: 3601, finalHash: first.hash, replayHashes, maxEnemies: first.maxEnemies, maxEnemyBullets: first.maxEnemyBullets,
      maxCombatGapTicks: first.maxCombatGap, stats: Object.fromEntries(enemyKinds.map((kind) => [kind, stats[kind]])), original,
      environment: { wind: first.state.metrics.wind, rain: first.state.metrics.rain, heat: first.state.metrics.heat, mirror: first.state.metrics.mirror },
      rejectedEnemies: first.state.metrics.rejectedEnemies, rejectedEnemyBullets: first.state.metrics.rejectedEnemyBullets, gates };
    const evidenceDir = resolve(import.meta.dirname, '../../docs/evidence'); mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(resolve(evidenceDir, 'm3-21-stage-06.json'), `${JSON.stringify(report, null, 2)}\n`);
    const rows = enemyKinds.map((kind) => `| ${kind} | ${stats[kind].spawned} | ${stats[kind].attacks} | ${stats[kind].defeated} | ${stats[kind].exited} |`).join('\n');
    const gateRows = Object.entries(gates).map(([name, passed]) => `| ${name} | ${passed ? 'PASS' : 'FAIL'} |`).join('\n');
    writeFileSync(resolve(evidenceDir, 'm3-21-stage-06.md'), `# M3-21 Stage 6 Report\n\n- Duration: ${STAGE_06_DURATION_TICKS} ticks (270 seconds)\n- Scheduled spawns: ${STAGE_06_SPAWNS.length}\n- Max enemies / enemy bullets: ${first.maxEnemies} / ${first.maxEnemyBullets}\n- Longest no-combat gap: ${first.maxCombatGap} ticks\n- Binding / hound / choir / palanquin: ${original.bindingLinks} / ${original.houndRevisions} / ${original.choirVerses} / ${original.palanquinSalvos}\n- Inherited / synthesis COLLATE: ${original.inheritedCollates} / ${original.synthesisCollates}\n- Determinism hashes: ${[first.hash, ...replayHashes].join(', ')}\n\n| Enemy | Spawned | Attacks | Defeated | Exited |\n| --- | ---: | ---: | ---: | ---: |\n${rows}\n\n| Gate | Result |\n| --- | --- |\n${gateRows}\n`);
    expect(gates).toEqual(Object.fromEntries(Object.keys(gates).map((gate) => [gate, true])));
  }, 180_000);
});
