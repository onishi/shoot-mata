import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GameState, InputFrame } from '../src/core/types';
import { STAGE_04_BOSS_START_TICK, STAGE_04_ENTITY_LIMITS, STAGE_04_SPAWNS } from '../src/content/stage-04';
import { createPilot, type PilotName } from '../src/simulation/autopilot';
import { createInitialState, step } from '../src/simulation/game';

const hashState = (state: GameState): string => createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16);

const bossStart = (): GameState => {
  const state = createInitialState(3412, 'stage-04');
  state.tick = STAGE_04_BOSS_START_TICK - 1; state.encounterIndex = STAGE_04_SPAWNS.length;
  state.enemies = []; state.bullets = []; state.trail = []; state.player.x = 620 * 256;
  return step(state, {}).state;
};

const simulate = (pilotName: PilotName, replay?: InputFrame[]) => {
  let state = bossStart(); const pilot = createPilot(pilotName); const frames: InputFrame[] = [];
  let maxEnemyBullets = 0; const phaseTicks: Array<number | null> = [0, null, null];
  const limit = 180 * 120;
  for (let tick = 0; tick < limit && !state.metrics.boss.defeated; tick += 1) {
    const input = replay?.[tick] ?? pilot(state); frames.push(input); state = step(state, input).state;
    maxEnemyBullets = Math.max(maxEnemyBullets, state.bullets.filter((bullet) => bullet.kind === 'enemy').length);
    if (phaseTicks[1] === null && state.metrics.advocate.phaseReached[1]) phaseTicks[1] = state.tick - STAGE_04_BOSS_START_TICK;
    if (phaseTicks[2] === null && state.metrics.advocate.phaseReached[2]) phaseTicks[2] = state.tick - STAGE_04_BOSS_START_TICK;
  }
  return { state, frames, maxEnemyBullets, phaseTicks,
    duration: state.metrics.boss.defeatTick === null ? null : state.metrics.boss.defeatTick - STAGE_04_BOSS_START_TICK,
    hash: hashState(state) };
};

describe('M3-12 CINDER ADVOCATE evidence', () => {
  it('proves the permanent wall, cooled-ember route, three attacks and deterministic replay', () => {
    const baseline = simulate('baseline'); const stitch = simulate('stitch'); const replay = simulate('stitch', stitch.frames);
    const metrics = stitch.state.metrics.advocate;
    const gates = {
      ordinaryFallbackDefeatsBoss: baseline.state.metrics.boss.defeated && baseline.state.metrics.advocate.wallBlocks >= 1980,
      stitchDefeatsBoss: stitch.state.metrics.boss.defeated,
      cooledRouteAtLeastSeventyPercentFaster: stitch.duration !== null && baseline.duration !== null && stitch.duration <= baseline.duration * 0.3,
      allPhasesReached: metrics.phaseReached.every(Boolean),
      cooledRouteDominatesDamage: metrics.embersCooled >= 10 && metrics.cooledHits >= 9 && metrics.cooledHits * 180 > metrics.wallBlocks,
      wallNeverDrops: stitch.duration !== null && metrics.wallActiveTicks === stitch.duration + 1,
      allAttacksEmitted: Object.values(metrics.attacks).every((value) => value > 0),
      attackDamageMeasured: Object.values(metrics.damageByAttack).every((value) => value >= 0),
      bulletLimit: stitch.maxEnemyBullets <= STAGE_04_ENTITY_LIMITS.enemyBullets && stitch.state.metrics.rejectedEnemyBullets === 0,
      deterministicReplay: replay.hash === stitch.hash
    };
    const report = { generatedAt: '2026-11-01', seed: 3412,
      baseline: { durationTicks: baseline.duration, maxEnemyBullets: baseline.maxEnemyBullets, advocate: baseline.state.metrics.advocate, hash: baseline.hash },
      stitch: { durationTicks: stitch.duration, phaseTicks: stitch.phaseTicks, maxEnemyBullets: stitch.maxEnemyBullets, advocate: metrics, hash: stitch.hash },
      replayHash: replay.hash, gates };
    const evidenceDir = resolve(import.meta.dirname, '../../docs/evidence'); mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(resolve(evidenceDir, 'm3-12-cinder-advocate.json'), `${JSON.stringify(report, null, 2)}\n`);
    const gateRows = Object.entries(gates).map(([name, passed]) => `| ${name} | ${passed ? 'PASS' : 'FAIL'} |`).join('\n');
    writeFileSync(resolve(evidenceDir, 'm3-12-cinder-advocate.md'), `# M3-12 CINDER ADVOCATE Report\n\n- Baseline defeat: ${baseline.duration ?? 'not defeated'} ticks\n- Stitch defeat: ${stitch.duration ?? 'not defeated'} ticks\n- Phase 2 / 3 arrival: ${stitch.phaseTicks[1]} / ${stitch.phaseTicks[2]} ticks\n- Embers thrown / cooled / hit: ${metrics.embersThrown} / ${metrics.embersCooled} / ${metrics.cooledHits}\n- Wall blocks / active ticks: ${metrics.wallBlocks} / ${metrics.wallActiveTicks}\n- Ember / gavel / verdict attacks: ${metrics.attacks.ember} / ${metrics.attacks.gavel} / ${metrics.attacks.verdict}\n- Max enemy bullets: ${stitch.maxEnemyBullets}\n- Stitch / replay hashes: ${stitch.hash}, ${replay.hash}\n\n| Gate | Result |\n| --- | --- |\n${gateRows}\n`);
    expect(gates).toEqual(Object.fromEntries(Object.keys(gates).map((gate) => [gate, true])));
  }, 120_000);
});
