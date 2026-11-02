import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { advance, createAppState, FIRST_WAKE_LIMIT_TICKS, transition } from '../src/app/app';
import { STAGE_01_DURATION_TICKS, STAGE_01_SPAWNS } from '../src/content/stage-01';
import { createPilot } from '../src/simulation/autopilot';

describe('v4.2-03 first wake evidence', () => {
  it('teaches movement, fire, COLLATE and returned fire in the opening 30 seconds', () => {
    let app = transition(transition(createAppState(4203), 'start'), 'confirm');
    const pilot = createPilot('stitch');
    let maxCombatGap = 0;
    let combatGap = 0;
    while (app.game.tick < FIRST_WAKE_LIMIT_TICKS && app.tutorial.completedAt === null) {
      app = advance(app, pilot(app.game)).state;
      const hazards = app.game.bullets.filter((bullet) => bullet.kind === 'enemy').length;
      combatGap = app.game.enemies.length === 0 && hazards === 0 ? combatGap + 1 : 0;
      maxCombatGap = Math.max(maxCombatGap, combatGap);
    }

    const timestamps = {
      moved: app.tutorial.movedAt,
      fired: app.tutorial.firedAt,
      collated: app.tutorial.collatedAt,
      reflected: app.tutorial.reflectedAt
    };
    const ordered = Object.values(timestamps).every((tick) => tick !== null)
      && timestamps.moved! < timestamps.fired!
      && timestamps.fired! < timestamps.collated!
      && timestamps.collated! < timestamps.reflected!;
    const gates = {
      completedWithinThirtySeconds: app.tutorial.completedAt !== null && app.tutorial.completedAt <= FIRST_WAKE_LIMIT_TICKS,
      orderedSuccesses: ordered,
      returnedCapturedFire: app.game.metrics.captured > 0,
      tutorialDismissed: !app.tutorial.active && !app.tutorial.eligible,
      stageDurationUnchanged: STAGE_01_DURATION_TICKS === 180 * 120,
      fourEnemyKindsMaintained: new Set(STAGE_01_SPAWNS.map((spawn) => spawn.kind)).size === 4,
      noFourSecondOpeningGap: maxCombatGap < 4 * 120
    };
    const report = {
      generatedAt: '2026-11-02', seed: 4203,
      limitTicks: FIRST_WAKE_LIMIT_TICKS, completedAt: app.tutorial.completedAt,
      timestamps, capturedAtCompletion: app.game.metrics.captured,
      maxOpeningCombatGapTicks: maxCombatGap, gates
    };
    const evidenceDir = resolve(import.meta.dirname, '../../docs/evidence');
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(resolve(evidenceDir, 'v4.2-03-first-wake.json'), `${JSON.stringify(report, null, 2)}\n`);

    expect(gates).toEqual(Object.fromEntries(Object.keys(gates).map((gate) => [gate, true])));
  }, 30_000);
});
