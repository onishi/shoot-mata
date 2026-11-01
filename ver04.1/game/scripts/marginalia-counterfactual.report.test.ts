import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MARGINALIA, MARGINALIA_IDS, type MarginaliaId } from '../src/content/marginalia';
import { STAGE_01_BOSS_START_TICK, STAGE_01_SPAWNS } from '../src/content/stage-01';
import type { GameState } from '../src/core/types';
import { createPilot } from '../src/simulation/autopilot';
import { createInitialState, step } from '../src/simulation/game';

type Scenario = 'combat' | 'boss' | 'recovery';

interface Outcome {
  ticks: number;
  score: number;
  damage: number;
  enemiesDefeated: number;
  collates: number;
  captured: number;
  candidates: number;
  annotatedShots: number;
  retraces: number;
  returnedHits: number;
  armorLayersStripped: number;
  bossDefeated: boolean;
  finalGauge: number;
  trailPeak: number;
  candidatePeak: number;
}

const bossStart = (seed: number): GameState => {
  const state = createInitialState(seed);
  state.tick = STAGE_01_BOSS_START_TICK - 1;
  state.encounterIndex = STAGE_01_SPAWNS.length;
  state.enemies = [];
  state.bullets = [];
  state.trail = [];
  return step(state, {}).state;
};

const scenarioStart = (scenario: Scenario): GameState => {
  const state = scenario === 'boss' ? bossStart(4411) : createInitialState(4410);
  if (scenario === 'recovery') {
    // Start every counterfactual from the exact same post-hit frame. This
    // isolates recovery behavior from whether a pilot happens to dodge the
    // preceding projectile and keeps the input stream identical per note.
    state.player.health = 2;
    state.lastDamageTick = state.tick;
    state.player.invulnerableUntil = state.tick + 240;
    state.metrics.damage = 1;
  }
  return state;
};

const simulate = (scenario: Scenario, note?: MarginaliaId): Outcome => {
  let state = scenarioStart(scenario);
  const pilot = createPilot('stitch');
  const limit = scenario === 'boss' ? 14_400 : 7_200;
  let trailPeak = 0;
  let candidatePeak = 0;
  let ticks = 0;
  for (; ticks < limit && (scenario !== 'boss' || !state.metrics.boss.defeated); ticks += 1) {
    state = step(state, pilot(state), 'normal', note ? [note] : []).state;
    trailPeak = Math.max(trailPeak, state.trail.length);
    candidatePeak = Math.max(candidatePeak, state.candidate?.area ?? 0);
  }
  return {
    ticks,
    score: state.score,
    damage: state.metrics.damage,
    enemiesDefeated: state.metrics.enemiesDefeated,
    collates: state.metrics.loops,
    captured: state.metrics.captured,
    candidates: state.metrics.candidates,
    annotatedShots: state.metrics.annotatedShots,
    retraces: state.metrics.retraces,
    returnedHits: state.metrics.boss.returnedHits,
    armorLayersStripped: state.metrics.boss.armorLayersStripped,
    bossDefeated: state.metrics.boss.defeated,
    finalGauge: state.gauge,
    trailPeak,
    candidatePeak
  };
};

const changedMetrics = (baseline: Outcome, outcome: Outcome): string[] =>
  (Object.keys(baseline) as Array<keyof Outcome>).filter((key) => outcome[key] !== baseline[key]);

const materialMetrics = (baseline: Outcome, outcome: Outcome): string[] =>
  (Object.keys(baseline) as Array<keyof Outcome>).flatMap((key) => {
    const before = baseline[key];
    const after = outcome[key];
    if (typeof before !== 'number' || typeof after !== 'number' || before === after) return [];
    if (before === 0) return after > 0 ? [`${key}:new(${after})`] : [];
    const percent = (after - before) / Math.abs(before) * 100;
    return Math.abs(percent) >= 10 ? [`${key}:${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`] : [];
  });

describe('v4.1-03 marginalia counterfactual evidence', () => {
  it('measures every note alone in combat, boss, and post-hit recovery conditions', () => {
    const scenarios = ['combat', 'boss', 'recovery'] as const;
    const baselines = Object.fromEntries(scenarios.map((scenario) => [scenario, simulate(scenario)])) as Record<Scenario, Outcome>;
    const notes = Object.fromEntries(MARGINALIA_IDS.map((id) => {
      const outcomes = Object.fromEntries(scenarios.map((scenario) => {
        const outcome = simulate(scenario, id);
        return [scenario, {
          outcome,
          changed: changedMetrics(baselines[scenario], outcome),
          material: materialMetrics(baselines[scenario], outcome)
        }];
      }));
      return [id, { family: MARGINALIA[id].family, outcomes }];
    }));
    const report = { generatedAt: '2026-11-01', seeds: { combat: 4410, boss: 4411, recovery: 4410 }, baselines, notes };
    const evidenceDir = resolve(import.meta.dirname, '../../docs/evidence');
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(resolve(evidenceDir, 'v4.1-03-marginalia-counterfactual.json'), `${JSON.stringify(report, null, 2)}\n`);

    const rows = MARGINALIA_IDS.flatMap((id) => scenarios.map((scenario) => {
      const result = notes[id].outcomes[scenario];
      return `| ${MARGINALIA[id].name} | ${MARGINALIA[id].family} | ${scenario} | ${result.changed.join(', ') || 'none'} | ${result.material.join(', ') || 'none'} | ${result.outcome.score} | ${result.outcome.damage} | ${result.outcome.collates} | ${result.outcome.captured} |`;
    })).join('\n');
    writeFileSync(resolve(evidenceDir, 'v4.1-03-marginalia-counterfactual.md'), `# v4.1-03 MARGINALIA Counterfactual Baseline\n\n- Each note is equipped alone against a no-note baseline.\n- Combat and recovery use seed 4410 for 7,200 ticks; recovery begins on the same deterministic post-hit frame.\n- Boss uses seed 4411 from BLANK BAILIFF entry for at most 14,400 ticks.\n- “Material” records numeric changes of at least 10%, or a new non-zero result from a zero baseline. It is diagnostic, not a completion claim; tuning must move the intended metric or add an authored success event.\n\n| Note | Family | Condition | Changed metrics | Material changes | Score | Damage | Collates | Captured |\n| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: |\n${rows}\n`);

    expect(Object.keys(notes)).toEqual(MARGINALIA_IDS);
    for (const id of MARGINALIA_IDS) {
      expect(Object.keys(notes[id].outcomes)).toEqual(scenarios);
    }
  }, 120_000);
});
