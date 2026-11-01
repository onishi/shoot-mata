import type { EnemyKind } from '../core/types';

export interface EnemyVisualContract {
  width: number;
  height: number;
  collisionRadius: number;
}

// Rendering and simulation share this table so the visible body can never
// drift away from the circle used for hits. Width/height include the solid
// silhouette, while atlas glow may extend beyond them.
export const ENEMY_VISUAL_CONTRACT: Record<EnemyKind, EnemyVisualContract> = {
  'eraser-mite': { width: 58, height: 48, collisionRadius: 17 },
  'bracket-gull': { width: 82, height: 62, collisionRadius: 25 },
  'margin-skiff': { width: 94, height: 60, collisionRadius: 30 },
  'folio-hauler': { width: 150, height: 116, collisionRadius: 58 },
  'index-kite': { width: 82, height: 52, collisionRadius: 21 },
  'vane-scribe': { width: 76, height: 70, collisionRadius: 31 },
  'cross-reference-pair': { width: 94, height: 62, collisionRadius: 27 },
  'tab-binder': { width: 160, height: 112, collisionRadius: 56 },
  'drip-scribe': { width: 62, height: 76, collisionRadius: 24 },
  'gutter-frog': { width: 96, height: 66, collisionRadius: 30 },
  'basin-bell': { width: 156, height: 116, collisionRadius: 58 },
  'reed-needle': { width: 126, height: 58, collisionRadius: 25 },
  'ash-comma': { width: 62, height: 70, collisionRadius: 22 },
  'kiln-censor': { width: 92, height: 82, collisionRadius: 34 },
  'ember-courier': { width: 104, height: 72, collisionRadius: 29 },
  'char-press': { width: 170, height: 120, collisionRadius: 60 },
  'mirror-mote': { width: 68, height: 62, collisionRadius: 23 },
  'quotation-ram': { width: 118, height: 76, collisionRadius: 38 },
  'false-witness': { width: 96, height: 88, collisionRadius: 33 },
  'silver-obelisk': { width: 128, height: 142, collisionRadius: 62 },
  'binding-wasp': { width: 78, height: 68, collisionRadius: 25 },
  'revision-hound': { width: 112, height: 80, collisionRadius: 40 },
  'null-choir': { width: 100, height: 94, collisionRadius: 34 },
  'archive-palanquin': { width: 188, height: 132, collisionRadius: 66 }
};
