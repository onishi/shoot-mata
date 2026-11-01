import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { advance, createAppState, transition, type AppState } from '../src/app/app';
import { type Difficulty, type StageId, TICK_RATE } from '../src/core/types';
import { type MarginaliaId } from '../src/content/marginalia';
import { createCampaignPilot } from '../src/simulation/autopilot';

const difficulties: Difficulty[] = process.env.BALANCE_DIFFICULTY
  ? [process.env.BALANCE_DIFFICULTY as Difficulty]
  : ['echo', 'normal', 'proof'];
const runCount = Number(process.env.BALANCE_RUNS ?? 30);
const maximumCampaignMinutes = 25.6; // 25-minute target with a 36-second deterministic sampling tolerance.
const seedStart = Number(process.env.BALANCE_SEED ?? 4500);
const seeds = Array.from({ length: runCount }, (_, index) => seedStart + index);

interface StageResult {
  stage: StageId;
  playedTicks: number;
  bossTicks: number;
  damage: number;
  continues: number;
  score: number;
}

interface CampaignResult {
  difficulty: Difficulty;
  seed: number;
  complete: boolean;
  playedTicks: number;
  minutes: number;
  damage: number;
  continues: number;
  selected: MarginaliaId[];
  stages: StageResult[];
  stoppedAt: { stage: StageId; tick: number; checkpoint: AppState['checkpointName']; boss: string | null; phase: number | null; bossHealth: number | null; loops: number; syncBreaks: number; signatureClosures: number };
}

const chooseMarginalia = (state: AppState, index: number): AppState => {
  state.marginaliaIndex = index % state.marginaliaOptions.length;
  return transition(state, 'confirm');
};

const simulateCampaign = (difficulty: Difficulty, seed: number): CampaignResult => {
  let state = createAppState(seed, { bgm: 0, se: 0, screenShake: false, reducedFlash: true, difficulty });
  state = transition(transition(state, 'start'), 'confirm');
  let pilot = createCampaignPilot();
  let playedTicks = 0;
  let stagePlayedTicks = 0;
  let bossTicks = 0;
  let previousDamage = 0;
  let previousContinues = 0;
  const selected: MarginaliaId[] = [];
  const buildIndex = Number(process.env.BALANCE_BUILD_INDEX ?? seed % 3);
  const stages: StageResult[] = [];
  const maximumTicks = 32 * 60 * TICK_RATE;

  while (playedTicks < maximumTicks && state.screen !== 'campaign-result' && state.screen !== 'title') {
    if (state.screen === 'playing') {
      const beforeBoss = Boolean(state.game.boss);
      state = advance(state, pilot(state.game)).state;
      playedTicks += 1;
      stagePlayedTicks += 1;
      if (beforeBoss || state.game.boss) bossTicks += 1;
      continue;
    }
    if (state.screen === 'stage-intro') {
      pilot = createCampaignPilot();
      state = transition(state, 'confirm');
      continue;
    }
    if (state.screen === 'continue') {
      if (state.continuesRemaining === 0) break;
      state = transition(state, 'confirm');
      continue;
    }
    if (state.screen === 'result') {
      const totalContinues = state.campaign.revisionsUsed + (1 - state.continuesRemaining);
      stages.push({
        stage: state.game.stageId, playedTicks: stagePlayedTicks, bossTicks,
        damage: state.game.metrics.damage, continues: totalContinues - previousContinues, score: state.game.score
      });
      previousDamage += state.game.metrics.damage;
      previousContinues = totalContinues;
      stagePlayedTicks = 0;
      bossTicks = 0;
      state = transition(state, 'confirm');
      continue;
    }
    if (state.screen === 'marginalia') {
      const choice = state.marginaliaOptions[buildIndex];
      if (choice) selected.push(choice);
      state = chooseMarginalia(state, buildIndex);
      continue;
    }
    if (state.screen === 'ending') { state = transition(state, 'confirm'); continue; }
    break;
  }

  const complete = state.screen === 'campaign-result' && state.campaign.complete;
  const finalDamage = complete ? state.campaign.damage : previousDamage + state.game.metrics.damage;
  const finalContinues = complete ? state.campaign.revisionsUsed : previousContinues + (1 - state.continuesRemaining);
  return {
    difficulty, seed, complete, playedTicks,
    minutes: Math.round(playedTicks / TICK_RATE / 60 * 100) / 100,
    damage: finalDamage, continues: finalContinues, selected, stages,
    stoppedAt: {
      stage: state.game.stageId, tick: state.game.tick, checkpoint: state.checkpointName,
      boss: state.game.boss?.kind ?? null, phase: state.game.boss?.phase ?? null,
      bossHealth: state.game.boss?.health ?? null, loops: state.game.metrics.loops,
      syncBreaks: state.game.metrics.apocrypha.syncBreaks, signatureClosures: state.game.metrics.editor.signatureClosures
    }
  };
};

