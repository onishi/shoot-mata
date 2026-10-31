import { distanceSq, pointInPolygon, px } from '../core/math';
import { type GameState, type InputFrame, type Point } from '../core/types';
import { eelSegmentPoint } from './game';
import { stageFourCoolingCenter } from '../content/stage-04';

export type PilotName = 'baseline' | 'safe' | 'stitch' | 'sweep';

const moveToward = (from: Point, to: Point): InputFrame => ({
  left: from.x > to.x + px(5),
  right: from.x < to.x - px(5),
  up: from.y > to.y + px(5),
  down: from.y < to.y - px(5),
  fire: true
});

const nearestThreatDistanceSq = (state: GameState): number => state.bullets
  .filter((bullet) => bullet.kind === 'enemy')
  .reduce((nearest, bullet) => Math.min(nearest, distanceSq(bullet, state.player)), Number.POSITIVE_INFINITY);

const nearestThreat = (state: GameState) => state.bullets
  .filter((bullet) => bullet.kind === 'enemy')
  .sort((a, b) => distanceSq(a, state.player) - distanceSq(b, state.player) || a.id - b.id)[0];

const visibleTarget = (state: GameState) => state.enemies
  .slice()
  .sort((a, b) => Number(b.kind === 'folio-hauler' || b.kind === 'tab-binder')
    - Number(a.kind === 'folio-hauler' || a.kind === 'tab-binder') || a.id - b.id)[0] ?? state.boss;

const compilerPoint = (state: GameState, side: 'vane' | 'seam'): Point | null => {
  const boss = state.boss;
  if (boss?.kind !== 'crosswind-compiler') return null;
  const direction = side === 'vane' ? boss.vaneSide : -boss.vaneSide;
  return { x: boss.x - px(100), y: boss.y + direction * px(108) };
};

export const countCandidateTargets = (state: GameState): number => {
  if (!state.candidate) return 0;
  return state.bullets.filter((bullet) => bullet.kind === 'enemy' && pointInPolygon(bullet, state.candidate!.polygon)).length
    + state.enemies.filter((enemy) => pointInPolygon(enemy, state.candidate!.polygon)).length;
};

/**
 * A deliberately limited controller: it sees only current on-screen state,
 * updates its intention at a human-scale reaction interval, and has no access
 * to encounter timing or future trajectories.
 */
