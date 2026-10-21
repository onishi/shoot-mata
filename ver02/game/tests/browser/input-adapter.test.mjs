import test from "node:test";
import assert from "node:assert/strict";
import { createBrowserInputAdapter } from "../../src/browser/input-adapter.mjs";
import { consumeInput } from "../../src/core/input-state.mjs";

class FakeTarget {
  listeners = new Map();
  captured = [];

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  setPointerCapture(pointerId) {
    this.captured.push(pointerId);
  }

  dispatch(type, fields = {}) {
    const event = {
      type,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      ...fields,
    };
    for (const listener of this.listeners.get(type) ?? []) listener(event);
    return event;
  }
}

test("INP-01: gameplay中だけ割当済みキーボード操作の既定動作を抑止する", () => {
  const keyboard = new FakeTarget();
  const game = new FakeTarget();
  const adapter = createBrowserInputAdapter({ keyboardTarget: keyboard, gameTarget: game });
  const menuArrow = keyboard.dispatch("keydown", { code: "ArrowLeft", repeat: false });
  assert.equal(menuArrow.defaultPrevented, false);
  adapter.setGameplayActive(true);
  const gameArrow = keyboard.dispatch("keydown", { code: "ArrowRight", repeat: false });
  const unknown = keyboard.dispatch("keydown", { code: "KeyQ", repeat: false });
  assert.equal(gameArrow.defaultPrevented, true);
  assert.equal(unknown.defaultPrevented, false);
  assert.equal(consumeInput(adapter.state).moveX, 0);
});

test("INP-02/03: ゲーム操作領域のpointerだけを捕捉・抑止しmulti-touchを保持する", () => {
  const keyboard = new FakeTarget();
  const game = new FakeTarget();
  const adapter = createBrowserInputAdapter({ keyboardTarget: keyboard, gameTarget: game });
  const outsideControl = game.dispatch("pointerdown", {
    pointerId: 1, clientX: 0, clientY: 0, target: { dataset: {} },
  });
  assert.equal(outsideControl.defaultPrevented, false);

  const moveDown = game.dispatch("pointerdown", {
    pointerId: 2, clientX: 10, clientY: 10, target: { dataset: { inputRole: "move" } },
  });
  const fireDown = game.dispatch("pointerdown", {
    pointerId: 3, clientX: 90, clientY: 10, target: { dataset: { inputRole: "fire" } },
  });
  game.dispatch("pointermove", { pointerId: 2, clientX: 58, clientY: 10 });
  const commands = consumeInput(adapter.state);
  assert.equal(moveDown.defaultPrevented, true);
  assert.equal(fireDown.defaultPrevented, true);
  assert.deepEqual(game.captured, [2, 3]);
  assert.equal(commands.moveX, 1);
  assert.equal(commands.fire, true);
});

test("INP-02: cancel、capture喪失、blur、disposeで入力を確実に解放する", () => {
  for (const releaseEvent of ["pointercancel", "lostpointercapture", "pointerup"]) {
    const keyboard = new FakeTarget();
    const game = new FakeTarget();
    const adapter = createBrowserInputAdapter({ keyboardTarget: keyboard, gameTarget: game });
    game.dispatch("pointerdown", {
      pointerId: 5, clientX: 0, clientY: 0, target: { dataset: { inputRole: "fire" } },
    });
    game.dispatch(releaseEvent, { pointerId: 5 });
    assert.equal(consumeInput(adapter.state).fire, false, releaseEvent);
  }

  const keyboard = new FakeTarget();
  const game = new FakeTarget();
  const adapter = createBrowserInputAdapter({ keyboardTarget: keyboard, gameTarget: game });
  keyboard.dispatch("keydown", { code: "Space", repeat: false });
  keyboard.dispatch("blur");
  assert.equal(consumeInput(adapter.state).fire, false);
  keyboard.dispatch("keydown", { code: "Space", repeat: false });
  adapter.dispose();
  assert.equal(consumeInput(adapter.state).fire, false);
  assert.equal(keyboard.listeners.get("keydown").size, 0);
});
