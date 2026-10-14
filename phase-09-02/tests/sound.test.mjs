import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound } from '../src/sound.ts';

test('sound ignores another toggle while audio startup is pending', async () => {
  const original = globalThis.AudioContext;
  let resolveResume;
  let context;
  globalThis.AudioContext = class {
    state = 'suspended';
    resumeCalls = 0;
    constructor() { context = this; }
    resume() {
      this.resumeCalls++;
      return new Promise(resolve => {
        resolveResume = () => { this.state = 'running'; resolve(); };
      });
    }
    async suspend() { this.state = 'suspended'; }
  };
  try {
    const sound = new Sound();
    const first = sound.toggle();
    const duplicate = sound.toggle();
    assert.equal(context.resumeCalls, 1);
    assert.equal(await duplicate, false);
    resolveResume();
    assert.equal(await first, true);
    assert.equal(await sound.toggle(), false);
  } finally {
    globalThis.AudioContext = original;
  }
});

test('failed audio startup returns off and allows a later retry', async () => {
  const original = globalThis.AudioContext;
  let context;
  globalThis.AudioContext = class {
    state = 'suspended';
    deny = true;
    constructor() { context = this; }
    async resume() {
      if (this.deny) throw new Error('playback denied');
      this.state = 'running';
    }
  };
  try {
    const sound = new Sound();
    assert.equal(await sound.toggle(), false);
    context.deny = false;
    assert.equal(await sound.toggle(), true);
  } finally {
    globalThis.AudioContext = original;
  }
});
