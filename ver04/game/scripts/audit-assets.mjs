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
  if (asset.status !== 'final') throw new Error(`${asset.id} remains ${asset.status}`);
  if (asset.license !== 'project-original') throw new Error(`${asset.id} has an invalid license`);
  await access(resolve(root, asset.path));
}

const expected = ['stage-01-erased-harbor-far-v1', 'stage-01-erased-harbor-mid-v1', 'stage-01-erased-harbor-fore-v1', 'stage-01-sprites-v1', 'stage-01-canvas-effects-v1'];
for (const id of expected) if (!ids.has(id)) throw new Error(`required Stage 1 asset is unregistered: ${id}`);
console.log(`asset audit passed: ${manifest.assets.length} final project-original entries`);
