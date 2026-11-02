import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { advance, createAppState, transition, type AppState } from '../src/app/app';
import { type Difficulty, type StageId, TICK_RATE } from '../src/core/types';
import { type MarginaliaId } from '../src/content/marginalia';
import { createCampaignPilot } from '../src/simulation/autopilot';
import { DIFFICULTY_PRESSURE } from '../src/simulation/game';

const difficulties: Difficulty[] = process.env.BALANCE_DIFFICULTY
  ? [process.env.BALANCE_DIFFICULTY as Difficulty]
  : ['echo', 'normal', 'proof'];
const runCount = Number(process.env.BALANCE_RUNS ?? 30);
const maximumCampaignMinutes = 25;
const seedStart = Number(process.env.BALANCE_SEED ?? 4500);
const seeds = Array.from({ length: runCount }, (_, index) => seedStart + index);

interface StageResult {
  stage: StageId;
  playedTicks: number;
  bossTicks: number;
  damage: number;
  continues: number;
  score: number;
  maximumHazards: number;
  echoForecasts: number;
  mechanicSuccesses: number;
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
  stoppedAt: { stage: StageId; tick: number; checkpoint: AppState['checkpointName']; boss: string | null; phase: number | null; bossHealth: number | null; loops: number; syncBreaks: number; editorRules: number; editorOrdinaryHits: number; signatureClosures: number };
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
  let maximumHazards = 0;
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
      maximumHazards = Math.max(maximumHazards, state.game.bullets.filter((bullet) => bullet.kind === 'enemy').length);
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
        damage: state.game.metrics.damage, continues: totalContinues - previousContinues, score: state.game.score,
        maximumHazards,
        echoForecasts: state.game.metrics.echoForecasts,
        mechanicSuccesses: state.game.stageId === 'stage-01'
          ? state.game.metrics.boss.returnedHits + state.game.metrics.boss.armorLayersStripped
          : state.game.stageId === 'stage-02'
            ? state.game.metrics.compiler.windLocks + state.game.metrics.compiler.weakpointHits
            : state.game.stageId === 'stage-03'
              ? state.game.metrics.eel.segmentMarks + state.game.metrics.eel.wetWeakpointHits
              : state.game.stageId === 'stage-04'
                ? state.game.metrics.advocate.embersCooled + state.game.metrics.advocate.cooledHits
                : state.game.stageId === 'stage-05'
                  ? state.game.metrics.apocrypha.syncBreaks + state.game.metrics.apocrypha.weakpointHits
                  : state.game.metrics.editor.rulesRewritten + state.game.metrics.editor.revisionHits + state.game.metrics.editor.signatureClosures
      });
      previousDamage += state.game.metrics.damage;
      previousContinues = totalContinues;
      stagePlayedTicks = 0;
      bossTicks = 0;
      maximumHazards = 0;
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
      syncBreaks: state.game.metrics.apocrypha.syncBreaks, editorRules: state.game.metrics.editor.rulesRewritten,
      editorOrdinaryHits: state.game.metrics.editor.ordinaryHits, signatureClosures: state.game.metrics.editor.signatureClosures
    }
  };
};

