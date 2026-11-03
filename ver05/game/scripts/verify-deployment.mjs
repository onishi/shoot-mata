const [baseArgument, expectedCommit] = process.argv.slice(2);
if (!baseArgument || !expectedCommit) {
  throw new Error('usage: node scripts/verify-deployment.mjs <pages-url> <expected-commit>');
}

const baseUrl = new URL(baseArgument.endsWith('/') ? baseArgument : `${baseArgument}/`);
const routes = ['', 'v5/', 'v4.2/', 'v4.1/', 'v4.0/', 'v3.4/', 'v3.3/', 'v3.2/', 'v3.1/', 'v3/'];

async function fetchOk(path) {
  const url = new URL(path, baseUrl);
  const response = await fetch(url, { redirect: 'follow', cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return { url, response, body: await response.text() };
}

const pages = new Map();
for (const route of routes) pages.set(route, await fetchOk(route));

for (const route of ['', 'v5/']) {
  const page = pages.get(route);
  if (!page.body.includes('CHORUS SHIFT — v5.0</title>')) throw new Error(`${page.url} does not identify v5.0`);
  const release = JSON.parse((await fetchOk(`${route}release.json`)).body);
  if (release.version !== 'v5.0' || release.commit !== expectedCommit) {
    throw new Error(`${page.url} release metadata does not match ${expectedCommit}`);
  }
}

if (!pages.get('v4.2/').body.includes('PALIMPSEST WAKE — v4.2</title>')) {
  throw new Error('/v4.2/ does not preserve the previous release');
}

const rootHtml = pages.get('').body;
const assetPaths = [...rootHtml.matchAll(/(?:src|href)="(\.\/assets\/[^"]+\.(?:js|css))"/g)].map((match) => match[1]);
if (assetPaths.length < 2) throw new Error('could not find the v5 JavaScript and CSS assets');
for (const assetPath of assetPaths) {
  const { response, url } = await fetchOk(assetPath);
  const contentType = response.headers.get('content-type') ?? '';
  const expected = assetPath.endsWith('.js') ? /javascript/ : /text\/css/;
  if (!expected.test(contentType)) throw new Error(`${url} returned unexpected MIME ${contentType}`);
}

console.log(`Deployment verified at ${baseUrl}: ${routes.length} routes, v5.0 commit ${expectedCommit}, ${assetPaths.length} typed assets`);
