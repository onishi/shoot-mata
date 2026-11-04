import { describe, expect, it } from "vitest";
import { commit, continueAfterWin, createGame, getPlateArrivalBeats, isGateOpen, levels, move, start, type Action } from "../src/model";

describe("PALIMPSEST POST model", () => {
  it("identifies the seal beats used by the visual echo ledger", () => {
    expect(getPlateArrivalBeats(levels[0], ["right", "right"])).toEqual([2]);
    expect(getPlateArrivalBeats(levels[1], ["up", "up", "right", "right", "right", "right", "right"])).toEqual([6]);
    expect(getPlateArrivalBeats(levels[2], ["up", "up", "right", "right", "right", "wait", "right", "right"])).toEqual([7]);
  });
  it("starts from the title at the intake desk", () => {
    const state = start(createGame());
    expect(state.screen).toBe("playing");
    expect(state.player).toEqual({ x: 1, y: 3 });
  });

  it("does not pass the censorship gate without an echo on the seal", () => {
    let state = createGame("playing");
    for (let i = 0; i < 5; i += 1) state = move(state, "right");
    expect(state.player).toEqual({ x: 4, y: 3 });
    expect(state.lastEvent).toBe("blocked");
    expect(state.screen).toBe("playing");
  });

  it("replays two recorded steps and opens the gate on the arrival turn", () => {
    let state = createGame("playing");
    state = move(move(state, "right"), "right");
    state = commit(state);
    expect(state.ghosts).toHaveLength(1);
    expect(state.ghosts[0].position).toEqual({ x: 1, y: 3 });

    state = move(state, "right");
    expect(isGateOpen(state)).toBe(false);
    state = move(state, "right");
    expect(isGateOpen(state)).toBe(true);
    state = move(state, "right");
    state = move(state, "right");
    expect(state.player).toEqual({ x: 5, y: 3 });
  });

  it("requires the sealed letter before the outbox can complete the room", () => {
    let state = createGame("playing");
    state = { ...state, player: { x: 8, y: 3 } };
    state = move(state, "right");
    expect(state.screen).toBe("playing");
  });

  it("completes DEAD LETTER with the intended recorded route", () => {
    let state = createGame("playing");
    state = move(move(state, "right"), "right");
    state = commit(state);
    for (let i = 0; i < 8; i += 1) state = move(state, "right");
    expect(state.hasLetter).toBe(true);
    expect(state.player).toEqual({ x: 9, y: 3 });
    expect(state.screen).toBe("won");
  });

  it("continues from DEAD LETTER into MOVING DEADLINE", () => {
    let state = createGame("won");
    state = continueAfterWin(state);
    expect(state.screen).toBe("playing");
    expect(state.levelIndex).toBe(1);
    expect(state.player).toEqual({ x: 1, y: 3 });
  });

  it("closes the second gate again after the moving echo leaves its seal", () => {
    let state = createGame("playing", 1);
    for (const direction of ["up", "up", "right", "right", "right", "right", "right"] as const) {
      state = move(state, direction);
    }
    state = commit(state);
    for (let i = 0; i < 6; i += 1) state = move(state, "right");
    expect(isGateOpen(state)).toBe(true);
    expect(state.player).toEqual({ x: 7, y: 3 });
    state = move(state, "right");
    expect(isGateOpen(state)).toBe(false);
    expect(state.hasLetter).toBe(true);
  });

  it("does not let a finished echo hold a transit seal", () => {
    let state = createGame("playing", 1);
    for (const action of ["up", "up", "right", "right", "right", "right"] as const) {
      state = move(state, action);
    }
    state = commit(state);
    for (let i = 0; i < 6; i += 1) state = move(state, "right");
    expect(state.ghosts[0].position).toEqual({ x: 5, y: 1 });
    expect(isGateOpen(state)).toBe(false);
    expect(state.player).toEqual({ x: 6, y: 3 });
  });

  it("requires matching the moving echo's arrival turn in MOVING DEADLINE", () => {
    let state = createGame("playing", 1);
    for (const direction of ["up", "up", "right", "right", "right", "right", "right"] as const) {
      state = move(state, direction);
    }
    state = commit(state);
    for (let i = 0; i < 8; i += 1) state = move(state, "right");
    expect(state.player).toEqual({ x: 9, y: 3 });
    expect(state.hasLetter).toBe(true);
    expect(state.screen).toBe("won");
  });

  it("continues into MISSING MINUTE and solves it with one recorded wait", () => {
    let state = continueAfterWin(createGame("won", 1));
    expect(state.levelIndex).toBe(2);
    for (const action of ["up", "up", "right", "right", "right", "wait", "right", "right"] as const) {
      state = move(state, action);
    }
    state = commit(state);
    for (let i = 0; i < 9; i += 1) state = move(state, "right");
    expect(state.player).toEqual({ x: 10, y: 3 });
    expect(state.hasLetter).toBe(true);
    expect(state.screen).toBe("won");
  });

  it("has no clean short solution to MISSING MINUTE and requires a wait in every shortest clean solution", () => {
    const alphabet: readonly Action[] = ["up", "right", "wait"];
    const recordings = (length: number): Action[][] => {
      let routes: Action[][] = [[]];
      for (let step = 0; step < length; step += 1) {
        routes = routes.flatMap((route) => alphabet.map((action) => [...route, action]));
      }
      return routes;
    };
    const clean = (route: Action[]) => {
      let state = createGame("playing", 2);
      for (const action of route) {
        const before = state.player;
        state = move(state, action);
        if (action !== "wait" && state.player.x === before.x && state.player.y === before.y) return null;
      }
      return commit(state);
    };
    const winsWith = (route: Action[]) => {
      let state = clean(route);
      if (!state) return false;
      for (let i = 0; i < 9; i += 1) state = move(state, "right");
      return state.screen === "won";
    };

    expect(recordings(7).filter(winsWith)).toHaveLength(0);
    const shortest = recordings(8).filter(winsWith);
    expect(shortest.length).toBeGreaterThan(0);
    expect(shortest.every((route) => route.includes("wait"))).toBe(true);
    expect(shortest.some((route) => route.filter((action) => action === "wait").length === 1)).toBe(true);
    const routesWithExtraWait = shortest.filter((route) => route.filter((action) => action === "wait").length > 1);
    expect(routesWithExtraWait.every((route) => route.at(-1) === "wait")).toBe(true);
  });

  it("keeps earlier recordings and rewinds every echo when another is filed", () => {
    let state = createGame("playing", 3);
    for (const action of ["up", "up", "right", "right", "wait", "wait", "right", "right"] as const) {
      state = move(state, action);
    }
    state = commit(state);
    for (const action of ["down", "down", "right", "right", "right", "right", "right", "right"] as const) {
      state = move(state, action);
    }
    expect(state.ghosts[0].step).toBe(8);

    state = commit(state);
    expect(state.ghosts).toHaveLength(2);
    expect(state.ghosts.map((ghost) => ghost.step)).toEqual([0, 0]);
    expect(state.ghosts.map((ghost) => ghost.position)).toEqual([{ x: 1, y: 3 }, { x: 1, y: 3 }]);
  });

  it("requires two echoes to strike both CARBON COPIES seals on the same beat", () => {
    let oneEcho = createGame("playing", 3);
    for (const action of ["up", "up", "right", "right", "wait", "wait", "right", "right"] as const) {
      oneEcho = move(oneEcho, action);
    }
    oneEcho = commit(oneEcho);
    for (let step = 0; step < 7; step += 1) oneEcho = move(oneEcho, "right");
    expect(isGateOpen(oneEcho)).toBe(false);
    expect(oneEcho.player).toEqual({ x: 7, y: 3 });

    let state = createGame("playing", 3);
    for (const action of ["up", "up", "right", "right", "wait", "wait", "right", "right"] as const) {
      state = move(state, action);
    }
    state = commit(state);
    for (const action of ["down", "down", "right", "right", "right", "right", "right", "right"] as const) {
      state = move(state, action);
    }
    state = commit(state);
    for (let step = 0; step < 7; step += 1) state = move(state, "right");
    expect(isGateOpen(state)).toBe(true);
    expect(state.player).toEqual({ x: 8, y: 3 });
    state = move(move(state, "right"), "right");
    expect(state.hasLetter).toBe(true);
    expect(state.screen).toBe("won");
  });

  it("records an attempted step when the original is rejected by copy paper", () => {
    let state = createGame("playing", 4);
    for (const action of ["up", "up", "right"] as const) state = move(state, action);
    expect(state.player).toEqual({ x: 2, y: 1 });

    state = move(state, "right");
    expect(state.player).toEqual({ x: 2, y: 1 });
    expect(state.lastEvent).toBe("blocked");
    expect(state.currentRecording).toEqual(["up", "up", "right", "right"]);
  });

  it("lets an echo cross copy paper and open AUTHORIZED COPY on the matching beat", () => {
    let state = createGame("playing", 4);
    for (const action of ["up", "up", "right", "right", "right", "right", "right", "right"] as const) {
      state = move(state, action);
    }
    state = commit(state);

    for (let step = 0; step < 4; step += 1) state = move(state, "right");
    expect(state.ghosts[0].position).toEqual({ x: 3, y: 1 });
    expect(state.player).toEqual({ x: 5, y: 3 });
    for (let step = 0; step < 3; step += 1) state = move(state, "right");
    expect(isGateOpen(state)).toBe(true);
    expect(state.ghosts[0].position).toEqual({ x: 6, y: 1 });
    expect(state.player).toEqual({ x: 8, y: 3 });

    state = move(move(state, "right"), "right");
    expect(state.hasLetter).toBe(true);
    expect(state.screen).toBe("won");
  });

  it("combines copy paper, a delayed upper echo, and a second echo in FINAL AUDIT", () => {
    let state = createGame("playing", 5);
    for (const action of ["up", "up", "right", "right", "right", "wait", "right", "right"] as const) {
      state = move(state, action);
    }
    expect(state.player).toEqual({ x: 2, y: 1 });
    state = commit(state);

    for (const action of ["down", "down", "right", "right", "right", "right", "right", "right"] as const) {
      state = move(state, action);
    }
    state = commit(state);
    expect(state.ghosts).toHaveLength(2);

    for (let step = 0; step < 6; step += 1) state = move(state, "right");
    expect(isGateOpen(state)).toBe(false);
    expect(state.player).toEqual({ x: 7, y: 3 });
    state = move(state, "right");
    expect(state.ghosts.map((ghost) => ghost.position)).toEqual([{ x: 5, y: 1 }, { x: 6, y: 5 }]);
    expect(isGateOpen(state)).toBe(true);
    expect(state.player).toEqual({ x: 8, y: 3 });

    state = move(move(state, "right"), "right");
    expect(state.hasLetter).toBe(true);
    expect(state.screen).toBe("won");
  });

  it("returns to the file desk after the final audit ending", () => {
    const state = continueAfterWin(createGame("won", 5));
    expect(state.screen).toBe("title");
    expect(state.levelIndex).toBe(0);
  });
});
