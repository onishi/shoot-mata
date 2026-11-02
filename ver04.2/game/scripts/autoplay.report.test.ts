import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GameState, InputFrame } from '../src/core/types';
import { createPilot, type PilotName } from '../src/simulation/autopilot';
import { createInitialState, PLAYGROUND_DURATION_TICKS, step } from '../src/simulation/game';

interface RunResult {
  pilot: PilotName;
  seed: number;
  completedTicks: number;
  finalHash: string;
  score: number;
  damage: number;
  health: number;
  loops: number;
  emptyLoops: number;
  captured: number;
  retraces: number;
  annotatedShots: number;
  enemiesDefeated: number;
  haulersDefeated: number;
  firstHaulerDefeatTick: number | null;
  averageEnemies: number;
  averageEnemyBullets: number;
  maxEnemies: number;
  maxEnemyBullets: number;
}

const hashState = (state: GameState): string => createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16);

const simulate = (pilotName: PilotName, seed: number, replay?: InputFrame[]): { result: RunResult; frames: InputFrame[] } => {
  let state = createInitialState(seed);
  const pilot = createPilot(pilotName);
  const frames: InputFrame[] = [];
  let enemySamples = 0;
  let bulletSamples = 0;
  let maxEnemies = 0;
  let maxEnemyBullets = 0;
  for (let tick = 0; tick < PLAYGROUND_DURATION_TICKS; tick += 1) {
    const input = replay?.[tick] ?? pilot(state);
    frames.push(input);
    state = step(state, input).state;
    const enemyBullets = state.bullets.filter((bullet) => bullet.kind === 'enemy').length;
    enemySamples += state.enemies.length;
    bulletSamples += enemyBullets;
    maxEnemies = Math.max(maxEnemies, state.enemies.length);
    maxEnemyBullets = Math.max(maxEnemyBullets, enemyBullets);
  }
  return {
    frames,
    result: {
      pilot: pilotName, seed, completedTicks: state.tick, finalHash: hashState(state),
      score: state.score, damage: state.metrics.damage, health: state.player.health,
      loops: state.metrics.loops, emptyLoops: state.metrics.emptyLoops,
      captured: state.metrics.captured, retraces: state.metrics.retraces,
      annotatedShots: state.metrics.annotatedShots,
      enemiesDefeated: state.metrics.enemiesDefeated, haulersDefeated: state.metrics.haulersDefeated,
      firstHaulerDefeatTick: state.metrics.firstHaulerDefeatTick,
      averageEnemies: enemySamples / PLAYGROUND_DURATION_TICKS,
      averageEnemyBullets: bulletSamples / PLAYGROUND_DURATION_TICKS,
      maxEnemies, maxEnemyBullets
    }
  };
};

const median = (values: number[]): number => {
  const sorted = values.slice().sort((a, b) => a - b);
  return (sorted[4] + sorted[5]) / 2;
};

const format = (value: number): string => Number.isInteger(value) ? String(value) : value.toFixed(1);

describe('M1-02 autoplay evidence', () => {
  it('runs the 3-minute strategy matrix and writes deterministic evidence', () => {
    const pilots: PilotName[] = ['baseline', 'safe', 'stitch', 'sweep'];
    const seeds = Array.from({ length: 10 }, (_, index) => 404 + index * 97);
    const runs = pilots.flatMap((pilot) => seeds.map((seed) => simulate(pilot, seed).result));

    const probe = simulate('stitch', seeds[0]);
    const determinismHashes = Array.from({ length: 5 }, () => simulate('stitch', seeds[0], probe.frames).result.finalHash);
    expect(new Set(determinismHashes).size).toBe(1);
    expect(runs.every((run) => run.completedTicks === PLAYGROUND_DURATION_TICKS)).toBe(true);

    const summary = pilots.map((pilot) => {
      const selected = runs.filter((run) => run.pilot === pilot);
      const defeatTicks = selected.map((run) => run.firstHaulerDefeatTick ?? PLAYGROUND_DURATION_TICKS);
      return {
        pilot,
        medianLoops: median(selected.map((run) => run.loops)),
        medianEffectiveCollates: median(selected.map((run) => run.loops - run.emptyLoops)),
        medianCaptured: median(selected.map((run) => run.captured)),
        medianDamage: median(selected.map((run) => run.damage)),
        medianScore: median(selected.map((run) => run.score)),
        medianFirstHaulerDefeatTick: median(defeatTicks),
        medianHaulersDefeated: median(selected.map((run) => run.haulersDefeated))
      };
    });
    const byPilot = Object.fromEntries(summary.map((row) => [row.pilot, row]));
    const fastestMechanic = Math.min(byPilot.stitch.medianFirstHaulerDefeatTick, byPilot.sweep.medianFirstHaulerDefeatTick);
    const gates = {
      allCompleted: runs.every((run) => run.completedTicks === PLAYGROUND_DURATION_TICKS),
      deterministicFiveRuns: new Set(determinismHashes).size === 1,
      threeEffectiveCollates: ['safe', 'stitch', 'sweep'].every((pilot) => byPilot[pilot].medianEffectiveCollates >= 3),
      mechanicTwentyPercentFaster: fastestMechanic <= byPilot.baseline.medianFirstHaulerDefeatTick * 0.8,
      safeDamageNoHigherThanSweep: byPilot.safe.medianDamage <= byPilot.sweep.medianDamage,
      sweepScoreHighest: byPilot.sweep.medianScore >= Math.max(byPilot.safe.medianScore, byPilot.stitch.medianScore)
    };

    const evidenceDir = resolve(import.meta.dirname, '../../docs/evidence');
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(resolve(evidenceDir, 'm1-02-autoplay.json'), `${JSON.stringify({ generatedAt: '2026-10-31', durationTicks: PLAYGROUND_DURATION_TICKS, seeds, determinismHashes, summary, gates, runs }, null, 2)}\n`);
    const rows = summary.map((row) => `| ${row.pilot} | ${format(row.medianEffectiveCollates)} | ${format(row.medianCaptured)} | ${format(row.medianDamage)} | ${format(row.medianScore)} | ${format(row.medianFirstHaulerDefeatTick)} | ${format(row.medianHaulersDefeated)} |`).join('\n');
    const gateRows = Object.entries(gates).map(([gate, passed]) => `| ${gate} | ${passed ? 'PASS' : 'FAIL'} |`).join('\n');
    writeFileSync(resolve(evidenceDir, 'm1-02-autoplay.md'), `# M1-02 Autoplay Report\n\n- Duration: ${PLAYGROUND_DURATION_TICKS} ticks (180 seconds)\n- Seeds: ${seeds.join(', ')}\n- Determinism hashes: ${determinismHashes.join(', ')}\n\n| Pilot | Median effective COLLATE | Median captured | Median damage | Median score | First hauler defeat tick | Haulers defeated |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n${rows}\n\n| Gate | Result |\n| --- | --- |\n${gateRows}\n`);

    // Keep the report even when a tuning gate fails; the failing assertion makes
    // that state impossible to mistake for completion.
    expect(gates).toEqual({
      allCompleted: true,
      deterministicFiveRuns: true,
      threeEffectiveCollates: true,
      mechanicTwentyPercentFaster: true,
      safeDamageNoHigherThanSweep: true,
      sweepScoreHighest: true
    });
  }, 120_000);
});
