import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(gameRoot, '../..');
const distRoot = resolve(gameRoot, 'dist');
const legacyDistRoot = resolve(repositoryRoot, 'ver03.4/game/dist');
const releaseSnapshotRoot = await mkdtemp(resolve(tmpdir(), 'palimpsest-wake-release-'));
const legacyRoutes = ['v3', 'v3.1', 'v3.2', 'v3.3', 'v3.4'];

function currentCommit() {
  if (process.env.RELEASE_COMMIT) return process.env.RELEASE_COMMIT;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

async function requireFile(path, description) {
  try {
    await readFile(path);
  } catch {
    throw new Error(`${description} is missing: ${path}`);
  }
}

await requireFile(resolve(distRoot, 'index.html'), 'v4 production build');
await requireFile(resolve(legacyDistRoot, 'v3.4/index.html'), 'preserved v3.4 build');

try {
  await cp(distRoot, releaseSnapshotRoot, { recursive: true });
  await cp(releaseSnapshotRoot, resolve(distRoot, 'v4.0'), { recursive: true });

  for (const route of legacyRoutes) {
    await cp(resolve(legacyDistRoot, route), resolve(distRoot, route), { recursive: true });
  }

  const metadata = `${JSON.stringify({
    product: 'PALIMPSEST WAKE',
    version: 'v4.0',
    commit: currentCommit(),
  }, null, 2)}\n`;
  await Promise.all([
    writeFile(resolve(distRoot, 'release.json'), metadata),
    writeFile(resolve(distRoot, 'v4.0/release.json'), metadata),
    writeFile(resolve(distRoot, '.nojekyll'), ''),
  ]);
} finally {
  await rm(releaseSnapshotRoot, { recursive: true, force: true });
}

console.log('Packaged v4.0 at / and /v4.0; preserved /v3.4, /v3.3, /v3.2, /v3.1, and /v3');
