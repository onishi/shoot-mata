import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GameState, InputFrame } from '../src/core/types';
import { STAGE_06_BOSS_START_TICK, STAGE_06_ENTITY_LIMITS, STAGE_06_SPAWNS } from '../src/content/stage-06';
import { createPilot, type PilotName } from '../src/simulation/autopilot';
import { createInitialState, step } from '../src/simulation/game';

const hashState = (state: GameState): string => createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16);

const bossStart = (): GameState => {
  const state = createInitialState(3622, 'stage-06');
  state.tick = STAGE_06_BOSS_START_TICK - 1; state.encounterIndex = STAGE_06_SPAWNS.length;
  state.enemies = []; state.bullets = []; state.trail = []; state.player.x = 560 * 256;
  return step(state, {}).state;
};

const simulate = (pilotName: PilotName, replay?: InputFrame[]) => {
  let state = bossStart(); const pilot = createPilot(pilotName); const frames: InputFrame[] = [];
  let maxEnemyBullets = 0; const phaseTicks: Array<number | null> = [0, null, null];
  const limit = 240 * 120;
  for (let tick = 0; tick < limit && !state.metrics.boss.defeated; tick += 1) {
    const input = replay?.[tick] ?? pilot(state); frames.push(input); state = step(state, input).state;
    maxEnemyBullets = Math.max(maxEnemyBullets, state.bullets.filter((bullet) => bullet.kind === 'enemy').length);
    if (phaseTicks[1] === null && state.metrics.editor.phaseReached[1]) phaseTicks[1] = state.tick - STAGE_06_BOSS_START_TICK;
    if (phaseTicks[2] === null && state.metrics.editor.phaseReached[2]) phaseTicks[2] = state.tick - STAGE_06_BOSS_START_TICK;
  }
  return { state, frames, maxEnemyBullets, phaseTicks,
    duration: state.metrics.boss.defeatTick === null ? null : state.metrics.boss.defeatTick - STAGE_06_BOSS_START_TICK,
    hash: hashState(state) };
};

describe('M3-22 THE LAST EDITOR evidence', () => {
  it('rewrites inherited attacks and closes the enemy-ink signature deterministically', () => {
    const baseline = simulate('baseline'); const stitch = simulate('stitch'); const replay = simulate('stitch', stitch.frames);
    const metrics = stitch.state.metrics.editor;
    const gates = {
      ordinaryFallbackDefeatsBoss: baseline.state.metrics.boss.defeated && baseline.state.metrics.editor.ordinaryHits >= 1000,
      stitchDefeatsBoss: stitch.state.metrics.boss.defeated,
      authoredRouteAtLeastFortyPercentFaster: stitch.duration !== null && baseline.duration !== null && stitch.duration <= baseline.duration * 0.6,
      allPhasesReached: metrics.phaseReached.every(Boolean),
      inheritedRulesRewritten: metrics.rulesRewritten >= 3,
      exposedRouteUsed: metrics.revisionHits >= 16 && metrics.revisionExposedTicks > 0,
      allFiveRulesAttack: Object.entries(metrics.attacks).filter(([name]) => name !== 'signature').every(([, value]) => value > 0),
      signatureInkEmitted: metrics.signatureInkSpawned >= 8 && metrics.attacks.signature > 0,
      signatureClosed: metrics.signatureClosures > 0 && metrics.signatureExposedTicks > 0,
      bulletLimit: stitch.maxEnemyBullets <= STAGE_06_ENTITY_LIMITS.enemyBullets && stitch.state.metrics.rejectedEnemyBullets === 0,
      deterministicReplay: replay.hash === stitch.hash
    };
    const report = { generatedAt: '2026-11-01', seed: 3622,
      baseline: { durationTicks: baseline.duration, maxEnemyBullets: baseline.maxEnemyBullets, editor: baseline.state.metrics.editor, hash: baseline.hash },
      stitch: { durationTicks: stitch.duration, phaseTicks: stitch.phaseTicks, maxEnemyBullets: stitch.maxEnemyBullets, editor: metrics, hash: stitch.hash },
      replayHash: replay.hash, gates };
    const evidenceDir = resolve(import.meta.dirname, '../../docs/evidence'); mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(resolve(evidenceDir, 'm3-22-last-editor.json'), `${JSON.stringify(report, null, 2)}\n`);
    const gateRows = Object.entries(gates).map(([name, passed]) => `| ${name} | ${passed ? 'PASS' : 'FAIL'} |`).join('\n');
    writeFileSync(resolve(evidenceDir, 'm3-22-last-editor.md'), `# M3-22 THE LAST EDITOR Report\n\n- Baseline defeat: ${baseline.duration ?? 'not defeated'} ticks\n- Stitch defeat: ${stitch.duration ?? 'not defeated'} ticks\n- Phase 2 / 3 arrival: ${stitch.phaseTicks[1]} / ${stitch.phaseTicks[2]} ticks\n- Rules rewritten / exposed hits: ${metrics.rulesRewritten} / ${metrics.revisionHits}\n- Signature ink / closures: ${metrics.signatureInkSpawned} / ${metrics.signatureClosures}\n- Erasure / wind / rain / heat / mirror / signature attacks: ${Object.values(metrics.attacks).join(' / ')}\n- Max enemy bullets: ${stitch.maxEnemyBullets}\n- Stitch / replay hashes: ${stitch.hash}, ${replay.hash}\n\n| Gate | Result |\n| --- | --- |\n${gateRows}\n`);
    expect(gates).toEqual(Object.fromEntries(Object.keys(gates).map((gate) => [gate, true])));
  }, 180_000);
});
