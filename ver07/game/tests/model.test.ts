import { describe, expect, it } from "vitest";
import { commit, createGame, isGateOpen, move, start } from "../src/model";

describe("PALIMPSEST POST model", () => {
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
    expect(state.ghost).toEqual({ x: 1, y: 3 });

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
});