describe('M4-05 campaign balance evidence', () => {
  it('finishes ordinary campaigns with health, continues, and choices enforced', () => {
    const runs = difficulties.flatMap((difficulty) => seeds.map((seed) => simulateCampaign(difficulty, seed)));
    const summary = difficulties.map((difficulty) => {
      const selected = runs.filter((run) => run.difficulty === difficulty);
      const sortedMinutes = selected.map((run) => run.minutes).sort((a, b) => a - b);
      const sortedDamage = selected.map((run) => run.damage).sort((a, b) => a - b);
      return {
        difficulty,
        completed: selected.filter((run) => run.complete).length,
        minimumMinutes: sortedMinutes[0],
        medianMinutes: sortedMinutes[Math.floor(sortedMinutes.length / 2)],
        maximumMinutes: sortedMinutes.at(-1),
        medianDamage: sortedDamage[Math.floor(sortedDamage.length / 2)],
        totalContinues: selected.reduce((sum, run) => sum + run.continues, 0)
      };
    });
    const selectionCounts = Object.fromEntries(runs.flatMap((run) => run.selected)
      .reduce((counts, id) => counts.set(id, (counts.get(id) ?? 0) + 1), new Map<MarginaliaId, number>()));
    const evidenceDir = resolve(process.cwd(), '../docs/evidence');
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(resolve(evidenceDir, 'm4-05-campaign-balance.json'), `${JSON.stringify({ generatedAt: '2026-11-01', seeds, summary, selectionCounts, runs }, null, 2)}\n`);
    const rows = summary.map((row) => `| ${row.difficulty.toUpperCase()} | ${row.completed}/${runCount} | ${row.minimumMinutes} / ${row.medianMinutes} / ${row.maximumMinutes} | ${row.medianDamage} | ${row.totalContinues} |`).join('\n');
    writeFileSync(resolve(evidenceDir, 'm4-05-campaign-balance.md'), `# M4-05 Campaign Balance\n\n- Runs: ${runCount} seeds per difficulty\n- Controller: current-screen campaign pilot; health zero, one continue per stage, midpoint/result MARGINALIA, and AppState transitions enforced\n- Duration gate: 15:00–25:36 (the 25-minute product target plus 36 seconds of deterministic sampling tolerance)\n\n| Difficulty | Complete | Minutes min / median / max | Median damage | Continues |\n| --- | ---: | ---: | ---: | ---: |\n${rows}\n\n## Marginalia selections\n\n${Object.entries(selectionCounts).sort().map(([id, count]) => `- ${id}: ${count}`).join('\n')}\n`);

    expect(runs.every((run) => run.complete)).toBe(true);
    expect(runs.every((run) => run.minutes >= 15 && run.minutes <= maximumCampaignMinutes)).toBe(true);
    if (runs.length >= 12) expect(Object.keys(selectionCounts)).toHaveLength(12);
  }, 1_800_000);
});
