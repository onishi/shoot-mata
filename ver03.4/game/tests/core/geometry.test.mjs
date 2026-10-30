import test from "node:test";
import assert from "node:assert/strict";
import { overlapsCirclePolygon, overlapsCircleRect, overlapsRectPolygon } from "../../src/core/geometry.mjs";

test("terrain collision includes the visible edge and rejects a safe gap", () => {
  const terrain = { x: 100, y: 500, width: 300, height: 220 };
  assert.equal(overlapsCircleRect({ x: 150, y: 497, radius: 5 }, terrain), true);
  assert.equal(overlapsCircleRect({ x: 150, y: 480, radius: 5 }, terrain), false);
});

test("polygon terrain shares precise collision for craft and shots", () => {
  const slope = [{ x: 100, y: 500 }, { x: 250, y: 430 }, { x: 400, y: 500 }, { x: 400, y: 720 }, { x: 100, y: 720 }];
  assert.equal(overlapsCirclePolygon({ x: 250, y: 445, radius: 8 }, slope), true);
  assert.equal(overlapsCirclePolygon({ x: 130, y: 445, radius: 8 }, slope), false);
  assert.equal(overlapsRectPolygon({ x: 240, y: 438, width: 20, height: 12 }, slope), true);
  assert.equal(overlapsRectPolygon({ x: 110, y: 430, width: 15, height: 8 }, slope), false);
});
