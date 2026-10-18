import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'

const DEFAULT_URL = 'https://onishi.github.io/shoot-mata/'
const targetUrl = new URL(process.env.SHOOT_MATA_URL ?? DEFAULT_URL)
const timeoutMs = 15_000

async function fetchAsset(url, expectedType, maxBytes) {
  const startedAt = performance.now()
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'user-agent': 'shoot-mata-production-smoke/1.0' },
  })
  const body = new Uint8Array(await response.arrayBuffer())
  const elapsedMs = Math.round(performance.now() - startedAt)
  const contentType = response.headers.get('content-type') ?? ''

  assert.equal(response.status, 200, `${url} must return 200`)
  assert.match(contentType, expectedType, `${url} has unexpected content-type: ${contentType}`)
  assert.ok(body.byteLength <= maxBytes, `${url} exceeds ${maxBytes} bytes`)

  return {
    url: response.url,
    status: response.status,
    contentType,
    bytes: body.byteLength,
    elapsedMs,
    text: new TextDecoder().decode(body),
  }
}

function referencedAssets(html) {
  return [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => new URL(match[1], targetUrl))
    .filter((url) => /\.(?:css|js|svg)$/.test(url.pathname))
}

const documentResult = await fetchAsset(targetUrl, /text\/html/i, 64 * 1024)
assert.match(documentResult.text, /<title>SWITCHBACK — Stage 01<\/title>/)
assert.match(documentResult.text, /公開版 v1\.0\.0/)
assert.match(documentResult.text, /https:\/\/onishi\.github\.io\/shoot-mata\//)

const assets = referencedAssets(documentResult.text)
assert.ok(assets.some((url) => url.pathname.endsWith('.js')), 'JavaScript asset is missing')
assert.ok(assets.some((url) => url.pathname.endsWith('.css')), 'CSS asset is missing')
assert.ok(assets.some((url) => url.pathname.endsWith('favicon.svg')), 'favicon is missing')

for (const asset of assets) {
  assert.equal(asset.origin, targetUrl.origin, `external asset is not allowed: ${asset}`)
}

const assetResults = []
for (const asset of assets) {
  const extension = asset.pathname.split('.').pop()
  const expectations = {
    js: [/javascript/i, 250 * 1024],
    css: [/text\/css/i, 100 * 1024],
    svg: [/image\/svg\+xml/i, 32 * 1024],
  }
  const [expectedType, maxBytes] = expectations[extension]
  assetResults.push(await fetchAsset(asset, expectedType, maxBytes))
}

const staticResults = await Promise.all([
  fetchAsset(new URL('og-image.png', targetUrl), /image\/png/i, 1_500 * 1024),
  fetchAsset(new URL('THIRD_PARTY_NOTICES.md', targetUrl), /(?:text\/markdown|text\/plain)/i, 512 * 1024),
])

const results = [documentResult, ...assetResults, ...staticResults].map(({ text, ...result }) => result)
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), target: targetUrl.href, results }, null, 2))
