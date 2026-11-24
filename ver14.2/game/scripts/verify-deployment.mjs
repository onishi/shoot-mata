import { createHash } from 'node:crypto';

const [baseArgument, expectedCommit] = process.argv.slice(2);
if (!baseArgument || !expectedCommit) throw new Error('usage: node scripts/verify-deployment.mjs <pages-url> <expected-commit>');
const base = new URL(baseArgument.endsWith('/') ? baseArgument : `${baseArgument}/`);
const routes = ['', 'v14.2/', 'v14.1/', 'v14.0/', 'v13.2/', 'v13.1/', 'v13.0/', 'v12.2/', 'v5/', 'v4.2/', 'v4.1/', 'v4.0/', 'v3.4/', 'v3.3/', 'v3.2/', 'v3.1/', 'v3/'];

async function fetchOk(path) {
  const url = new URL(path, base);
  const response = await fetch(url, { redirect: 'follow', cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return { url, response, bytes: Buffer.from(await response.arrayBuffer()) };
}
const pages = new Map();
for (const route of routes) pages.set(route, await fetchOk(route));
for (const [route, version] of [['', '14.2'], ['v14.2/', '14.2'], ['v14.1/', '14.1'], ['v14.0/', '14.0']]) {
  if (!pages.get(route).bytes.toString().includes(`<title>TIDEBREAK 95 v${version}</title>`)) throw new Error(`${route || '/'} has the wrong version`);
}
if (!pages.get('v13.2/').bytes.toString().includes('RINGWARD')) throw new Error('/v13.2/ was not preserved');

const release = JSON.parse((await fetchOk('release.json')).bytes.toString());
if (release.version !== 'v14.2' || release.commit !== expectedCommit) throw new Error('root release metadata does not match the deployment commit');
const versionedRelease = JSON.parse((await fetchOk('v14.2/release.json')).bytes.toString());
if (versionedRelease.commit !== expectedCommit) throw new Error('/v14.2 release metadata does not match the deployment commit');
for (const file of release.manifest.files) {
  for (const prefix of ['', 'v14.2/']) {
    const item = await fetchOk(`${prefix}${file.path}`);
    if (createHash('sha256').update(item.bytes).digest('hex') !== file.sha256) throw new Error(`${prefix}${file.path} hash differs from release manifest`);
    const mime = item.response.headers.get('content-type') ?? '';
    if (file.path.endsWith('.js') && !/javascript/.test(mime)) throw new Error(`${item.url} has wrong JavaScript MIME`);
    if (file.path.endsWith('.css') && !/text\/css/.test(mime)) throw new Error(`${item.url} has wrong CSS MIME`);
    if (file.path.endsWith('.svg') && !/image\/svg\+xml/.test(mime)) throw new Error(`${item.url} has wrong SVG MIME`);
  }
}
console.log(`Deployment verified at ${base}: ${routes.length} routes, commit ${expectedCommit}, ${release.manifest.fileCount * 2} hashed responses`);
