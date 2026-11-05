import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROGRESS,
  PROGRESS_KEY,
  loadProgress,
  normalizeProgress,
  recordWin,
  saveProgress,
  type ProgressStorage,
} from "../src/progress";

function memoryStorage(initial: string | null = null): ProgressStorage & { value: string | null } {
  return {
    value: initial,
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; },
  };
}

describe("DUSKLOOM campaign progress", () => {
  it("unlocks the next panel without losing a farther unlocked panel", () => {
    expect(recordWin(DEFAULT_PROGRESS, 0, 3)).toEqual({ highestUnlocked: 1, completed: false });
    expect(recordWin({ highestUnlocked: 2, completed: false }, 0, 3)).toEqual({ highestUnlocked: 2, completed: false });
  });

  it("marks the sampler complete after the final panel", () => {
    expect(recordWin({ highestUnlocked: 2, completed: false }, 2, 3)).toEqual({
      highestUnlocked: 2,
      completed: true,
    });
  });

  it("clamps or rejects damaged saved values safely", () => {
    expect(normalizeProgress({ highestUnlocked: 99, completed: true }, 3)).toEqual({ highestUnlocked: 2, completed: true });
    expect(normalizeProgress({ highestUnlocked: "two", completed: true }, 3)).toEqual(DEFAULT_PROGRESS);
    expect(loadProgress(memoryStorage("not-json"), 3)).toEqual(DEFAULT_PROGRESS);
  });

  it("round-trips progress through versioned storage", () => {
    const storage = memoryStorage();
    saveProgress(storage, { highestUnlocked: 1, completed: false }, 3);
    expect(storage.value).toBe('{"highestUnlocked":1,"completed":false}');
    expect(loadProgress(storage, 3)).toEqual({ highestUnlocked: 1, completed: false });
    expect(PROGRESS_KEY).toBe("duskloom.progress.v1");
  });
});
