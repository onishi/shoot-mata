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
}
export interface Enemy extends Point {
  id: number;
  health: number;
  maxHealth: number;
  markedUntil: number;
  fireCooldown: number;
  radius: number;
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
  | { type: 'enemy-defeated' };
export interface Metrics {
  loops: number;
  captured: number;
  annotatedShots: number;
  retraces: number;
  damage: number;
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
  retrace: { points: Point[]; index: number } | null;
  metrics: Metrics;
}
