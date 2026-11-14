import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import {
  castHammer, createGame, movePlayer, SLOT_COUNT, startGame,
  startGuardian, startNextWave, step
} from '../src/model.js';

const DT = 1 / 120;
const evidenceUrl = new URL('../../docs/m3-campaign-proxy-audit.json', import.meta.url);

function slotDistance(a, b) {
  const raw = Math.abs(a - b);
  return Math.min(raw, SLOT_COUNT - raw);
}

function directionTo(from, to) {
  const clockwise = (to - from + SLOT_COUNT) % SLOT_COUNT;
  return clockwise === 0 ? 0 : clockwise <= SLOT_COUNT / 2 ? 1 : -1;
}

function projectedSlot(enemy) {
  if (enemy.guardian && enemy.orbitWarning) return (enemy.slot + enemy.orbitDirection + SLOT_COUNT) % SLOT_COUNT;
  if (enemy.kind === 'chorister') return (enemy.slot + enemy.castDirection + SLOT_COUNT) % SLOT_COUNT;
  if (enemy.kind === 'refractor') return (enemy.slot + enemy.turnDirection + SLOT_COUNT) % SLOT_COUNT;
  if (enemy.kind === 'ringMatriarch' && enemy.phase === 3) return (enemy.slot + enemy.castDirection + SLOT_COUNT) % SLOT_COUNT;
  return enemy.slot;
}

function chooseTarget(game) {
  const priority = enemy => {
    const danger = (1.6 - enemy.distance) * 100;
    const role = enemy.kind === 'rusher' ? 32 : enemy.guardian ? 24 : enemy.kind === 'bulwark' ? 10 : 0;
    return danger + role - slotDistance(game.playerSlot, projectedSlot(enemy)) * 2;
  };
  return game.enemies.filter(enemy => enemy.alive).sort((a, b) => priority(b) - priority(a))[0] ?? null;
}

function mirrorDirection(game, mirror) {
  const nextStep = ((mirror.mirrorStep ?? 0) + 1) % 3;
  const distanceAfter = direction => {
    const playerSlot = (game.playerSlot + direction + SLOT_COUNT) % SLOT_COUNT;
    const mirrorSlot = nextStep === 0 ? mirror.slot : (mirror.slot - direction + SLOT_COUNT) % SLOT_COUNT;
    return slotDistance(playerSlot, mirrorSlot);
  };
  return distanceAfter(1) <= distanceAfter(-1) ? 1 : -1;
}

function runPolicy(policy) {
  const game = startGame(createGame(), 0);
  let elapsed = 0;
  let nextAction = 0;
  let modeSince = 0;
  let lastMode = game.mode;
  let actions = 0;
  let casts = 0;
  const transitions = [];

  while (elapsed < 2400 && !['waveClear', 'gameOver'].includes(game.mode)) {
    if (game.mode !== lastMode) {
      transitions.push({ seconds: Number(elapsed.toFixed(3)), mode: game.mode, wave: game.wave + 1, bell: game.bell });
      lastMode = game.mode;
      modeSince = elapsed;
    }
    if (game.mode === 'waveBrief' && elapsed - modeSince >= policy.briefSeconds) startNextWave(game);
    else if (game.mode === 'guardianBrief' && elapsed - modeSince >= policy.briefSeconds) startGuardian(game);
    else if (game.mode === 'playing' && elapsed >= nextAction) {
      actions += 1;
      const guardianAction = game.guardianAct !== null;
      nextAction = elapsed + (guardianAction ? Math.min(policy.actionEvery, 0.12) : policy.actionEvery);
      if (policy.hesitationEvery && !guardianAction && actions % policy.hesitationEvery === 0) {
        // First-sight proxy spends one decision beat reading a changed order.
      } else if (game.hammer) {
        const direction = directionTo(game.playerSlot, game.hammer.slot);
        if (direction) movePlayer(game, direction);
      } else {
        const target = chooseTarget(game);
        if (target) {
          const targetSlot = projectedSlot(target);
          let direction = directionTo(game.playerSlot, targetSlot);
          if ((target.kind === 'mirror' || (target.kind === 'ringMatriarch' && target.phase === 2)) && direction) direction = mirrorDirection(game, target);
          if (direction) movePlayer(game, direction);
          else if (!(target.guardian && target.orbitWarning) && castHammer(game)) casts += 1;
        }
      }
    }
    step(game, DT);
    elapsed += DT;
  }

  return {
    policy: policy.name,
    modeledSeconds: Number(elapsed.toFixed(3)),
    modeledMinutes: Number((elapsed / 60).toFixed(2)),
    result: game.mode,
    finalWave: game.wave + 1,
    bell: game.bell,
    score: game.score,
    actions,
    casts,
    transitions
  };
}

const policies = [
  {
    name: 'practiced', actionEvery: 0.12, briefSeconds: 1.2,
    contractMinutes: [14, 20], description: 'Known-rule priority targeting and immediate brief advance.'
  },
  {
    name: 'first-sight-proxy', actionEvery: 0.2, briefSeconds: 6, hesitationEvery: 17,
    contractMinutes: [18, 28], description: 'Slower decisions, six-second instruction reads, and periodic formation-reading pauses.'
  }
];

const runs = policies.map(runPolicy);
for (const [index, run] of runs.entries()) {
  const [minimum, maximum] = policies[index].contractMinutes;
  assert.equal(run.result, 'waveClear', `${run.policy} must crown all six watches`);
  assert.equal(run.finalWave, 18, `${run.policy} must finish wave 18`);
  assert.ok(run.modeledMinutes >= minimum && run.modeledMinutes <= maximum,
    `${run.policy} ${run.modeledMinutes}m must be within ${minimum}-${maximum}m`);
}

const report = {
  schema: 1,
  auditedAt: new Date().toISOString(),
  scope: 'Deterministic model-time proxy using only the production move, cast, wave-start, and guardian-start actions.',
  limitation: 'This is not the required real-browser full campaign audit; browser timing, rendering, audio, and physical key delivery remain to be measured.',
  policies: policies.map(({ name, actionEvery, briefSeconds, hesitationEvery = 0, contractMinutes, description }) => ({
    name, actionEvery, briefSeconds, hesitationEvery, contractMinutes, description
  })),
  runs
};

if (process.argv.includes('--write')) await writeFile(evidenceUrl, `${JSON.stringify(report, null, 2)}\n`);
console.log(runs.map(run => `${run.policy}: ${run.modeledMinutes}m, ${run.result}, BELL ${run.bell}, ${run.score} points`).join('\n'));

export { runPolicy };
