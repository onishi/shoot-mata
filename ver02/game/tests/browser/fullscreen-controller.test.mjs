import assert from "node:assert/strict";
import test from "node:test";
import { createFullscreenController } from "../../src/browser/fullscreen-controller.mjs";

class FakeTarget {
  constructor() {
    this.listeners = new Map();
    this.attributes = new Map();
    this.textContent = "";
    this.hidden = true;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  async dispatch(type) {
    for (const listener of this.listeners.get(type) ?? []) await listener();
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
}

function createHarness({ reject = false, supported = true } = {}) {
  const documentTarget = new FakeTarget();
  const element = {};
  const button = new FakeTarget();
  const statusElement = new FakeTarget();
  if (supported) {
    element.requestFullscreen = async () => {
      if (reject) throw new Error("denied");
      documentTarget.fullscreenElement = element;
      await documentTarget.dispatch("fullscreenchange");
    };
    documentTarget.exitFullscreen = async () => {
      documentTarget.fullscreenElement = null;
      await documentTarget.dispatch("fullscreenchange");
    };
  }
  return { documentTarget, element, button, statusElement };
}

test("UX-07: フルスクリーン許可と解除をボタン状態・通知へ同期する", async () => {
  const harness = createHarness();
  const controller = createFullscreenController(harness);
  assert.equal(controller.supported, true);
  assert.equal(harness.button.attributes.get("aria-pressed"), "false");
  assert.equal(harness.statusElement.hidden, true);

  await harness.button.dispatch("click");
  assert.equal(harness.button.textContent, "通常表示");
  assert.equal(harness.button.attributes.get("aria-pressed"), "true");
  assert.match(harness.statusElement.textContent, /表示中/);

  await harness.button.dispatch("click");
  assert.equal(harness.button.textContent, "フルスクリーン");
  assert.equal(harness.button.attributes.get("aria-pressed"), "false");
  assert.equal(harness.statusElement.hidden, true);
  controller.dispose();
  assert.equal(harness.button.listeners.get("click").size, 0);
});

test("UX-07: フルスクリーン拒否後も通常表示と永続する説明を保つ", async () => {
  const harness = createHarness({ reject: true });
  createFullscreenController(harness);
  await harness.button.dispatch("click");
  assert.equal(harness.button.attributes.get("aria-pressed"), "false");
  assert.equal(harness.statusElement.hidden, false);
  assert.match(harness.statusElement.textContent, /通常表示のままプレイを継続/);
});

test("UX-07: 非対応環境を明示し通常表示を継続する", async () => {
  const harness = createHarness({ supported: false });
  const controller = createFullscreenController(harness);
  assert.equal(controller.supported, false);
  assert.equal(harness.button.attributes.get("aria-disabled"), "true");
  await harness.button.dispatch("click");
  assert.equal(harness.statusElement.hidden, false);
  assert.match(harness.statusElement.textContent, /非対応/);
  assert.match(harness.statusElement.textContent, /通常表示のままプレイを継続/);
});
