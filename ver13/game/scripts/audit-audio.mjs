import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const evidencePath = join(root, '..', 'docs', 'm4-audio-pcm-audit.json');
const chromePath = process.env.RINGWARD_CHROME_PATH
  ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = `/private/tmp/ringward-audio-${process.pid}`;
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const reservePort = () => new Promise((resolve, reject) => {
  const server = createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(error => error ? reject(error) : resolve(port));
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
  assert.ok(existsSync(chromePath), `Chrome not found at ${chromePath}; set RINGWARD_CHROME_PATH`);
  await mkdir(profile, { recursive: true });
  const port = await reservePort();
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await fetch(`${origin}/`, { signal: AbortSignal.timeout(500) });
      break;
    } catch { await sleep(100); }
  }

  const chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, `${origin}/`
  ], { stdio: 'ignore' });

  try {
    const portFile = join(profile, 'DevToolsActivePort');
    await waitForFile(portFile);
    const debuggingPort = (await readFile(portFile, 'utf8')).trim().split('\n')[0];
    let tab;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const tabs = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`).then(response => response.json());
      tab = tabs.find(candidate => candidate.url.startsWith(origin));
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

    await send('Runtime.enable');
    const evaluated = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const { AUDIO_CUES, MUSIC_VARIATIONS, RingwardAudio } = await import('/src/audio.js');
        const sampleRate = 48000;
        const analyze = buffer => {
          const samples = buffer.getChannelData(0);
          let peak = 0, energy = 0, nonSilentSamples = 0, nonFiniteSamples = 0, zeroCrossings = 0;
          let previous = samples[0];
          for (const sample of samples) {
            if (!Number.isFinite(sample)) nonFiniteSamples += 1;
            const magnitude = Math.abs(sample);
            peak = Math.max(peak, magnitude);
            energy += sample * sample;
            if (magnitude > 0.00001) nonSilentSamples += 1;
            if ((sample < 0 && previous >= 0) || (sample >= 0 && previous < 0)) zeroCrossings += 1;
            previous = sample;
          }
          return {
            peak: Number(peak.toFixed(6)),
            rms: Number(Math.sqrt(energy / samples.length).toFixed(6)),
            nonSilentSamples,
            nonFiniteSamples,
            zeroCrossings
          };
        };
        const render = async (seconds, schedule, volume = 10) => {
          const context = new OfflineAudioContext(1, Math.ceil(sampleRate * seconds), sampleRate);
          const audio = new RingwardAudio(() => context);
          audio.unlock();
          audio.setVolume(volume);
          schedule(audio);
          return analyze(await context.startRendering());
        };
        const cues = {};
        for (const cue of AUDIO_CUES) cues[cue] = await render(1.2, audio => audio.play(cue));
        const music = [];
        for (let act = 0; act < MUSIC_VARIATIONS.length; act += 1) {
          const metrics = await render(4.2, audio => audio.scheduleMusicSample(act, 16));
          music.push({ act: act + 1, name: MUSIC_VARIATIONS[act].name, ...metrics });
        }
        const combined = await render(4.2, audio => {
          audio.scheduleMusicSample(5, 16);
          audio.play('bellHit');
          audio.play('returnBreak');
        });
        const stopped = {};
        for (const state of [
          ['paused', 'playing', true], ['waveBrief', 'waveBrief', false],
          ['continue', 'continue', false], ['ranking', 'ranking', false], ['settings', 'settings', false]
        ]) stopped[state[0]] = await render(0.5, audio => audio.update(state[1], state[2], 0));
        const muted = await render(1.2, audio => {
          audio.play('bellHit');
          audio.scheduleMusicSample(0, 8);
        }, 0);
        return { sampleRate, cues, music, combined, stopped, muted };
      })()`
    });
    if (evaluated.exceptionDetails) throw new Error(evaluated.exceptionDetails.text);
    const report = evaluated.result.value;

    for (const [cue, metrics] of Object.entries(report.cues)) {
      assert.ok(metrics.nonSilentSamples > 100, `${cue} must render audible PCM`);
      assert.equal(metrics.nonFiniteSamples, 0, `${cue} must contain only finite samples`);
      assert.ok(metrics.peak < 0.98, `${cue} peak ${metrics.peak} must not clip`);
    }
    assert.equal(report.music.length, 6);
    for (const act of report.music) {
      assert.ok(act.nonSilentSamples > 1000, `act ${act.act} must render audible PCM`);
      assert.equal(act.nonFiniteSamples, 0, `act ${act.act} must contain only finite samples`);
      assert.ok(act.peak < 0.98, `act ${act.act} peak ${act.peak} must not clip`);
    }
    assert.equal(new Set(report.music.map(act => act.zeroCrossings)).size, 6, 'all act PCM contours must differ');
    assert.equal(report.combined.nonFiniteSamples, 0);
    assert.ok(report.combined.peak < 0.98, `worst overlap peak ${report.combined.peak} must not clip`);
    for (const [state, metrics] of Object.entries(report.stopped)) {
      assert.equal(metrics.nonSilentSamples, 0, `${state} must stop music`);
    }
    assert.equal(report.muted.nonSilentSamples, 0, 'volume zero must be silent');
    assert.equal(consoleErrors.length, 0, 'Chrome console must remain clean');

    const evidence = {
      schema: 1,
      auditedAt: new Date().toISOString(),
      browser: 'Chrome OfflineAudioContext',
      thresholds: { nonSilent: 'abs(sample) > 0.00001', clipping: 'peak < 0.98', finite: 'nonFiniteSamples = 0' },
      ...report,
      consoleErrors: consoleErrors.length
    };
    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(`audio PCM: ${Object.keys(report.cues).length} cues, 6 act themes, peak ${report.combined.peak}, stopped states silent`);
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
    if (server.exitCode === null) server.kill('SIGTERM');
    // Chrome may briefly recreate preference files after its process exits.
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
