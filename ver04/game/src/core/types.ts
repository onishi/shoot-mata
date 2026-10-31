export const SCALE = 256;
export const WIDTH = 1280;
export const HEIGHT = 720;
export const TICK_RATE = 120;

export interface Point { x: number; y: number }
export interface TrailPoint extends Point { bornTick: number; segmentId: number }
export interface Bullet extends Point {
  id: number;
  vx: number;
  vy: number;
  radius: number;
  kind: 'player' | 'enemy' | 'return';
  annotated: boolean;
  capturable: boolean;
  sourceAttack?: 'enemy-volley' | 'boss-fan' | 'boss-sweep';
}
export type EnemyKind = 'eraser-mite' | 'bracket-gull' | 'margin-skiff' | 'folio-hauler';
export interface Enemy extends Point {
  id: number;
  kind: EnemyKind;
  health: number;
  maxHealth: number;
  markedUntil: number;
  fireCooldown: number;
  radius: number;
  baseY: number;
  amplitude: number;
  phase: number;
  spawnedAt: number;
  expiresAt: number;
  spawnX: number;
  lane: number;
  groupId: number;
  state: 'entering' | 'active' | 'exiting';
  stateTick: number;
}
export interface BossState extends Point {
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  armorLayers: number;
  phase: 1 | 2 | 3;
  phaseStartedAt: number;
  cycleStartedAt: number;
  fanAngle: number;
  fanWarningUntil: number;
  fanFiresAt: number;
  defeatedAt: number | null;
}
export interface LoopCandidate {
  polygon: Point[];
  intersection: Point;
  startIndex: number;
  area: number;
  expiresTick?: number;
}
export interface InputFrame {
  up?: boolean;
  down?: boolean;
  left?: boolean;
  right?: boolean;
  fire?: boolean;
  collate?: boolean;
  retrace?: boolean;
}
export type GameEvent =
  | { type: 'shot-fired' }
  | { type: 'loop-ready' }
  | { type: 'loop-collated'; captured: number; area: number }
  | { type: 'collate-missed' }
  | { type: 'retrace-started' }
  | { type: 'retrace-denied' }
  | { type: 'damage' }
  | { type: 'enemy-defeated' }
  | { type: 'boss-spawned' }
  | { type: 'boss-phase'; phase: 1 | 2 | 3 }
  | { type: 'boss-defeated' };
export interface Metrics {
  candidates: number;
  loops: number;
  emptyLoops: number;
  missedCollates: number;
  captured: number;
  annotatedShots: number;
  retraces: number;
  damage: number;
  enemiesDefeated: number;
  haulersDefeated: number;
  firstHaulerDefeatTick: number | null;
  enemyShots: number;
  enemyStats: Record<EnemyKind, { spawned: number; attacks: number; defeated: number; exited: number }>;
  rejectedEnemies: number;
  rejectedEnemyBullets: number;
  boss: {
    spawned: boolean;
    defeated: boolean;
    defeatTick: number | null;
    phaseReached: [boolean, boolean, boolean];
    fanWarnings: number;
    fanErases: number;
    trailPointsErased: number;
    returnedHits: number;
    ordinaryHits: number;
    armorLayersStripped: number;
    damageByAttack: { fan: number; sweep: number; volley: number };
  };
}
export interface GameState {
  tick: number;
  nextId: number;
  seed: number;
  player: Point & { health: number; invulnerableUntil: number; fireCooldown: number };
  gauge: number;
  score: number;
  trail: TrailPoint[];
  candidate: LoopCandidate | null;
  bullets: Bullet[];
  enemies: Enemy[];
  boss: BossState | null;
  encounterIndex: number;
  retrace: { points: Point[]; index: number } | null;
  metrics: Metrics;
}
