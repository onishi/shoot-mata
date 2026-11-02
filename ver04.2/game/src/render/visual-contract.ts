import type { AttackSource, EnemyKind } from '../core/types';

export interface EnemyVisualContract {
  width: number;
  height: number;
  collisionRadius: number;
}

// Readability cues live outside the art silhouette without changing the
// simulation radius. Keeping these limits explicit prevents a visual fix from
// implying a much larger hit box.
export const COMBAT_VISUAL_CONTRACT = {
  enemyClearance: 5,
  playerClearance: 6,
  hazardClearance: 7,
  outlineWidth: 2.5
} as const;

export const combatCueAlpha = (tick: number, reducedFlash: boolean): number =>
  reducedFlash ? 0.88 : 0.76 + Math.sin(tick / 9) * 0.12;

export type HazardSilhouette = 'aimed' | 'spread' | 'control' | 'sniper';

// Every authored enemy is assigned to the same four-word visual language used
// by boss attacks. The assignment describes what the player must do next, not
// merely which stage emitted the shot.
export const ENEMY_ATTACK_SOURCE: Record<EnemyKind, AttackSource> = {
  'eraser-mite': 'enemy-control',
  'bracket-gull': 'enemy-control',
  'margin-skiff': 'enemy-spread',
  'folio-hauler': 'enemy-spread',
  'index-kite': 'enemy-aimed',
  'vane-scribe': 'enemy-spread',
  'cross-reference-pair': 'enemy-aimed',
  'tab-binder': 'enemy-control',
  'drip-scribe': 'enemy-aimed',
  'gutter-frog': 'enemy-spread',
  'basin-bell': 'enemy-control',
  'reed-needle': 'enemy-sniper',
  'ash-comma': 'enemy-aimed',
  'kiln-censor': 'enemy-control',
  'ember-courier': 'enemy-sniper',
  'char-press': 'enemy-control',
  'mirror-mote': 'enemy-aimed',
  'quotation-ram': 'enemy-sniper',
  'false-witness': 'enemy-spread',
  'silver-obelisk': 'enemy-control',
  'binding-wasp': 'enemy-control',
  'revision-hound': 'enemy-sniper',
  'null-choir': 'enemy-spread',
  'archive-palanquin': 'enemy-control'
};

const HAZARD_SILHOUETTES: Record<AttackSource, HazardSilhouette> = {
  'enemy-aimed': 'aimed', 'enemy-spread': 'spread', 'enemy-control': 'control', 'enemy-sniper': 'sniper',
  'enemy-decoy': 'spread', 'enemy-volley': 'aimed', 'boss-fan': 'spread', 'boss-sweep': 'control',
  'compiler-gust': 'control', 'compiler-lance': 'sniper', 'compiler-storm': 'spread',
  'eel-drizzle': 'aimed', 'eel-wake': 'control', 'eel-deluge': 'spread',
  'advocate-ember': 'control', 'advocate-gavel': 'aimed', 'advocate-verdict': 'spread',
  'twins-testimony': 'aimed', 'twins-cross-exam': 'sniper', 'twins-verdict': 'spread',
  'editor-erasure': 'spread', 'editor-wind': 'sniper', 'editor-rain': 'aimed',
  'editor-heat': 'control', 'editor-mirror': 'sniper', 'editor-signature': 'control'
};

export const hazardSilhouette = (source: AttackSource | undefined): HazardSilhouette =>
  source ? HAZARD_SILHOUETTES[source] : 'aimed';

export const isRegularEnemyAttack = (source: AttackSource | undefined): boolean =>
  source === undefined || source === 'enemy-volley' || source.startsWith('enemy-');

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
