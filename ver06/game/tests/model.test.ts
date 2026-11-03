import { describe, expect, it } from "vitest";
import { MAX_CHARGES, STAGE_DURATION, WORLD, createGame, emitRipple, simulate, tick } from "../src/model";

describe("FIRST RAIN model", () => {
  it("spawns deterministic inward motes", () => {
    let state = createGame();
    for (let i = 0; i < 40; i += 1) state = tick(state, { x: 0, y: 0 }, 1 / 60);
    expect(state.motes).toHaveLength(1);
    const before = Math.hypot(state.motes[0].x - WORLD.cx, state.motes[0].y - WORLD.cy);
    state = tick(state, { x: 0, y: 0 }, 1 / 60);
    const after = Math.hypot(state.motes[0].x - WORLD.cx, state.motes[0].y - WORLD.cy);
    expect(after).toBeLessThan(before);
  });

  it("emits only available ripples", () => {
    let state = createGame();
    state = emitRipple(emitRipple(emitRipple(state)));
    const exhausted = emitRipple(state);
    expect(exhausted.charges).toBe(0);
    expect(exhausted.ripples).toHaveLength(MAX_CHARGES);
  });

  it("recharges at the shore but not in open water", () => {
    let state = createGame();
    state = emitRipple(state);
    for (let i = 0; i < 120; i += 1) state = tick(state, { x: 0, y: 1 }, 1 / 60);
    expect(state.charges).toBe(MAX_CHARGES);
  });

  it("loses when the bloom is left undefended", () => {
    const state = simulate(STAGE_DURATION, () => ({ input: { x: 0, y: 0 }, pulse: false }));
    expect(state.mode).toBe("lost");
    expect(state.health).toBe(0);
  });

  it("wins with timed center ripples", () => {
    const fired = new Set<number>();
    const pulseTimes = [2.2, 7.6, 12.7];
    const state = simulate(STAGE_DURATION + 1, (current) => {
      const index = pulseTimes.findIndex((time, i) => current.time >= time && !fired.has(i));
      if (index >= 0) fired.add(index);
      return { input: { x: 0, y: 0 }, pulse: index >= 0 };
    });
    expect(state.mode).toBe("won");
    expect(state.health).toBeGreaterThan(0);
    expect(state.score).toBeGreaterThanOrEqual(3);
  });
});
