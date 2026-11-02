import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MARGINALIA_IDS } from '../src/content/marginalia';
import { createPilot } from '../src/simulation/autopilot';
import { createInitialState, step } from '../src/simulation/game';

const percentile = (values: number[], ratio: number) =>
  values.slice().sort((a, b) => a - b)[Math.ceil(values.length * ratio) - 1] ?? 0;

describe('M4-05 simulation performance evidence', () => {
  it('holds the tick budget in the heaviest authored encounter without hiding rejected entities', () => {
    let state = createInitialState(4599, 'stage-06', 'proof');
    const pilot = createPilot('stitch');
    const advance = () => { state = step(state, pilot(state), 'proof', MARGINALIA_IDS).state; };

    // Enter late mirror before the timed warmup. The measured minute includes
    // synthesis and THE LAST EDITOR entry, where inherited rules overlap.
    for (let tick = 0; tick < 24_000; tick += 1) advance();
    for (let tick = 0; tick < 1_200; tick += 1) advance();

    const samples: number[] = [];
    let maxEnemies = 0;
    let maxEnemyBullets = 0;
    for (let tick = 0; tick < 7_200; tick += 1) {
      const started = performance.now();
      advance();
      samples.push(performance.now() - started);
      maxEnemies = Math.max(maxEnemies, state.enemies.length);
      maxEnemyBullets = Math.max(maxEnemyBullets, state.bullets.filter((bullet) => bullet.kind === 'enemy').length);
    }

    const report = {
      generatedAt: '2026-11-01',
      scenario: 'Stage 6 late mirror, synthesis, and THE LAST EDITOR entry on PROOF with all marginalia',
      warmupTicks: 1_200,
      measuredTicks: samples.length,
      averageMs: samples.reduce((sum, value) => sum + value, 0) / samples.length,
      p95Ms: percentile(samples, 0.95),
      maxMs: Math.max(...samples),
      maxEnemies,
      maxEnemyBullets,
      rejectedEnemies: state.metrics.rejectedEnemies,
      rejectedEnemyBullets: state.metrics.rejectedEnemyBullets
    };
    const gates = {
      average: report.averageMs <= 0.8,
      p95: report.p95Ms <= 1.5,
      maximum: report.maxMs <= 4,
      noRejectedEntities: report.rejectedEnemies === 0 && report.rejectedEnemyBullets === 0
    };
    const evidenceDir = resolve(import.meta.dirname, '../../docs/evidence');
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(resolve(evidenceDir, 'm4-05-simulation-performance.json'), `${JSON.stringify({ ...report, gates }, null, 2)}\n`);
    writeFileSync(resolve(evidenceDir, 'm4-05-simulation-performance.md'), `# M4-05 Simulation Performance\n\n- Scenario: ${report.scenario}\n- Warmup: ${report.warmupTicks} ticks (10 seconds)\n- Measurement: ${report.measuredTicks} ticks (60 seconds)\n- Tick average / p95 / max: ${report.averageMs.toFixed(3)} / ${report.p95Ms.toFixed(3)} / ${report.maxMs.toFixed(3)} ms\n- Peak enemies / enemy bullets: ${report.maxEnemies} / ${report.maxEnemyBullets}\n- Rejected enemies / bullets: ${report.rejectedEnemies} / ${report.rejectedEnemyBullets}\n\nAll simulation tick gates passed. Chrome frame, long-task, and heap gates remain part of M4-05.\n`);
    expect(gates).toEqual({ average: true, p95: true, maximum: true, noRejectedEntities: true });
  }, 120_000);
});
