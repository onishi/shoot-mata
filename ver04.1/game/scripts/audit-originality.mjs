import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';

const gameRoot = resolve(import.meta.dirname, '..');
const versionRoot = resolve(gameRoot, '..');
const repositoryRoot = resolve(versionRoot, '..');
const evidenceRoot = resolve(versionRoot, 'docs/evidence');
const pastVersions = ['ver01', 'ver02', 'ver03', 'ver03.1', 'ver03.2', 'ver03.3', 'ver03.4'];
const ignoredSegments = new Set(['node_modules', 'dist', 'test-results', '.git']);
const productionExtensions = new Set(['.ts', '.css', '.html', '.png', '.wav']);

const walk = async (directory) => {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignoredSegments.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(path));
    else if (productionExtensions.has(extname(entry.name))) result.push(path);
  }
  return result;
};

const digest = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
const currentFiles = [
  ...await walk(resolve(gameRoot, 'src')),
  ...await walk(resolve(gameRoot, 'public')),
  resolve(gameRoot, 'index.html')
];
const pastFiles = (await Promise.all(pastVersions.map(async (version) => walk(resolve(repositoryRoot, version))))).flat();
const pastHashes = new Map();
for (const path of pastFiles) {
  const hash = await digest(path);
  const paths = pastHashes.get(hash) ?? [];
  paths.push(relative(repositoryRoot, path));
  pastHashes.set(hash, paths);
}

const matches = [];
for (const path of currentFiles) {
  const hash = await digest(path);
  if (pastHashes.has(hash)) matches.push({ current: relative(repositoryRoot, path), past: pastHashes.get(hash) });
}
if (matches.length > 0) throw new Error(`past-version files reused verbatim:\n${JSON.stringify(matches, null, 2)}`);

const manifest = JSON.parse(await readFile(resolve(gameRoot, 'assets/manifest.json'), 'utf8'));
const invalidProvenance = manifest.assets.filter((asset) => asset.license !== 'project-original' || !asset.sourcePrompt || !asset.createdBy);
if (invalidProvenance.length > 0) throw new Error(`assets lack original provenance: ${invalidProvenance.map((asset) => asset.id).join(', ')}`);

const report = {
  auditedAt: '2026-11-01',
  currentProductionFiles: currentFiles.length,
  pastProductionFiles: pastFiles.length,
  pastVersions,
  exactHashMatches: matches.length,
  manifestEntries: manifest.assets.length,
  projectOriginalEntries: manifest.assets.filter((asset) => asset.license === 'project-original').length
};
await writeFile(resolve(evidenceRoot, 'm4-06-originality-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`originality audit passed: ${report.currentProductionFiles} v4 production files; 0 exact matches across ${report.pastProductionFiles} past-version files; ${report.projectOriginalEntries} project-original manifest entries`);
