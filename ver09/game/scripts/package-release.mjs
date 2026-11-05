import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = resolve(gameRoot, 'dist');
const releaseRoot = resolve(gameRoot, '..', 'release', 'candlewick-v9.0');

const guide = `CANDLEWICK v9.0\n\nOpen index.html through a static web server in Google Chrome.\n\nControls\n- Arrow keys or WASD: move\n- Hold Space: widen the lamp\n- Escape: pause\n- R: retry the current room\n- S on the title: settings\n\nThe game stores unlocked rooms and accessibility preferences in localStorage.\n`;

await readFile(resolve(distRoot, 'index.html'), 'utf8');
await rm(releaseRoot, { recursive: true, force: true });
await mkdir(releaseRoot, { recursive: true });
await cp(distRoot, releaseRoot, { recursive: true });
await writeFile(resolve(releaseRoot, 'README.txt'), guide, 'utf8');
await cp(resolve(gameRoot, 'public', 'THIRD_PARTY_NOTICES.md'), resolve(releaseRoot, 'THIRD_PARTY_NOTICES.md'));
console.log(`Packaged ${releaseRoot}`);
