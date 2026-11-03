import { describe, expect, it } from "vitest";
import { MAX_CHARGES, STAGES, STAGE_DURATION, WORLD, createGame, emitRipple, reedsBlock, simulate, tick } from "../src/model";

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

describe("SHORE CALL model", () => {
  it("cannot be held with the initial three ripples", () => {
    const fired = new Set<number>();
    const pulseTimes = [2.2, 6.6, 11.0, 15.4];
    const state = simulate(STAGES["shore-call"].duration + 1, (current) => {
      const index = pulseTimes.findIndex((time, i) => current.time >= time && !fired.has(i));
      if (index >= 0) fired.add(index);
      return { input: { x: 0, y: 0 }, pulse: index >= 0 };
    }, "shore-call");
    expect(state.mode).toBe("lost");
    expect(state.charges).toBe(0);
  });

  it("can be held by gathering dew at the shore", () => {
    const fired = new Set<number>();
    const pulseTimes = [2.2, 6.6, 11.0, 15.4];
    const state = simulate(STAGES["shore-call"].duration + 1, (current) => {
      const index = pulseTimes.findIndex((time, i) => current.time >= time && !fired.has(i));
      if (index >= 0) fired.add(index);
      const gathering = current.time >= 2.25 && current.time < 4.5;
      const returning = current.time >= 4.5 && current.time < 5.9;
      return { input: gathering ? { x: 0, y: 1 } : returning ? { x: 0, y: -1 } : { x: 0, y: 0 }, pulse: index >= 0 };
    }, "shore-call");
    expect(state.mode).toBe("won");
    expect(state.health).toBe(3);
    expect(state.score).toBe(10);
  });
});

describe("SPLIT CURRENT model", () => {
  it("loses when all three ripples are spent on the swift group", () => {
    let pulses = 0;
    const state = simulate(STAGES["split-current"].duration + 1, (current) => {
      const pulse = current.time >= 1.15 && pulses < 3;
      if (pulse) pulses += 1;
      return { input: { x: 0, y: 0 }, pulse };
    }, "split-current");
    expect(state.mode).toBe("lost");
    expect(state.score).toBe(3);
    expect(state.charges).toBe(0);
  });

  it("can be held by separating the swift and deep groups in time", () => {
    const fired = new Set<number>();
    const pulseTimes = [1.15, 6.15];
    const state = simulate(STAGES["split-current"].duration + 1, (current) => {
      const index = pulseTimes.findIndex((time, i) => current.time >= time && !fired.has(i));
      if (index >= 0) fired.add(index);
      return { input: { x: 0, y: 0 }, pulse: index >= 0 };
    }, "split-current");
    expect(state.mode).toBe("won");
    expect(state.health).toBe(3);
    expect(state.score).toBe(6);
    expect(state.charges).toBe(1);
  });
});

describe("REED GATE model", () => {
  it("blocks a center ripple but not a ripple cast beyond the reed belt", () => {
    expect(reedsBlock({ x: WORLD.cx, y: WORLD.cy }, { x: WORLD.cx + 240, y: WORLD.cy })).toBe(true);
    expect(reedsBlock({ x: WORLD.cx + 170, y: WORLD.cy }, { x: WORLD.cx + 240, y: WORLD.cy })).toBe(false);
  });

  it("cannot be held by casting from the center side of the reeds", () => {
    const fired = new Set<number>();
    const pulseTimes = [2.0, 7.2];
    const state = simulate(STAGES["reed-gate"].duration + 1, (current) => {
      const index = pulseTimes.findIndex((time, i) => current.time >= time && !fired.has(i));
      if (index >= 0) fired.add(index);
      return { input: { x: 0, y: 0 }, pulse: index >= 0 };
    }, "reed-gate");
    expect(state.mode).toBe("lost");
    expect(state.score).toBe(0);
  });

  it("can be held by crossing the reeds and casting from their far side", () => {
    const fired = new Set<number>();
    const pulseTimes = [2.0, 7.2];
    const state = simulate(STAGES["reed-gate"].duration + 1, (current) => {
      const index = pulseTimes.findIndex((time, i) => current.time >= time && !fired.has(i));
      if (index >= 0) fired.add(index);
      const crossing = current.time < 1.2;
      return { input: crossing ? { x: 1, y: -0.5 } : { x: 0, y: 0 }, pulse: index >= 0 };
    }, "reed-gate");
    expect(state.mode).toBe("won");
    expect(state.health).toBe(3);
    expect(state.score).toBe(6);
  });
});
