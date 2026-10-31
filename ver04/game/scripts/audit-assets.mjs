import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'assets/manifest.json'), 'utf8'));
const required = ['id', 'kind', 'path', 'stage', 'usage', 'version', 'status', 'createdBy', 'sourcePrompt', 'generatedAt', 'editHistory', 'dimensions', 'license'];
const ids = new Set();

for (const asset of manifest.assets) {
  for (const field of required) if (!(field in asset)) throw new Error(`${asset.id ?? 'unknown'} is missing ${field}`);
  if (ids.has(asset.id)) throw new Error(`duplicate asset id: ${asset.id}`);
  ids.add(asset.id);
  if (!['prototype', 'review', 'final'].includes(asset.status)) throw new Error(`${asset.id} has an invalid status`);
  if (asset.license !== 'project-original') throw new Error(`${asset.id} has an invalid license`);
  await access(resolve(root, asset.path));
}

const expected = [
  'stage-01-erased-harbor-far-v1', 'stage-01-erased-harbor-mid-v1', 'stage-01-erased-harbor-fore-v1',
  'stage-01-sprites-v1', 'stage-01-canvas-effects-v1', 'stage-01-ambient-v1', 'stage-01-pulse-v1',
  'stage-01-crisis-v1', 'stage-01-effects-v1', 'stage-02-crosswind-index-far-v1',
  'stage-02-crosswind-index-mid-v1', 'stage-02-crosswind-index-fore-v1', 'stage-02-sprites-v1',
  'stage-02-canvas-effects-v1'
];
for (const id of expected) {
  if (!ids.has(id)) throw new Error(`required visual-slice asset is unregistered: ${id}`);
  if (manifest.assets.find((asset) => asset.id === id).status !== 'final') throw new Error(`required visual-slice asset is not final: ${id}`);
}
const provisional = manifest.assets.filter((asset) => asset.status !== 'final');
console.log(`asset audit passed: ${expected.length} required final entries; ${provisional.length} tracked provisional entries`);
