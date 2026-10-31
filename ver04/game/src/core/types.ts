export const SCALE = 256;
export const WIDTH = 1280;
export const HEIGHT = 720;
export const TICK_RATE = 120;

export interface Point { x: number; y: number }
export interface TrailPoint extends Point { bornTick: number; segmentId: number; wetUntil?: number; cooledUntil?: number }
export interface Bullet extends Point {
  id: number;
  vx: number;
  vy: number;
  radius: number;
  kind: 'player' | 'enemy' | 'return';
  annotated: boolean;
  wetAnnotated?: boolean;
  cooledEmber?: boolean;
  falseAnnotated?: boolean;
  illusory?: boolean;
  capturable: boolean;
  sourceAttack?: 'enemy-volley' | 'boss-fan' | 'boss-sweep' | 'compiler-gust' | 'compiler-lance' | 'compiler-storm'
    | 'eel-drizzle' | 'eel-wake' | 'eel-deluge'
    | 'advocate-ember' | 'advocate-gavel' | 'advocate-verdict'
    | 'twins-testimony' | 'twins-cross-exam' | 'twins-verdict';
}
export type StageId = 'stage-01' | 'stage-02' | 'stage-03' | 'stage-04' | 'stage-05';
export type EnemyKind =
  | 'eraser-mite' | 'bracket-gull' | 'margin-skiff' | 'folio-hauler'
  | 'index-kite' | 'vane-scribe' | 'cross-reference-pair' | 'tab-binder'
  | 'drip-scribe' | 'gutter-frog' | 'basin-bell' | 'reed-needle'
  | 'ash-comma' | 'kiln-censor' | 'ember-courier' | 'char-press'
  | 'mirror-mote' | 'quotation-ram' | 'false-witness' | 'silver-obelisk';
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
  kind: 'blank-bailiff' | 'crosswind-compiler' | 'lacuna-eel' | 'cinder-advocate' | 'apocrypha-twins';
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
  vaneSide: -1 | 1;
  windLockedUntil: number;
  lockedWindDirection: -1 | 1;
  seamExposedUntil: number;
  activeSegment: 0 | 1 | 2;
  segmentMarkedUntil: number;
  syncBrokenUntil: number;
  vulnerableTwin: -1 | 1;
  twinSwap: -1 | 1;
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
  | { type: 'shot-annotated' }
  | { type: 'loop-ready' }
  | { type: 'loop-collated'; captured: number; area: number }
  | { type: 'collate-missed' }
  | { type: 'retrace-started' }
  | { type: 'retrace-ended' }
  | { type: 'retrace-denied' }
  | { type: 'damage' }
  | { type: 'enemy-defeated' }
  | { type: 'boss-spawned' }
  | { type: 'boss-warning' }
  | { type: 'boss-phase'; phase: 1 | 2 | 3 }
  | { type: 'wind-reversed'; direction: -1 | 1 }
  | { type: 'compiler-wind-locked'; direction: -1 | 1 }
  | { type: 'compiler-seam-exposed'; side: -1 | 1 }
  | { type: 'compiler-seam-hit' }
  | { type: 'trail-wetted' }
  | { type: 'basin-surge' }
  | { type: 'wet-annotation' }
  | { type: 'eel-segment-marked'; segment: 0 | 1 | 2 }
  | { type: 'eel-segment-hit'; segment: 0 | 1 | 2 }
  | { type: 'heat-wave' }
  | { type: 'cooling-field-collated' }
  | { type: 'courier-converted' }
  | { type: 'advocate-ember-cooled' }
  | { type: 'advocate-ember-hit' }
  | { type: 'advocate-wall-blocked' }
  | { type: 'false-trail-annotated' }
  | { type: 'false-volley' }
  | { type: 'twins-sync-broken'; vulnerable: -1 | 1 }
  | { type: 'twins-weakpoint-hit'; vulnerable: -1 | 1 }
  | { type: 'twins-swapped' }
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
  wind: {
    reversals: number;
    playerDrift: number;
    trailDrift: number;
    collatesLeft: number;
    collatesRight: number;
    collatesNearReversal: number;
  };
  rain: {
    drops: number;
    trailPointsWetted: number;
    wetTrailPeak: number;
    wetAnnotatedShots: number;
    wetDamage: number;
    basinSurges: number;
    needleDashes: number;
  };
  heat: {
    waves: number;
    trailPointsBurned: number;
    trailPointsCooled: number;
    cooledTrailPeak: number;
    coolingCollates: number;
    ashCoolingBursts: number;
    censorBrands: number;
    courierConversions: number;
    pressClosures: number;
  };
  mirror?: {
    falseTrailPeak: number;
    falseAnnotations: number;
    falseLoopRejections: number;
    illusoryShots: number;
    moteEchoes: number;
    ramCharges: number;
    witnessMixes: number;
    obeliskReflections: number;
  };
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
  compiler: {
    windLocks: number;
    windLockedTicks: number;
    weakpointHits: number;
    ordinaryHits: number;
    phaseReached: [boolean, boolean, boolean];
    attacks: { gust: number; lance: number; storm: number };
    damageByAttack: { gust: number; lance: number; storm: number };
  };
  eel: {
    segmentMarks: number;
    markedTicks: number;
    weakpointHits: number;
    wetWeakpointHits: number;
    ordinaryHits: number;
    phaseReached: [boolean, boolean, boolean];
    attacks: { drizzle: number; wake: number; deluge: number };
    damageByAttack: { drizzle: number; wake: number; deluge: number };
  };
  advocate: {
    embersThrown: number;
    embersCooled: number;
    cooledHits: number;
    wallBlocks: number;
    wallActiveTicks: number;
    phaseReached: [boolean, boolean, boolean];
    attacks: { ember: number; gavel: number; verdict: number };
    damageByAttack: { ember: number; gavel: number; verdict: number };
  };
  apocrypha: {
    syncBreaks: number;
    syncBrokenTicks: number;
    weakpointHits: number;
    ordinaryHits: number;
    swaps: number;
    phaseReached: [boolean, boolean, boolean];
    attacks: { testimony: number; crossExam: number; verdict: number };
    damageByAttack: { testimony: number; crossExam: number; verdict: number };
  };
}
export interface GameState {
  stageId: StageId;
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
