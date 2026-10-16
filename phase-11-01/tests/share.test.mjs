import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalShareUrl, shareGame } from '../src/share.ts';

test('canonical share URL removes development parameters and fragments', () => {
  assert.equal(
    canonicalShareUrl('https://onishi.github.io/shoot-mata/?qa=burst-ready#game'),
    'https://onishi.github.io/shoot-mata/',
  );
});

test('share uses the native share sheet when available', async () => {
  let shared;
  const result = await shareGame({ share: async data => { shared = data; } }, 'https://example.com/game/?debug=1');
  assert.equal(result, 'shared');
  assert.equal(shared.title, 'SWITCHBACK — Stage 01');
  assert.equal(shared.url, 'https://example.com/game/');
});

test('share copies a clean URL when native sharing is unavailable', async () => {
  let copied = '';
  const result = await shareGame({ clipboard: { writeText: async value => { copied = value; } } }, 'https://example.com/game/#score');
  assert.equal(result, 'copied');
  assert.equal(copied, 'https://example.com/game/');
});
