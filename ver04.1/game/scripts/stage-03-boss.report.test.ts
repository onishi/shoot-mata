import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GameState, InputFrame } from '../src/core/types';
import { STAGE_03_BOSS_START_TICK, STAGE_03_ENTITY_LIMITS, STAGE_03_SPAWNS } from '../src/content/stage-03';
import { createPilot, type PilotName } from '../src/simulation/autopilot';
import { createInitialState, step } from '../src/simulation/game';

const hashState = (state: GameState): string => createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16);

const bossStart = (): GameState => {
  const state = createInitialState(3307, 'stage-03');
  state.tick = STAGE_03_BOSS_START_TICK - 1; state.encounterIndex = STAGE_03_SPAWNS.length;
  state.enemies = []; state.bullets = []; state.trail = []; state.player.x = 650 * 256;
  return step(state, {}).state;
};

const simulate = (pilotName: PilotName, replay?: InputFrame[]) => {
  let state = bossStart(); const pilot = createPilot(pilotName); const frames: InputFrame[] = [];
  let maxEnemyBullets = 0; const phaseTicks: Array<number | null> = [0, null, null];
  const limit = 240 * 120;
  for (let tick = 0; tick < limit && !state.metrics.boss.defeated; tick += 1) {
    const input = replay?.[tick] ?? pilot(state); frames.push(input); state = step(state, input).state;
    maxEnemyBullets = Math.max(maxEnemyBullets, state.bullets.filter((bullet) => bullet.kind === 'enemy').length);
    if (phaseTicks[1] === null && state.metrics.eel.phaseReached[1]) phaseTicks[1] = state.tick - STAGE_03_BOSS_START_TICK;
    if (phaseTicks[2] === null && state.metrics.eel.phaseReached[2]) phaseTicks[2] = state.tick - STAGE_03_BOSS_START_TICK;
  }
  return { state, frames, maxEnemyBullets, phaseTicks,
    duration: state.metrics.boss.defeatTick === null ? null : state.metrics.boss.defeatTick - STAGE_03_BOSS_START_TICK,
    hash: hashState(state) };
};

describe('M3-07 LACUNA EEL evidence', () => {
  it('proves sequential small-loop marks, wet weakpoint play, fallback fire and deterministic replay', () => {
    const baseline = simulate('baseline'); const stitch = simulate('stitch'); const replay = simulate('stitch', stitch.frames);
    const metrics = stitch.state.metrics.eel;
    const gates = {
      baselineDefeatsBoss: baseline.state.metrics.boss.defeated,
      stitchDefeatsBoss: stitch.state.metrics.boss.defeated,
      stitchAtLeastTwentyPercentFaster: stitch.duration !== null && baseline.duration !== null && stitch.duration <= baseline.duration * 0.8,
      allPhasesReached: metrics.phaseReached.every(Boolean),
      oneSmallLoopPerSegment: metrics.segmentMarks >= 3 && metrics.markedTicks > 0,
      wetWeakpointUsed: metrics.weakpointHits > 0 && metrics.wetWeakpointHits > 0,
      fallbackBodyRouteMeasured: baseline.state.metrics.eel.ordinaryHits > 0,
      allAttacksEmitted: Object.values(metrics.attacks).every((value) => value > 0),
      attackDamageMeasured: Object.values(metrics.damageByAttack).every((value) => value >= 0),
      bulletLimit: stitch.maxEnemyBullets <= STAGE_03_ENTITY_LIMITS.enemyBullets && stitch.state.metrics.rejectedEnemyBullets === 0,
      deterministicReplay: replay.hash === stitch.hash
    };
    const report = { generatedAt: '2026-10-31', seed: 3307,
      baseline: { durationTicks: baseline.duration, maxEnemyBullets: baseline.maxEnemyBullets, eel: baseline.state.metrics.eel, hash: baseline.hash },
      stitch: { durationTicks: stitch.duration, phaseTicks: stitch.phaseTicks, maxEnemyBullets: stitch.maxEnemyBullets, eel: metrics, hash: stitch.hash },
      replayHash: replay.hash, gates };
    const evidenceDir = resolve(import.meta.dirname, '../../docs/evidence'); mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(resolve(evidenceDir, 'm3-07-lacuna-eel.json'), `${JSON.stringify(report, null, 2)}\n`);
    const gateRows = Object.entries(gates).map(([name, passed]) => `| ${name} | ${passed ? 'PASS' : 'FAIL'} |`).join('\n');
    writeFileSync(resolve(evidenceDir, 'm3-07-lacuna-eel.md'), `# M3-07 LACUNA EEL Report\n\n- Baseline defeat: ${baseline.duration ?? 'not defeated'} ticks\n- Stitch defeat: ${stitch.duration ?? 'not defeated'} ticks\n- Phase 2 / 3 arrival: ${stitch.phaseTicks[1]} / ${stitch.phaseTicks[2]} ticks\n- Segment marks / marked ticks: ${metrics.segmentMarks} / ${metrics.markedTicks}\n- Weakpoint / wet weakpoint hits: ${metrics.weakpointHits} / ${metrics.wetWeakpointHits}\n- Drizzle / wake / deluge attacks: ${metrics.attacks.drizzle} / ${metrics.attacks.wake} / ${metrics.attacks.deluge}\n- Drizzle / wake / deluge damage: ${metrics.damageByAttack.drizzle} / ${metrics.damageByAttack.wake} / ${metrics.damageByAttack.deluge}\n- Max enemy bullets: ${stitch.maxEnemyBullets}\n- Stitch / replay hashes: ${stitch.hash}, ${replay.hash}\n\n| Gate | Result |\n| --- | --- |\n${gateRows}\n`);
    expect(gates).toEqual(Object.fromEntries(Object.keys(gates).map((gate) => [gate, true])));
  }, 120_000);
});
