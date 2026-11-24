import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryRoot = resolve(gameRoot, '../..');
const distRoot = join(gameRoot, 'dist');
const previousDist = join(repositoryRoot, 'ver13.2/game/dist');
const snapshot = await mkdtemp(join(tmpdir(), 'tidebreak-release-'));
const preservedRoutes = ['v13.2', 'v13.1', 'v13.0', 'v12.2', 'v5', 'v4.2', 'v4.1', 'v4.0', 'v3.4', 'v3.3', 'v3.2', 'v3.1', 'v3'];

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
  for (const name of ['index.html', 'favicon.svg']) await cp(join(sourceRoot, name), join(targetRoot, name));
  await cp(join(sourceRoot, 'src'), join(targetRoot, 'src'), { recursive: true });
}

await requireFile(join(distRoot, 'index.html'), 'v14.2 clean build');
for (const route of preservedRoutes) await requireFile(join(previousDist, route, 'index.html'), `preserved ${route}`);

try {
  await cp(distRoot, snapshot, { recursive: true });
  await cp(snapshot, join(distRoot, 'v14.2'), { recursive: true });
  await copyStaticVersion(join(repositoryRoot, 'ver14/game'), join(distRoot, 'v14.0'));
  await copyStaticVersion(join(repositoryRoot, 'ver14.1/game'), join(distRoot, 'v14.1'));
  for (const route of preservedRoutes) await cp(join(previousDist, route), join(distRoot, route), { recursive: true });

  const manifest = JSON.parse(await readFile(join(repositoryRoot, 'ver14.2/docs/m5-release-manifest.json'), 'utf8'));
  const commit = currentCommit();
  for (const [route, version] of [['.', 'v14.2'], ['v14.2', 'v14.2'], ['v14.1', 'v14.1'], ['v14.0', 'v14.0']]) {
    const metadata = { product: 'TIDEBREAK 95', version, commit };
    if (version === 'v14.2') metadata.manifest = manifest;
    await writeFile(join(distRoot, route, 'release.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  }
  await writeFile(join(distRoot, '.nojekyll'), '');
} finally {
  await rm(snapshot, { recursive: true, force: true });
}
console.log(`Packaged TIDEBREAK 95 at / and /v14.2/ with ${preservedRoutes.length + 2} preserved version routes`);
