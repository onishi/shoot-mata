import { distanceSq, polygonArea, px, segmentIntersection } from '../core/math';
import { HEIGHT, SCALE, WIDTH, type LoopCandidate, type Point, type TrailPoint } from '../core/types';

export const findLoopCandidate = (trail: TrailPoint[]): LoopCandidate | null => {
  if (trail.length < 6) return null;
  const a = trail[trail.length - 2];
  const b = trail[trail.length - 1];
  for (let i = trail.length - 5; i >= 0; i -= 1) {
    const intersection = segmentIntersection(a, b, trail[i], trail[i + 1]);
    if (!intersection) continue;
    const polygon: Point[] = [intersection, ...trail.slice(i + 1)];
    if (polygon.some((point) => point.x < 0 || point.x > WIDTH * SCALE || point.y < 0 || point.y > HEIGHT * SCALE)) continue;
    const area = polygonArea(polygon);
    if (area >= 8000) return { polygon, intersection, startIndex: i + 1, area };
  }
  return null;
};

export const shouldAddTrailPoint = (trail: TrailPoint[], point: Point, tick: number): boolean => {
  const last = trail.at(-1);
  if (!last) return true;
  return distanceSq(last, point) >= px(6) ** 2 || tick - last.bornTick >= 6;
};

export const shotCrossedTrail = (from: Point, to: Point, trail: TrailPoint[]): boolean => {
  for (let i = 0; i < trail.length - 1; i += 1) {
    if (segmentIntersection(from, to, trail[i], trail[i + 1])) return true;
  }
  return false;
};

export const shotCrossedWetTrail = (from: Point, to: Point, trail: TrailPoint[], tick: number): boolean => {
  for (let i = 0; i < trail.length - 1; i += 1) {
    if ((trail[i].wetUntil ?? 0) < tick && (trail[i + 1].wetUntil ?? 0) < tick) continue;
    if (segmentIntersection(from, to, trail[i], trail[i + 1])) return true;
  }
  return false;
};
