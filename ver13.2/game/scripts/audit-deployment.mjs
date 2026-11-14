import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [urlArgument] = process.argv.slice(2);
if (!urlArgument) throw new Error('usage: node scripts/audit-deployment.mjs <release-url>');
const auditUrl = new URL(urlArgument.endsWith('/') ? urlArgument : `${urlArgument}/`).href;
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const evidenceDir = join(root, '..', 'docs');
const chromePath = process.env.RINGWARD_CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = `/private/tmp/ringward-production-${process.pid}`;
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

assert.ok(existsSync(chromePath), `Chrome not found at ${chromePath}`);
await mkdir(profile, { recursive: true });
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,720', auditUrl
], { stdio: 'ignore' });

try {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 200 && !existsSync(portFile); attempt += 1) await sleep(50);
  assert.ok(existsSync(portFile), 'Chrome DevTools port did not appear');
  const port = (await readFile(portFile, 'utf8')).trim().split('\n')[0];
  let tab;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
    tab = tabs.find(candidate => candidate.url === auditUrl);
    if (tab) break;
    await sleep(50);
  }
  assert.ok(tab, 'Production game tab did not open');
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let commandId = 0;
  const pending = new Map();
  const consoleErrors = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const task = pending.get(message.id); pending.delete(message.id);
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown'
      || (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type))) consoleErrors.push(message);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++commandId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
  const press = async (code, key, windowsVirtualKeyCode) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key, windowsVirtualKeyCode });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key, windowsVirtualKeyCode });
  };
  const state = () => evaluate(`JSON.parse(document.querySelector('#game').dataset.gameState)`);
  const waitForMode = async (mode, timeout = 10000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const current = await state();
      if (current?.mode === mode) return current;
      await sleep(100);
    }
    throw new Error(`Timed out waiting for ${mode}`);
  };

  await send('Runtime.enable');
  await send('Page.enable');
  let title = '';
  const titleDeadline = Date.now() + 10000;
  while (Date.now() < titleDeadline) {
    title = await evaluate('document.title') ?? '';
    if (title === 'RINGWARD v13.2') break;
    await sleep(100);
  }
  assert.equal(title, 'RINGWARD v13.2');
  const attract = await waitForMode('attract', 8000);
  await press('KeyC', 'c', 67);
  const start = await waitForMode('startWait');
  await press('KeyN', 'n', 78);
  const playing = await waitForMode('playing');
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(join(evidenceDir, 'm5-production-start-1280x720.png'), Buffer.from(shot.data, 'base64'));
  assert.equal(playing.wave, 0);
  assert.equal(playing.credits, 0);
  assert.equal(consoleErrors.length, 0);
  const report = {
    schema: 1,
    auditedAt: new Date().toISOString(),
    url: auditUrl,
    title: 'RINGWARD v13.2',
    path: [attract.mode, start.mode, playing.mode],
    wave: playing.wave + 1,
    bell: playing.bell,
    consoleErrors: consoleErrors.length
  };
  await writeFile(join(evidenceDir, 'm5-production-runtime-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Production cabinet path: ${report.path.join(' -> ')}, wave ${report.wave}, BELL ${report.bell}, console errors 0`);
  socket.close();
} finally {
  if (chrome.exitCode === null) chrome.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
