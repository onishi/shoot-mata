import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const evidence = join(root, '..', 'docs', 'm5-release-manifest.json');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, 'index.html'), join(dist, 'index.html'));
await cp(join(root, 'src'), join(dist, 'src'), { recursive: true });

async function walk(directory, prefix = '') {
  const files = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path, relative));
    else files.push({ relative, path });
  }
  return files;
}

const files = [];
for (const file of await walk(dist)) {
  const contents = await readFile(file.path);
  files.push({
    path: file.relative,
    bytes: (await stat(file.path)).size,
    sha256: createHash('sha256').update(contents).digest('hex')
  });
}
const manifest = {
  schema: 1,
  product: 'RINGWARD',
  version: 'v13.2',
  buildCommand: 'npm run build:clean',
  cleanBuild: true,
  fileCount: files.length,
  totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  files
};
await writeFile(evidence, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Recorded ${manifest.fileCount} clean files (${manifest.totalBytes} bytes)`);
