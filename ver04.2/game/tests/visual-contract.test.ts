import { describe, expect, it } from 'vitest';
import { combatCueAlpha, COMBAT_VISUAL_CONTRACT, ENEMY_ATTACK_SOURCE, ENEMY_VISUAL_CONTRACT, hazardSilhouette, isRegularEnemyAttack } from '../src/render/visual-contract';
import { createInitialState, step } from '../src/simulation/game';

describe('visual and collision contract', () => {
  it('covers all 24 enemy kinds with a visible silhouette at least as large as the hit circle', () => {
    const entries = Object.entries(ENEMY_VISUAL_CONTRACT);
    expect(entries).toHaveLength(24);
    for (const [kind, visual] of entries) {
      expect(visual.width, `${kind} width`).toBeGreaterThanOrEqual(visual.collisionRadius * 2);
      expect(visual.height, `${kind} height`).toBeGreaterThanOrEqual(visual.collisionRadius * 2);
      expect(Math.max(visual.width, visual.height), `${kind} silhouette`).toBeLessThanOrEqual(visual.collisionRadius * 6);
    }
  });

  it('uses the same contract radius when enemies spawn in simulation', () => {
    const state = createInitialState(406, 'stage-06');
    for (let tick = 0; tick < 18_000; tick += 1) step(state, {});
    for (const enemy of state.enemies) {
      expect(enemy.radius, enemy.kind).toBe(ENEMY_VISUAL_CONTRACT[enemy.kind].collisionRadius);
    }
  });

  it('keeps contrast cues local to the true collision silhouette', () => {
    expect(COMBAT_VISUAL_CONTRACT.enemyClearance).toBeLessThanOrEqual(6);
    expect(COMBAT_VISUAL_CONTRACT.playerClearance).toBeLessThanOrEqual(6);
    expect(COMBAT_VISUAL_CONTRACT.hazardClearance).toBeLessThanOrEqual(8);
    expect(COMBAT_VISUAL_CONTRACT.outlineWidth).toBeLessThanOrEqual(3);
  });

  it('keeps every combat cue steady and high-contrast with reduced flash', () => {
    const samples = [0, 9, 90, 900].map((tick) => combatCueAlpha(tick, true));
    expect(new Set(samples).size).toBe(1);
    expect(samples[0]).toBeGreaterThanOrEqual(0.85);
    expect(combatCueAlpha(0, false)).not.toBe(combatCueAlpha(9, false));
  });

  it('assigns all 24 enemies to four predictive silhouettes without changing recovery semantics', () => {
    const sources = Object.values(ENEMY_ATTACK_SOURCE);
    expect(sources).toHaveLength(24);
    expect(new Set(sources.map(hazardSilhouette))).toEqual(new Set(['aimed', 'spread', 'control', 'sniper']));
    for (const source of sources) expect(isRegularEnemyAttack(source), source).toBe(true);
  });

  it('maps every boss attack to the shared predictive vocabulary', () => {
    const bossSources = [
      'boss-fan', 'boss-sweep', 'compiler-gust', 'compiler-lance', 'compiler-storm',
      'eel-drizzle', 'eel-wake', 'eel-deluge', 'advocate-ember', 'advocate-gavel', 'advocate-verdict',
      'twins-testimony', 'twins-cross-exam', 'twins-verdict', 'editor-erasure', 'editor-wind',
      'editor-rain', 'editor-heat', 'editor-mirror', 'editor-signature'
    ] as const;
    expect(new Set(bossSources.map(hazardSilhouette))).toEqual(new Set(['aimed', 'spread', 'control', 'sniper']));
  });
});
