import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(gameRoot, 'dist');
const manifest = JSON.parse(await readFile(join(gameRoot, '..', 'docs', 'm5-release-manifest.json'), 'utf8'));
const routes = ['.', 'v14.2', 'v14.1', 'v14.0', 'v13.2', 'v13.1', 'v13.0', 'v12.2', 'v5', 'v4.2', 'v4.1', 'v4.0', 'v3.4', 'v3.3', 'v3.2', 'v3.1', 'v3'];

for (const route of routes) {
  const html = await readFile(join(dist, route, 'index.html'), 'utf8');
  if (!html.includes('<title>')) throw new Error(`${route} has no title`);
}
for (const [route, version] of [['.', '14.2'], ['v14.2', '14.2'], ['v14.1', '14.1'], ['v14.0', '14.0']]) {
  const html = await readFile(join(dist, route, 'index.html'), 'utf8');
  if (!html.includes(`<title>TIDEBREAK 95 v${version}</title>`)) throw new Error(`${route} has the wrong TIDEBREAK version`);
}
if (!(await readFile(join(dist, 'v13.2/index.html'), 'utf8')).includes('RINGWARD')) throw new Error('v13.2 is not preserved');

for (const file of manifest.files) {
  for (const prefix of ['', 'v14.2']) {
    const contents = await readFile(join(dist, prefix, file.path));
    if (createHash('sha256').update(contents).digest('hex') !== file.sha256) throw new Error(`${prefix || 'root'} hash mismatch for ${file.path}`);
  }
}
async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path)); else files.push(path);
  }
  return files;
}
const currentFiles = await walk(join(dist, 'v14.2'));
for (const file of currentFiles) {
  if (!new Set(['.html', '.js', '.css', '.svg', '.json']).has(extname(file))) throw new Error(`unexpected asset type: ${file}`);
  if (!['.html', '.js', '.css', '.svg'].includes(extname(file))) continue;
  const external = (await readFile(file, 'utf8')).match(/(?:https?:)?\/\/[^\s"'`)]+/g) ?? [];
  if (external.some(url => !url.includes('www.w3.org/2000/svg'))) throw new Error(`external runtime URL in ${file}`);
}
const bytes = (await Promise.all(currentFiles.map(async file => (await stat(file)).size))).reduce((sum, size) => sum + size, 0);
if (bytes > 1_000_000) throw new Error(`v14.2 exceeds 1 MB: ${bytes}`);
console.log(`Release artifact verified: ${routes.length} routes, ${manifest.fileCount} hashed files, v14.2 payload ${bytes} bytes`);
