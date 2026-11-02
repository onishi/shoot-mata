import { describe, expect, it } from 'vitest';
import { pointInPolygon, polygonArea, px, segmentIntersection } from '../src/core/math';

const square = [{ x: px(10), y: px(10) }, { x: px(110), y: px(10) }, { x: px(110), y: px(110) }, { x: px(10), y: px(110) }];

describe('deterministic geometry', () => {
  it('measures polygon area in pixels', () => expect(polygonArea(square)).toBe(10000));
  it.each([
    ['inside', { x: px(50), y: px(50) }, true],
    ['outside', { x: px(150), y: px(50) }, false],
    ['edge', { x: px(10), y: px(50) }, true],
    ['vertex', { x: px(10), y: px(10) }, true]
  ])('classifies %s points', (_label, point, expected) => expect(pointInPolygon(point, square)).toBe(expected));
  it('finds segment intersections exactly', () => expect(segmentIntersection(square[0], square[2], square[1], square[3])).toEqual({ x: px(60), y: px(60) }));
});
