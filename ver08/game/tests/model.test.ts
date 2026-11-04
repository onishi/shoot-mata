import { describe, expect, it } from "vitest";
import { advanceMoths, createGame, movePlayer, restart, start, togglePause, withScenario, WIDTH } from "../src/model";

describe("DUSKLOOM model", () => {
  it("starts at the left selvage and can pause", () => {
    const playing = start(createGame());
    expect(playing.screen).toBe("playing");
    expect(playing.player).toEqual({ x: 0, y: 7 });
    expect(togglePause(playing).screen).toBe("paused");
  });

  it("requires Space to leave repaired cloth", () => {
    const state = start(createGame());
    expect(movePlayer(state, "right", false).lastEvent).toBe("blocked");
    const drawing = movePlayer(state, "right", true);
    expect(drawing.trail).toEqual([{ x: 1, y: 7 }]);
  });

  it("closes a seam and repairs the enemy-free side", () => {
    let state = start(createGame());
    const before = state.repaired;
    for (let x = 0; x < WIDTH - 1; x += 1) state = movePlayer(state, "right", true);
    expect(state.trail).toHaveLength(0);
    expect(state.repaired).toBeGreaterThan(before);
    expect(state.lastEvent).toBe("claim");
  });

  it("loses a spool and returns to its anchor when a moth cuts the loose thread", () => {
    const base = start(createGame());
    const state = withScenario(base, {
      trail: [{ x: 1, y: 7 }, { x: 2, y: 7 }],
      player: { x: 2, y: 7 },
      moths: [{ x: 3, y: 6, dx: -1, dy: 1 }],
    });
    const cut = advanceMoths(state);
    expect(cut.spools).toBe(2);
    expect(cut.trail).toEqual([]);
    expect(cut.player).toEqual(state.anchor);
  });

  it("cuts immediately when the weaver stitches into a moth", () => {
    const base = start(createGame());
    const state = withScenario(base, { moths: [{ x: 1, y: 7, dx: 1, dy: 1 }] });
    const cut = movePlayer(state, "right", true);
    expect(cut.lastEvent).toBe("cut");
    expect(cut.spools).toBe(2);
    expect(cut.player).toEqual(state.anchor);
  });

  it("wins when a closing seam reaches the repair target", () => {
    const base = start(createGame());
    const cloth = base.cloth.map(() => true);
    cloth[7 * WIDTH + 1] = false;
    let state = withScenario(base, { cloth, repaired: 99, moths: [{ x: 10, y: 10, dx: 1, dy: 1 }] });
    state = movePlayer(state, "right", true);
    state = movePlayer(state, "left", false);
    expect(state.screen).toBe("won");
    expect(state.repaired).toBe(100);
  });

  it("ends after the final spool is cut and restarts cleanly", () => {
    const base = start(createGame());
    const doomed = withScenario(base, {
      spools: 1,
      trail: [{ x: 2, y: 7 }],
      moths: [{ x: 3, y: 6, dx: -1, dy: 1 }],
    });
    expect(advanceMoths(doomed).screen).toBe("lost");
    const fresh = restart();
    expect(fresh.screen).toBe("playing");
    expect(fresh.spools).toBe(3);
  });
});