export const createPilot = (name: PilotName): ((state: GameState) => InputFrame) => {
  let held: InputFrame = { fire: true };
  let nextDecision = 0;
  let waypointIndex = 0;
  let waypoints: Point[] = [];
  let candidateSeenAt = 0;
  let retraceCooldownUntil = 0;
  let attackUntil = 0;
  let loopSequence = 0;
  let compilerPhase = 0;
  let eelPhase = 0;
  let advocatePhase = 0;
  const reactionTicks = name === 'safe' ? 8 : name === 'stitch' ? 10 : name === 'sweep' ? 14 : 12;

  return (state: GameState): InputFrame => {
    if (name === 'stitch' && state.boss?.kind === 'crosswind-compiler' && state.boss.phase !== compilerPhase) {
      compilerPhase = state.boss.phase;
      attackUntil = 0;
      waypoints = [];
      candidateSeenAt = 0;
      nextDecision = state.tick;
    }
    if (name === 'stitch' && state.boss?.kind === 'lacuna-eel' && state.boss.phase !== eelPhase) {
      eelPhase = state.boss.phase;
      attackUntil = 0;
      waypoints = [];
      candidateSeenAt = 0;
      nextDecision = state.tick;
    }
    if (name === 'stitch' && state.boss?.kind === 'cinder-advocate' && state.boss.phase !== advocatePhase) {
      advocatePhase = state.boss.phase;
      attackUntil = 0;
      waypoints = [];
      candidateSeenAt = 0;
      nextDecision = state.tick;
    }
    if (state.tick < nextDecision) return { ...held, collate: false, retrace: false };
    nextDecision = state.tick + reactionTicks;

    const visible = visibleTarget(state);
    const exposedSeam = state.boss?.kind === 'crosswind-compiler' && state.boss.seamExposedUntil >= state.tick
      ? compilerPoint(state, 'seam') : null;
    const eelWeakpoint = state.boss?.kind === 'lacuna-eel'
      ? eelSegmentPoint(state.boss, state.tick, state.boss.activeSegment) : null;
    const advocateEmber = state.boss?.kind === 'cinder-advocate'
      ? state.bullets.filter((bullet) => bullet.sourceAttack === 'advocate-ember')
        .sort((a, b) => b.x - a.x || a.id - b.id)[0] ?? null : null;
    const target = exposedSeam ?? eelWeakpoint ?? advocateEmber ?? visible;
    if (name === 'baseline') {
      const aimY = target?.y ?? px(360);
      held = moveToward(state.player, { x: px(300), y: aimY });
      return held;
    }

    if (state.candidate) {
      if (candidateSeenAt === 0) candidateSeenAt = state.tick;
      const targets = countCandidateTargets(state);
      const shouldCollate = name === 'stitch'
        || (name === 'safe' && targets > 0)
        || (name === 'sweep' && (targets >= 2 || state.tick - candidateSeenAt >= 42));
      if (shouldCollate) {
        const coolsAdvocateEmber = state.boss?.kind === 'cinder-advocate'
          && state.bullets.some((bullet) => bullet.sourceAttack === 'advocate-ember' && pointInPolygon(bullet, state.candidate!.polygon));
        candidateSeenAt = 0;
        waypoints = [];
        loopSequence += 1;
        attackUntil = state.tick + (coolsAdvocateEmber ? 48 : name === 'safe' ? 240 : name === 'stitch' ? 420 : 300);
        held = { fire: true, collate: true };
        return held;
      }
    } else candidateSeenAt = 0;

    if (name === 'safe' && state.tick >= retraceCooldownUntil && state.gauge >= 25
      && state.trail.length >= 4 && nearestThreatDistanceSq(state) < px(130) ** 2) {
      retraceCooldownUntil = state.tick + 240;
      held = { fire: true, retrace: true };
      return held;
    }

    if (name === 'safe') {
      const threat = nearestThreat(state);
      if (waypoints.length === 0 && state.tick % 600 < 300
        && threat && distanceSq(threat, state.player) < px(180) ** 2) {
        held = {
          fire: true,
          left: state.player.x > px(360),
          up: threat.y >= state.player.y && state.player.y > px(100),
          down: threat.y < state.player.y && state.player.y < px(620)
        };
        return held;
      }
    }

    if (state.tick < attackUntil) {
      if (name === 'safe') {
        const threat = nearestThreat(state);
        held = {
          fire: true,
          left: state.player.x > px(260),
          up: threat ? threat.y >= state.player.y : Math.floor(state.tick / 120) % 2 === 0,
          down: threat ? threat.y < state.player.y : Math.floor(state.tick / 120) % 2 !== 0
        };
        return held;
      }
      if (target) {
        held = moveToward(state.player, { x: Math.max(px(560), target.x - px(330)), y: target.y });
        return held;
      }
    }

    if (name === 'stitch' && state.boss?.kind === 'cinder-advocate' && !advocateEmber) {
      held = moveToward(state.player, { x: px(610), y: state.boss.y });
      return held;
    }

    if (waypoints.length === 0) {
      const compilerVane = name === 'stitch' ? compilerPoint(state, 'vane') : null;
      const cooling = state.stageId === 'stage-04' && state.boss?.kind !== 'cinder-advocate' ? stageFourCoolingCenter(state.tick) : null;
      const coolingTarget = cooling ? { x: px(cooling.x), y: px(cooling.y) } : null;
      const courierTarget = state.stageId === 'stage-04' && loopSequence % 4 === 0
        ? state.enemies.find((enemy) => enemy.kind === 'ember-courier') ?? null : null;
      const loopTarget = name === 'stitch' ? (compilerVane ?? eelWeakpoint ?? advocateEmber ?? courierTarget ?? coolingTarget) : null;
      const advocateCenterOffset = advocateEmber ? px(45) : 0;
      const centerX = loopTarget ? loopTarget.x - advocateCenterOffset : (name === 'safe' ? px(300) : Math.min(px(910), Math.max(px(650), target?.x ?? px(900))));
      const rawCenterY = name === 'safe'
        ? Math.min(px(600), Math.max(px(120), state.player.y))
        : Math.min(px(570), Math.max(px(150), loopTarget?.y ?? target?.y ?? px(360)));
      const centerY = Math.min(px(590), Math.max(px(130), rawCenterY + px((loopSequence % 3 - 1) * 14)));
      // Leave headroom inside the 3.2 second trail lifetime for reaction delay
      // and quantized corner arrival.
      const halfWidth = px(advocateEmber ? 95 : loopTarget ? 75 : name === 'safe' ? 75 : name === 'stitch' ? 100 : 115);
      const halfHeight = px(advocateEmber ? 58 : loopTarget ? 55 : name === 'safe' ? 55 : name === 'stitch' ? 75 : 90);
      waypoints = [
        { x: centerX - halfWidth, y: centerY - halfHeight },
        { x: centerX + halfWidth, y: centerY - halfHeight },
        { x: centerX + halfWidth, y: centerY + halfHeight },
        { x: centerX - halfWidth, y: centerY + halfHeight },
        // Deliberately pass through the first segment. Merely stopping near the
        // first corner would look closed to a person but would not be a geometric
        // intersection in the deterministic rules.
        { x: centerX - halfWidth, y: centerY - halfHeight - px(30) }
      ];
      waypointIndex = 0;
    }

    // A delayed controller can cross a corner between decisions; accept a
    // reaction-sized arrival radius instead of oscillating around an exact point.
    if (distanceSq(state.player, waypoints[waypointIndex]) <= px(45) ** 2) {
      waypointIndex += 1;
      if (waypointIndex >= waypoints.length) {
        waypoints = [];
        held = { fire: true };
        return held;
      }
    }
    held = moveToward(state.player, waypoints[waypointIndex]);
    return held;
  };
};

