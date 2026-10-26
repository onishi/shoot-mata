import test from "node:test";
import assert from "node:assert/strict";
import { overlapsCircleRect } from "../../src/core/geometry.mjs";

test("terrain collision includes the visible edge and rejects a safe gap", () => {
  const terrain = { x: 100, y: 500, width: 300, height: 220 };
  assert.equal(overlapsCircleRect({ x: 150, y: 497, radius: 5 }, terrain), true);
  assert.equal(overlapsCircleRect({ x: 150, y: 480, radius: 5 }, terrain), false);
});
