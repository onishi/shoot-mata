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
const chromePath = process.env.TIDEBREAK_CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = `/private/tmp/tidebreak-production-${process.pid}`;
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

assert.ok(existsSync(chromePath), `Chrome not found at ${chromePath}`);
await mkdir(profile, { recursive: true });
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--window-size=1280,720', auditUrl
], { stdio: 'ignore' });

try {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 200 && !existsSync(portFile); attempt += 1) await sleep(50);
  assert.ok(existsSync(portFile), 'Chrome DevTools port did not appear');
  const port = (await readFile(portFile, 'utf8')).trim().split('\n')[0];
  let tab;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
    tab = tabs.find(candidate => candidate.type === 'page');
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
  const state = () => evaluate('window.__TIDEBREAK__?.getState()');

  await send('Runtime.enable');
  await send('Page.enable');
  const deadline = Date.now() + 15000;
  let title = '';
  let initial;
  while (Date.now() < deadline) {
    title = await evaluate('document.title') ?? '';
    initial = await state();
    if (title === 'TIDEBREAK 95 v14.2' && initial?.mode === 'title') break;
    await sleep(100);
  }
  assert.equal(title, 'TIDEBREAK 95 v14.2');
  assert.equal(initial?.mode, 'title');
  await press('Enter', 'Enter', 13);
  let playing;
  const playDeadline = Date.now() + 10000;
  while (Date.now() < playDeadline) {
    playing = await state();
    if (playing?.mode === 'playing' && playing.time > 1) break;
    await sleep(100);
  }
  assert.equal(playing?.mode, 'playing');
  assert.ok(playing.time > 1, 'Production game time did not advance');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'ArrowRight', key: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await sleep(350);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'ArrowRight', key: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await press('Space', ' ', 32);
  await sleep(300);
  const active = await state();
  assert.ok(active.time > playing.time, 'Production runtime stopped after input');
  assert.ok(active.boatV > 0, 'Production steering input did not reach the game');
  assert.ok(active.surgeTime > 0, 'Production surge input did not reach the game');
  assert.equal(consoleErrors.length, 0);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(join(evidenceDir, 'm5-production-start-1280x720.png'), Buffer.from(shot.data, 'base64'));
  const report = {
    schema: 1,
    auditedAt: new Date().toISOString(),
    url: auditUrl,
    title,
    path: [initial.mode, active.mode],
    authoredTime: active.time,
    hull: active.hull,
    steeringVelocity: active.boatV,
    surgeTime: active.surgeTime,
    consoleErrors: consoleErrors.length
  };
  await writeFile(join(evidenceDir, 'm5-production-runtime-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Production path: ${report.path.join(' -> ')}, time ${report.authoredTime.toFixed(3)}s, steering ${report.steeringVelocity.toFixed(3)}, surge ${report.surgeTime.toFixed(3)}, console errors 0`);
  socket.close();
} finally {
  if (chrome.exitCode === null) chrome.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
