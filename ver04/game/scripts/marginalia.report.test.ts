import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MARGINALIA_IDS, marginaliaCandidates, type MarginaliaId } from '../src/content/marginalia';
import { createPilot } from '../src/simulation/autopilot';
import { createInitialState, step } from '../src/simulation/game';

const duration = 7_200;
const loadouts: Record<string, MarginaliaId[]> = {
  baseline: [],
  stroke: ['longhand', 'footnote', 'cross-reference', 'errata'],
  annotation: ['rubric', 'gloss', 'ligature', 'underline'],
  recovery: ['redaction', 'citation', 'palinode', 'afterword'],
  balanced: ['footnote', 'gloss', 'citation'],
  resilient: ['longhand', 'rubric', 'afterword']
};

const simulate = (owned: MarginaliaId[]) => {
  let state = createInitialState(4404);
  const pilot = createPilot('stitch');
  let shots = 0;
  for (let tick = 0; tick < duration; tick += 1) {
    const result = step(state, pilot(state), 'normal', owned);
    state = result.state;
    shots += result.events.filter((event) => event.type === 'shot-fired').length;
  }
  return {
    score: state.score, damage: state.metrics.damage, enemiesDefeated: state.metrics.enemiesDefeated,
    collates: state.metrics.loops, captured: state.metrics.captured,
    annotatedShots: state.metrics.annotatedShots, shots, finalGauge: state.gauge
  };
};

describe('M4-04 marginalia evidence', () => {
  it('keeps every note reachable and records distinct build outcomes', () => {
    const reachable = new Set<MarginaliaId>();
    for (const stage of ['stage-01', 'stage-02', 'stage-03', 'stage-04', 'stage-05', 'stage-06'] as const) {
      for (const moment of ['midpoint', 'result'] as const) marginaliaCandidates(404, stage, moment).forEach((id) => reachable.add(id));
    }
    const builds = Object.fromEntries(Object.entries(loadouts).map(([name, owned]) => [name, simulate(owned)]));
    const signatures = new Set(Object.values(builds).map((result) => JSON.stringify(result)));
    const report = { generatedAt: '2026-11-01', durationTicks: duration, reachable: [...reachable].sort(), builds };
    const evidenceDir = resolve(import.meta.dirname, '../../docs/evidence');
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(resolve(evidenceDir, 'm4-04-marginalia.json'), `${JSON.stringify(report, null, 2)}\n`);
    const rows = Object.entries(builds).map(([name, value]) =>
      `| ${name} | ${value.score} | ${value.enemiesDefeated} | ${value.damage} | ${value.collates} | ${value.captured} | ${value.annotatedShots} | ${value.shots} |`
    ).join('\n');
    writeFileSync(resolve(evidenceDir, 'm4-04-marginalia.md'), `# M4-04 Marginalia Build Comparison\n\n- Window: ${duration} ticks (60 seconds), Stage 1, seed 4404\n- Reachable notes: ${[...reachable].sort().join(', ')}\n\n| Build | Score | Defeated | Damage | Collates | Captured | Annotated | Shots |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n${rows}\n`);
    expect(reachable).toEqual(new Set(MARGINALIA_IDS));
    expect(signatures.size).toBeGreaterThanOrEqual(4);
  }, 120_000);
});
