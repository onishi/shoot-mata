import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const distRoot = resolve(import.meta.dirname, '..', 'dist');
const routes = ['.', 'v4.1', 'v4.0', 'v3.4', 'v3.3', 'v3.2', 'v3.1', 'v3'];

for (const route of routes) {
  const indexPath = resolve(distRoot, route, 'index.html');
  const index = await readFile(indexPath, 'utf8');
  if (!index.includes('<title>')) throw new Error(`${route} has no document title`);
}

for (const route of ['.', 'v4.1']) {
  const index = await readFile(resolve(distRoot, route, 'index.html'), 'utf8');
  if (!index.includes('PALIMPSEST WAKE — v4.1</title>')) {
    throw new Error(`${route} does not identify the v4.1 release`);
  }

  const metadata = JSON.parse(await readFile(resolve(distRoot, route, 'release.json'), 'utf8'));
  if (metadata.version !== 'v4.1' || typeof metadata.commit !== 'string' || metadata.commit.length === 0) {
    throw new Error(`${route} has invalid release metadata`);
  }
}

const v40Index = await readFile(resolve(distRoot, 'v4.0/index.html'), 'utf8');
if (!v40Index.includes('PALIMPSEST WAKE — v4.0</title>')) {
  throw new Error('/v4.0 does not preserve the v4.0 release');
}
const v40Metadata = JSON.parse(await readFile(resolve(distRoot, 'v4.0/release.json'), 'utf8'));
if (v40Metadata.version !== 'v4.0') throw new Error('/v4.0 has invalid release metadata');

const assets = await stat(resolve(distRoot, 'v4.1/assets'));
if (!assets.isDirectory()) throw new Error('/v4.1/assets is not a directory');

console.log(`Release artifact verified: ${routes.map((route) => route === '.' ? '/' : `/${route}/`).join(', ')}`);
