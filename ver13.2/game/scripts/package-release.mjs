import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryRoot = resolve(gameRoot, '../..');
const distRoot = join(gameRoot, 'dist');
const previousDist = join(repositoryRoot, 'ver12.2/game/dist');
const snapshot = await mkdtemp(join(tmpdir(), 'ringward-release-'));
const preservedRoutes = ['v12.2', 'v5', 'v4.2', 'v4.1', 'v4.0', 'v3.4', 'v3.3', 'v3.2', 'v3.1', 'v3'];

function currentCommit() {
  if (process.env.RELEASE_COMMIT) return process.env.RELEASE_COMMIT;
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
}

async function requireFile(path, description) {
  try { await readFile(path); }
  catch { throw new Error(`${description} is missing: ${path}`); }
}

async function copyStaticVersion(sourceRoot, targetRoot) {
  await mkdir(targetRoot, { recursive: true });
  await cp(join(sourceRoot, 'index.html'), join(targetRoot, 'index.html'));
  await cp(join(sourceRoot, 'src'), join(targetRoot, 'src'), { recursive: true });
}

await requireFile(join(distRoot, 'index.html'), 'v13.2 clean build');
for (const route of preservedRoutes) await requireFile(join(previousDist, route, 'index.html'), `preserved ${route}`);

try {
  await cp(distRoot, snapshot, { recursive: true });
  await cp(snapshot, join(distRoot, 'v13.2'), { recursive: true });
  await copyStaticVersion(join(repositoryRoot, 'ver13/game'), join(distRoot, 'v13.0'));
  await copyStaticVersion(join(repositoryRoot, 'ver13.1/game'), join(distRoot, 'v13.1'));
  for (const route of preservedRoutes) await cp(join(previousDist, route), join(distRoot, route), { recursive: true });

  const manifest = JSON.parse(await readFile(join(repositoryRoot, 'ver13.2/docs/m5-release-manifest.json'), 'utf8'));
  const commit = currentCommit();
  for (const [route, version] of [['.', 'v13.2'], ['v13.2', 'v13.2'], ['v13.1', 'v13.1'], ['v13.0', 'v13.0']]) {
    const metadata = { product: 'RINGWARD', version, commit };
    if (version === 'v13.2') metadata.manifest = manifest;
    await writeFile(join(distRoot, route, 'release.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  }
  await writeFile(join(distRoot, '.nojekyll'), '');
} finally {
  await rm(snapshot, { recursive: true, force: true });
}

console.log(`Packaged RINGWARD at / and /v13.2/; preserved /v13.1/, /v13.0/, ${preservedRoutes.map(route => `/${route}/`).join(', ')}`);
