import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const evidenceDir = join(root, '..', 'docs');
const evidencePath = join(evidenceDir, 'm3-browser-campaign-audit.json');
const screenshotPath = join(evidenceDir, 'm3-browser-campaign-ending-1280x720.png');
const chromePath = process.env.RINGWARD_CHROME_PATH
  ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = `/private/tmp/ringward-campaign-${process.pid}`;
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const SLOT_COUNT = 16;

function slotDistance(a, b) {
  const raw = Math.abs(a - b);
  return Math.min(raw, SLOT_COUNT - raw);
}

function directionTo(from, to) {
  const clockwise = (to - from + SLOT_COUNT) % SLOT_COUNT;
  return clockwise === 0 ? 0 : clockwise <= SLOT_COUNT / 2 ? 1 : -1;
}

function projectedSlot(enemy) {
  if (enemy.guardian && enemy.orbitWarning) return (enemy.slot + enemy.orbitDirection + SLOT_COUNT) % SLOT_COUNT;
  if (enemy.kind === 'chorister') return (enemy.slot + enemy.castDirection + SLOT_COUNT) % SLOT_COUNT;
  if (enemy.kind === 'refractor') return (enemy.slot + enemy.turnDirection + SLOT_COUNT) % SLOT_COUNT;
  return enemy.slot;
}

function chooseAction(state) {
  if (state.hammer) {
    const direction = directionTo(state.playerSlot, state.hammer.slot);
    return direction < 0 ? 'ArrowLeft' : direction > 0 ? 'ArrowRight' : null;
  }
  const priority = enemy => {
    const danger = (1.6 - enemy.distance) * 100;
    const role = enemy.kind === 'rusher' ? 32 : enemy.guardian ? 24 : enemy.kind === 'bulwark' ? 10 : 0;
    return danger + role - slotDistance(state.playerSlot, projectedSlot(enemy)) * 2;
  };
  const target = [...state.enemies].sort((a, b) => priority(b) - priority(a))[0];
  if (!target) return null;
  let direction = directionTo(state.playerSlot, projectedSlot(target));
  if (target.kind === 'mirror' && direction) {
    const nextStep = (target.mirrorStep + 1) % 3;
    const distanceAfter = candidate => {
      const player = (state.playerSlot + candidate + SLOT_COUNT) % SLOT_COUNT;
      const mirror = nextStep === 0 ? target.slot : (target.slot - candidate + SLOT_COUNT) % SLOT_COUNT;
      return slotDistance(player, mirror);
    };
    direction = distanceAfter(1) <= distanceAfter(-1) ? 1 : -1;
  }
  if (direction < 0) return 'ArrowLeft';
  if (direction > 0) return 'ArrowRight';
  return target.guardian && target.orbitWarning ? null : 'Space';
}

async function waitForFile(path, attempts = 160) {
  for (let index = 0; index < attempts; index += 1) {
    if (existsSync(path)) return;
    await sleep(50);
  }
  throw new Error(`Timed out waiting for ${path}`);
}

