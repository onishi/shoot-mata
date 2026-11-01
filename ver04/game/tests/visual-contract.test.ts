import { describe, expect, it } from 'vitest';
import { ENEMY_VISUAL_CONTRACT } from '../src/render/visual-contract';
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
});
