import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const distRoot = resolve(import.meta.dirname, '..', 'dist');
const currentRoutes = ['.', 'v5'];
const preservedRoutes = ['v4.2', 'v4.1', 'v4.0', 'v3.4', 'v3.3', 'v3.2', 'v3.1', 'v3'];
const routes = [...currentRoutes, ...preservedRoutes];

for (const route of routes) {
  const index = await readFile(resolve(distRoot, route, 'index.html'), 'utf8');
  if (!index.includes('<title>')) throw new Error(`${route} has no document title`);
}

for (const route of currentRoutes) {
  const root = resolve(distRoot, route);
  const index = await readFile(resolve(root, 'index.html'), 'utf8');
  if (!index.includes('CHORUS SHIFT — v5.1</title>')) throw new Error(`${route} does not identify v5.1`);
  const metadata = JSON.parse(await readFile(resolve(root, 'release.json'), 'utf8'));
  if (metadata.product !== 'CHORUS SHIFT' || metadata.version !== 'v5.1' || !metadata.commit) {
    throw new Error(`${route} has invalid release metadata`);
  }
  const notices = await readFile(resolve(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
  if (!notices.includes('does not include third-party runtime')) throw new Error(`${route} has no production asset notice`);
}

const allowedExtensions = new Set(['.html', '.js', '.css', '.json', '.md', '']);
async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const currentFiles = await walk(resolve(distRoot, 'v5'));
for (const file of currentFiles) {
  if (!allowedExtensions.has(extname(file))) throw new Error(`unexpected production asset type: ${file}`);
  if (!['.html', '.js', '.css'].includes(extname(file))) continue;
  const content = await readFile(file, 'utf8');
  const external = content.match(/(?:https?:)?\/\/[^\s"'`)]+/g) ?? [];
  const nonNamespaceUrls = external.filter((url) => !url.includes('www.w3.org/2000/svg'));
  if (nonNamespaceUrls.length > 0) throw new Error(`external runtime URL in ${file}: ${nonNamespaceUrls.join(', ')}`);
}

const assetDirectory = await stat(resolve(distRoot, 'v5/assets'));
if (!assetDirectory.isDirectory()) throw new Error('/v5/assets is not a directory');
const totalBytes = (await Promise.all(currentFiles.map(async (file) => (await stat(file)).size))).reduce((sum, size) => sum + size, 0);
if (totalBytes > 1_000_000) throw new Error(`v5 payload exceeds 1 MB: ${totalBytes} bytes`);

console.log(`Release artifact verified: ${routes.map((route) => route === '.' ? '/' : `/${route}/`).join(', ')}; v5 payload ${totalBytes} bytes; no external runtime URLs`);
