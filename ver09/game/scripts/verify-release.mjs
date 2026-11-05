import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const releaseRoot = resolve(gameRoot, '..', 'release', 'candlewick-v9.0');
const required = ['README.txt', 'THIRD_PARTY_NOTICES.md', 'favicon.svg', 'index.html'];

for (const name of required) await access(resolve(releaseRoot, name));
const html = await readFile(resolve(releaseRoot, 'index.html'), 'utf8');
if (!html.includes('<title>CANDLEWICK</title>')) throw new Error('Release title is missing.');
if (!html.match(/assets\/index-[^"']+\.js/)) throw new Error('Hashed JavaScript bundle is missing.');
if (!html.match(/assets\/index-[^"']+\.css/)) throw new Error('Hashed stylesheet is missing.');

const assets = await readdir(resolve(releaseRoot, 'assets'));
if (!assets.some((name) => extname(name) === '.js')) throw new Error('No JavaScript asset found.');
if (!assets.some((name) => extname(name) === '.css')) throw new Error('No CSS asset found.');

async function totalBytes(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    total += entry.isDirectory() ? await totalBytes(path) : (await stat(path)).size;
  }
  return total;
}

const bytes = await totalBytes(releaseRoot);
if (bytes > 500_000) throw new Error(`Release exceeds 500 KB: ${bytes} bytes.`);
console.log(`Release verified: ${required.length + assets.length} files, ${bytes} bytes`);
