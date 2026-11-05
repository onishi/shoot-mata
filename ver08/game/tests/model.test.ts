import { describe, expect, it } from "vitest";
import { LEVELS, advanceMoths, continueAfterWin, createGame, flashNeedleFor, levelFor, movePlayer, restart, start, togglePause, withScenario, WIDTH } from "../src/model";

describe("DUSKLOOM model", () => {
  it("starts at the left selvage and can pause", () => {
    const playing = start(createGame());
    expect(playing.screen).toBe("playing");
    expect(playing.player).toEqual({ x: 0, y: 7 });
    expect(togglePause(playing).screen).toBe("paused");
  });

  it("starts a selected unlocked panel from the title", () => {
    const playing = start(createGame(), 1);
    expect(playing.screen).toBe("playing");
    expect(playing.levelIndex).toBe(1);
    expect(playing.moths).toHaveLength(2);
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
    const fresh = restart(doomed);
    expect(fresh.screen).toBe("playing");
    expect(fresh.spools).toBe(3);
  });

  it("loads the second panel from data with two crossing moths", () => {
    const firstWon = withScenario(start(createGame()), { screen: "won" });
    const second = continueAfterWin(firstWon);
    expect(second.levelIndex).toBe(1);
    expect(levelFor(second)).toEqual(LEVELS[1]);
    expect(second.moths).toEqual(LEVELS[1].moths);
    expect(second.moths).toHaveLength(2);
    expect(second.moths.map(({ dx, dy }) => ({ dx, dy }))).toEqual([
      { dx: -1, dy: 1 },
      { dx: 1, dy: -1 },
    ]);
  });

  it("loads the third panel with a repaired inner island", () => {
    const third = restart(createGame(2));
    expect(levelFor(third)).toEqual(LEVELS[2]);
    expect(third.repaired).toBe(28);
    for (let y = 5; y <= 8; y += 1) {
      for (let x = 8; x <= 11; x += 1) expect(third.cloth[y * WIDTH + x]).toBe(true);
    }
    expect(third.cloth[7 * WIDTH + 7]).toBe(false);
    expect(third.cloth[7 * WIDTH + 12]).toBe(false);
  });

  it("uses the inner island as a safe anchor on the way across the third panel", () => {
    let state = restart(createGame(2));
    for (let x = 0; x < 8; x += 1) state = movePlayer(state, "right", true);
    expect(state.player).toEqual({ x: 8, y: 7 });
    expect(state.trail).toEqual([]);
    expect(state.lastEvent).toBe("claim");
    expect(state.screen).toBe("playing");

    for (let x = 8; x < 11; x += 1) state = movePlayer(state, "right", false);
    for (let x = 11; x < WIDTH - 1; x += 1) state = movePlayer(state, "right", true);
    expect(state.player).toEqual({ x: 19, y: 7 });
    expect(state.repaired).toBe(64);
    expect(state.screen).toBe("playing");

    state = movePlayer(state, "up", false);
    state = movePlayer(state, "up", false);
    for (let x = 19; x > 11; x -= 1) state = movePlayer(state, "left", true);
    expect(state.player).toEqual({ x: 11, y: 5 });
    expect(state.repaired).toBeGreaterThanOrEqual(LEVELS[2].goal);
    expect(state.screen).toBe("won");
  });

  it("keeps both occupied regions dark when a seam divides the two moths", () => {
    let state = restart(createGame(1));
    for (let x = 0; x < WIDTH - 1; x += 1) state = movePlayer(state, "right", true);
    expect(state.lastEvent).toBe("claim");
    expect(state.repaired).toBe(29);
    expect(state.moths.every((moth) => !state.cloth[moth.y * WIDTH + moth.x])).toBe(true);
  });

  it("warns before the flash needle burns loose thread in its marked column", () => {
    let state = restart(createGame(3));
    state = withScenario(state, {
      tick: 6,
      trail: [{ x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 }],
      player: { x: 6, y: 7 },
      moths: [{ x: 14, y: 3, dx: 1, dy: 1 }],
    });
    expect(flashNeedleFor(state)).toEqual({ column: 5, phase: "warning", ticksUntilStrike: 3 });
    state = advanceMoths(advanceMoths(state));
    expect(flashNeedleFor(state)?.phase).toBe("warning");
    const struck = advanceMoths(state);
    expect(flashNeedleFor(struck)?.phase).toBe("active");
    expect(struck.lastEvent).toBe("cut");
    expect(struck.spools).toBe(2);
    expect(struck.player).toEqual(struck.anchor);
  });

  it("allows loose thread outside the flash needle column to survive a strike", () => {
    const state = withScenario(restart(createGame(3)), {
      tick: 8,
      trail: [{ x: 1, y: 7 }, { x: 2, y: 7 }],
      player: { x: 2, y: 7 },
      moths: [{ x: 14, y: 3, dx: 1, dy: 1 }],
    });
    const advanced = advanceMoths(state);
    expect(flashNeedleFor(advanced)).toMatchObject({ column: 5, phase: "active" });
    expect(advanced.spools).toBe(3);
    expect(advanced.trail).toHaveLength(2);
  });

  it("cuts thread extended into a column while the flash needle is active", () => {
    const state = withScenario(restart(createGame(3)), {
      tick: 9,
      trail: [
        { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 },
      ],
      player: { x: 4, y: 7 },
      moths: [{ x: 14, y: 3, dx: 1, dy: 1 }],
    });
    const struck = movePlayer(state, "right", true);
    expect(struck.lastEvent).toBe("cut");
    expect(struck.spools).toBe(2);
    expect(struck.trail).toEqual([]);
  });

  it("restarts the current panel and returns to the title after the sampler", () => {
    const second = restart(createGame(1));
    expect(restart(second).levelIndex).toBe(1);
    const third = continueAfterWin(withScenario(second, { screen: "won" }));
    expect(third.levelIndex).toBe(2);
    const fourth = continueAfterWin(withScenario(third, { screen: "won" }));
    expect(fourth.levelIndex).toBe(3);
    expect(flashNeedleFor(fourth)).toMatchObject({ column: 5, phase: "dormant" });
    const completed = withScenario(fourth, { screen: "won" });
    const returned = continueAfterWin(completed);
    expect(returned.levelIndex).toBe(0);
    expect(returned.screen).toBe("title");
  });
});
