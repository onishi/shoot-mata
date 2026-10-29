import test from "node:test";
import assert from "node:assert/strict";
import { readStorage, writeStorage } from "../../src/browser/storage.mjs";

test("optional browser storage reads and writes values", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };

  assert.equal(readStorage("progress", storage), null);
  assert.equal(writeStorage("progress", "6", storage), true);
  assert.equal(readStorage("progress", storage), "6");
});

test("optional browser storage failures do not stop the game", () => {
  const deniedStorage = {
    getItem() { throw new DOMException("denied", "SecurityError"); },
    setItem() { throw new DOMException("denied", "SecurityError"); }
  };

  assert.equal(readStorage("progress", deniedStorage), null);
  assert.equal(writeStorage("progress", "6", deniedStorage), false);
});