async function main() {
  assert.ok(existsSync(chromePath), `Chrome not found at ${chromePath}; set RINGWARD_CHROME_PATH`);
  await mkdir(profile, { recursive: true });
  let server = null;
  try {
    await fetch('http://127.0.0.1:4173/', { signal: AbortSignal.timeout(500) });
  } catch {
    server = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
    for (let index = 0; index < 40; index += 1) {
      try {
        await fetch('http://127.0.0.1:4173/', { signal: AbortSignal.timeout(500) });
        break;
      } catch {
        await sleep(100);
      }
    }
  }

  const chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,720',
    'http://127.0.0.1:4173/'
  ], { stdio: 'ignore' });

  try {
    const portFile = join(profile, 'DevToolsActivePort');
    await waitForFile(portFile);
    const port = (await readFile(portFile, 'utf8')).trim().split('\n')[0];
    let tab;
    for (let index = 0; index < 80; index += 1) {
      const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
      tab = tabs.find(candidate => candidate.url.includes('4173'));
      if (tab) break;
      await sleep(50);
    }
    assert.ok(tab, 'Game tab did not open');

    const socket = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let commandId = 0;
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
      const id = ++commandId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = expression => send('Runtime.evaluate', { expression, returnByValue: true });
    const keyValues = {
      KeyC: ['c', 67], KeyN: ['n', 78], Space: [' ', 32],
      ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39]
    };
    const press = async code => {
      const [key, windowsVirtualKeyCode] = keyValues[code];
      await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key, windowsVirtualKeyCode });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key, windowsVirtualKeyCode });
    };
    const readState = async () => {
      const result = await evaluate(`JSON.parse(document.querySelector('#game').dataset.gameState)`);
      return result.result.value;
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await sleep(700);
    const startedAt = Date.now();
    await press('KeyC');
    await press('KeyN');
    const transitions = [];
    let previousKey = '';
    let previousMode = '';
    let briefSince = 0;
    let actions = 0;
    let casts = 0;

    while (Date.now() - startedAt < 25 * 60 * 1000) {
      const state = await readState();
      const transitionKey = `${state.mode}:${state.wave}:${state.waveFormation}:${state.guardianAct ?? '-'}`;
      if (transitionKey !== previousKey) {
        transitions.push({
          elapsedSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(3)),
          mode: state.mode, wave: state.wave + 1, formation: state.waveFormation + 1,
          guardianAct: state.guardianAct, bell: state.bell, score: state.score
        });
        previousKey = transitionKey;
      }
      if (state.mode !== previousMode) {
        briefSince = Date.now();
        previousMode = state.mode;
      }
      if (state.mode === 'waveClear' || state.mode === 'gameOver') {
        const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
        const browser = await send('Browser.getVersion');
        const elapsedSeconds = Number(((Date.now() - startedAt) / 1000).toFixed(3));
        const report = {
          schema: 1,
          auditedAt: new Date().toISOString(),
          browser: browser.product,
          scope: 'Fresh browser profile, no save or game-state injection, production C/N/arrow/Space key events only.',
          result: state.mode,
          elapsedSeconds,
          elapsedMinutes: Number((elapsedSeconds / 60).toFixed(2)),
          finalWave: state.wave + 1,
          bell: state.bell,
          score: state.score,
          chain: state.chain,
          actions,
          casts,
          consoleErrors: consoleErrors.length,
          transitions
        };
        const completedFormations = new Map();
        const completedGuardians = new Set();
        for (const transition of transitions) {
          if (transition.mode === 'playing' && transition.guardianAct === null) {
            const formations = completedFormations.get(transition.wave) ?? new Set();
            formations.add(transition.formation);
            completedFormations.set(transition.wave, formations);
          }
          if (transition.guardianAct !== null) completedGuardians.add(transition.guardianAct);
        }
        await writeFile(evidencePath, `${JSON.stringify(report, null, 2)}\n`);
        assert.equal(state.mode, 'waveClear', 'Full browser campaign must reach the ending');
        assert.equal(state.wave, 17, 'Full browser campaign must finish wave 18');
        assert.deepEqual([...completedFormations.keys()], Array.from({ length: 18 }, (_, index) => index + 1),
          'Full browser campaign must enter every wave');
        for (const [wave, formations] of completedFormations) {
          assert.deepEqual([...formations], [1, 2, 3], `Wave ${wave} must enter all three formations`);
        }
        assert.deepEqual([...completedGuardians], [0, 1, 2, 3, 4, 5],
          'Full browser campaign must enter all six guardian battles');
        assert.ok(report.elapsedMinutes >= 14 && report.elapsedMinutes <= 20,
          `Browser campaign ${report.elapsedMinutes}m must remain within the practiced contract`);
        assert.equal(consoleErrors.length, 0, 'Browser campaign must have no console errors');
        console.log(`browser campaign: ${report.elapsedMinutes}m, ${report.result}, BELL ${report.bell}, ${report.score} points, 18 waves × 3 formations, 6 guardians, ${report.consoleErrors} console errors`);
        socket.close();
        return;
      }
      if ((state.mode === 'waveBrief' || state.mode === 'guardianBrief') && Date.now() - briefSince >= 1200) {
        await press('Space');
      } else if (state.mode === 'playing') {
        const action = chooseAction(state);
        if (action) {
          await press(action);
          actions += 1;
          if (action === 'Space') casts += 1;
        }
      }
      await sleep(state.guardianAct === null ? 120 : 100);
    }
    throw new Error('Browser campaign exceeded 25 minutes');
  } finally {
    await new Promise(resolve => {
      if (chrome.exitCode !== null) { resolve(); return; }
      chrome.once('exit', resolve);
      chrome.kill('SIGTERM');
      setTimeout(resolve, 2000);
    });
    server?.kill('SIGTERM');
  }
}

try {
  await main();
} finally {
  // Chrome can briefly recreate preference files while shutting down.
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
