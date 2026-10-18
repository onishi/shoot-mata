import test from 'node:test';
import assert from 'node:assert/strict';
import { Effects } from '../src/effects.ts';

function canvas() {
  const labels = [];
  return {
    labels,
    save() {}, restore() {}, translate() {}, beginPath() {}, arc() {}, stroke() {},
    fillText(text) { labels.push(text); },
  };
}

test('a new weapon switch replaces the old mode label and fades out', () => {
  const effects = new Effects();
  const ctx = canvas();
  effects.add({ kind: 'switch', x: 145, y: 270, mode: 'focus' });
  effects.add({ kind: 'switch', x: 145, y: 270, mode: 'wide' });
  effects.draw(ctx);
  assert.deepEqual(ctx.labels, ['WIDE']);
  for (let index = 0; index < 16; index++) effects.update(0.05);
  ctx.labels.length = 0;
  effects.draw(ctx);
  assert.deepEqual(ctx.labels, []);
});
