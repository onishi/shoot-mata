import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const evidenceDir = join(root, '..', 'docs');
const chromePath = process.env.RINGWARD_CHROME_PATH
  ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = `/private/tmp/ringward-cabinet-${process.pid}`;
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const directionTo = (from, to) => {
  const clockwise = (to - from + 16) % 16;
  return clockwise === 0 ? 0 : clockwise <= 8 ? 1 : -1;
};
const reservePort = () => new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const { port } = probe.address();
    probe.close(error => error ? reject(error) : resolve(port));
  });
});

async function waitForFile(path) {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    if (existsSync(path)) return;
    await sleep(50);
  }
  throw new Error(`Timed out waiting for ${path}`);
}

async function main() {
  assert.ok(existsSync(chromePath), `Chrome not found at ${chromePath}`);
  await mkdir(profile, { recursive: true });
  const auditPort = await reservePort();
  const auditUrl = `http://127.0.0.1:${auditPort}/`;
  const server = spawn('python3', ['-m', 'http.server', String(auditPort), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await fetch(auditUrl, { signal: AbortSignal.timeout(500) });
      break;
    } catch { await sleep(100); }
  }

  const chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,720',
    auditUrl
  ], { stdio: 'ignore' });

  try {
    const portFile = join(profile, 'DevToolsActivePort');
    await waitForFile(portFile);
    const port = (await readFile(portFile, 'utf8')).trim().split('\n')[0];
    let tab;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
      tab = tabs.find(candidate => candidate.url === auditUrl);
      if (tab) break;
      await sleep(50);
    }
    assert.ok(tab, 'Game tab did not open');

    const socket = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0;
    const pending = new Map();
    const consoleErrors = [];
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const task = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) task.reject(new Error(message.error.message));
        else task.resolve(message.result);
      } else if (message.method === 'Runtime.exceptionThrown'
        || (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type))) {
        consoleErrors.push(message);
      }
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const commandId = ++id;
      pending.set(commandId, { resolve, reject });
      socket.send(JSON.stringify({ id: commandId, method, params }));
    });
    const keys = {
      KeyC: ['c', 67], KeyN: ['n', 78], Space: [' ', 32], Enter: ['Enter', 13],
      ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39]
    };
    const press = async code => {
      const [key, windowsVirtualKeyCode] = keys[code];
      await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key, windowsVirtualKeyCode });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key, windowsVirtualKeyCode });
    };
    const readState = async () => {
      const result = await send('Runtime.evaluate', {
        expression: `JSON.parse(document.querySelector('#game').dataset.gameState)`, returnByValue: true
      });
      return result.result.value;
    };
    const waitForMode = async (mode, timeout = 30000) => {
      const started = Date.now();
      while (Date.now() - started < timeout) {
        const state = await readState();
        if (state.mode === mode) return state;
        await sleep(100);
      }
      throw new Error(`Timed out waiting for ${mode}`);
    };
    const screenshot = async name => {
      const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(join(evidenceDir, name), Buffer.from(result.data, 'base64'));
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await sleep(500);
    const title = await send('Runtime.evaluate', { expression: 'document.title', returnByValue: true });
    assert.match(title.result.value, /v13\.1$/, `Audit opened the wrong build: ${title.result.value}`);
    await sleep(700);
    await press('KeyC');
    await press('KeyN');
    const firstOffer = await waitForMode('continue');
    await screenshot('m4-continue-offer-1280x720.png');
    assert.ok(firstOffer.continueTime > 0 && firstOffer.continueTime <= 10);

    await press('KeyC');
    await press('Enter');
    const resumed = await waitForMode('playing');
    assert.equal(resumed.wave, 0);
    assert.equal(resumed.bell, 3);
    assert.equal(resumed.credits, 0);

    await waitForMode('continue');
    await press('KeyN');
    await waitForMode('nameEntry');
    await press('ArrowRight');
    await press('Space');
    await press('ArrowRight');
    await press('Space');
    await press('ArrowRight');
    await press('Space');
    const ranking = await waitForMode('ranking');
    await screenshot('m4-ranking-1280x720.png');
    assert.equal(ranking.rankings[0].initials, 'BBB');
    assert.equal(ranking.rankings.length, 1);
    await press('Space');
    const returned = await waitForMode('attract');
    assert.equal(returned.credits, 0);
    assert.equal(consoleErrors.length, 0);

    // Re-enter with product keys and clear the introductory procession so the
    // rule strip is captured after the cabinet-flow assertions, without state
    // injection or relying on a stale screenshot from another build.
    await press('KeyC');
    await waitForMode('startWait');
    await press('KeyN');
    await waitForMode('playing');
    const briefDeadline = Date.now() + 60000;
    let brief;
    while (Date.now() < briefDeadline) {
      const state = await readState();
      if (state.mode === 'waveBrief') { brief = state; break; }
      if (state.mode !== 'playing') throw new Error(`Unexpected onboarding mode ${state.mode}`);
      const targetSlot = state.hammer?.slot ?? [...state.enemies].sort((a, b) => a.distance - b.distance)[0]?.slot;
      const direction = directionTo(state.playerSlot, targetSlot);
      if (direction < 0) await press('ArrowLeft');
      else if (direction > 0) await press('ArrowRight');
      else if (!state.hammer) await press('Space');
      await sleep(90);
    }
    assert.equal(brief?.mode, 'waveBrief', 'First procession must reach its rule brief');
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    await sleep(120);
    await screenshot('m4-quality-wave-brief-1280x720.png');
    await send('Emulation.setDeviceMetricsOverride', { width: 640, height: 480, deviceScaleFactor: 1, mobile: false });
    await sleep(120);
    await screenshot('m4-quality-wave-brief-640x480.png');

    const report = {
      schema: 1,
      auditedAt: new Date().toISOString(),
      scope: 'Fresh Chrome profile; product C/N/Enter/arrow/Space inputs only.',
      continueOfferSeconds: Number(firstOffer.continueTime.toFixed(2)),
      resumedWave: resumed.wave + 1,
      resumedBell: resumed.bell,
      ranking: ranking.rankings,
      returnedMode: returned.mode,
      ruleBriefCaptured: true,
      consoleErrors: consoleErrors.length
    };
    await writeFile(join(evidenceDir, 'm4-cabinet-flow-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`cabinet flow: continue wave ${report.resumedWave}, ${ranking.rankings[0].initials} ranked, attract restored, ${consoleErrors.length} console errors`);
    socket.close();
  } finally {
    if (chrome.exitCode === null) {
      const exited = new Promise(resolve => {
        chrome.once('exit', resolve);
        setTimeout(resolve, 2000);
      });
      chrome.kill('SIGTERM');
      await exited;
    }
    if (server && server.exitCode === null) server.kill('SIGTERM');
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        break;
      } catch (error) {
        if (attempt === 3) throw error;
        await sleep(250);
      }
    }
  }
}

await main();