describe('M4-05 campaign balance evidence', () => {
  it('finishes ordinary campaigns with health, continues, and choices enforced', () => {
    const totalRuns = difficulties.length * seeds.length;
    let completedRuns = 0;
    const runs = difficulties.flatMap((difficulty) => seeds.map((seed) => {
      const result = simulateCampaign(difficulty, seed);
      completedRuns += 1;
      process.stdout.write(`[balance ${completedRuns}/${totalRuns}] ${difficulty.toUpperCase()} seed ${seed}: ${result.minutes.toFixed(2)}m, damage ${result.damage}, continues ${result.continues}\n`);
      return result;
    }));
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
        totalContinues: selected.reduce((sum, run) => sum + run.continues, 0),
        continueRate: selected.filter((run) => run.continues > 0).length / selected.length,
        maximumHazards: Math.max(...selected.flatMap((run) => run.stages.map((stage) => stage.maximumHazards))),
        warningTicks: DIFFICULTY_PRESSURE[difficulty].warningTicks,
        echoForecasts: selected.reduce((sum, run) => sum + run.stages.reduce((stageSum, stage) => stageSum + stage.echoForecasts, 0), 0),
        mechanicSuccesses: selected.reduce((sum, run) => sum + run.stages.reduce((stageSum, stage) => stageSum + stage.mechanicSuccesses, 0), 0)
      };
    });
    const selectionCounts = Object.fromEntries(runs.flatMap((run) => run.selected)
      .reduce((counts, id) => counts.set(id, (counts.get(id) ?? 0) + 1), new Map<MarginaliaId, number>()));
    const evidenceDir = resolve(process.env.EVIDENCE_DIR ?? resolve(process.cwd(), '../docs/evidence'));
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(resolve(evidenceDir, 'm4-05-campaign-balance.json'), `${JSON.stringify({ generatedAt: '2026-11-02', seeds, summary, selectionCounts, runs }, null, 2)}\n`);
    const rows = summary.map((row) => `| ${row.difficulty.toUpperCase()} | ${row.completed}/${runCount} | ${row.minimumMinutes} / ${row.medianMinutes} / ${row.maximumMinutes} | ${row.medianDamage} | ${row.totalContinues} (${Math.round(row.continueRate * 100)}%) | ${row.maximumHazards} | ${row.warningTicks} | ${row.echoForecasts} | ${row.mechanicSuccesses} |`).join('\n');
    writeFileSync(resolve(evidenceDir, 'm4-05-campaign-balance.md'), `# M4-05 Campaign Balance\n\n- Runs: ${runCount} seeds per difficulty\n- Controller: current-screen campaign pilot; health zero, one continue per stage, midpoint/result MARGINALIA, and AppState transitions enforced\n- Duration gate: 15:00–25:00; formal 30-seed median target: 21:00–24:00\n\n| Difficulty | Complete | Minutes min / median / max | Median damage | Continues (rate) | Max hazards | Bailiff warning ticks | ECHO forecasts | Mechanic successes |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n${rows}\n\n## Marginalia selections\n\n${Object.entries(selectionCounts).sort().map(([id, count]) => `- ${id}: ${count}`).join('\n')}\n`);

    expect(runs.every((run) => run.complete)).toBe(true);
    expect(runs.every((run) => run.minutes >= 15 && run.minutes <= maximumCampaignMinutes)).toBe(true);
    if (runs.length >= 12) expect(Object.keys(selectionCounts)).toHaveLength(12);
    if (runCount >= 30 && summary.length === 3) {
      const [echo, normal, proof] = summary;
      expect(echo.medianDamage).toBeLessThan(normal.medianDamage);
      expect(normal.medianDamage).toBeLessThan(proof.medianDamage);
      expect(proof.medianDamage - echo.medianDamage).toBeGreaterThanOrEqual(1);
      expect(echo.continueRate).toBeLessThanOrEqual(0.1);
      expect(normal.continueRate).toBeLessThanOrEqual(0.25);
      expect(proof.continueRate).toBeLessThanOrEqual(0.5);
      expect(summary.every((row) => row.medianMinutes >= 15 && row.medianMinutes <= 25)).toBe(true);
      expect(summary.every((row) => row.mechanicSuccesses > 0)).toBe(true);
      expect(summary.every((row) => row.medianMinutes >= 21 && row.medianMinutes <= 24)).toBe(true);
      for (const difficulty of difficulties) {
        const stageSixMinutes = runs.filter((run) => run.difficulty === difficulty)
          .map((run) => run.stages.find((stage) => stage.stage === 'stage-06')!.playedTicks / TICK_RATE / 60)
          .sort((a, b) => a - b);
        expect(stageSixMinutes[Math.floor(stageSixMinutes.length / 2)]).toBeLessThanOrEqual(5.5);
      }
    }
  }, 1_800_000);
});
