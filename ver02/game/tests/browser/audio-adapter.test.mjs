import test from "node:test";
import assert from "node:assert/strict";
import { createBrowserAudioAdapter } from "../../src/browser/audio-adapter.mjs";

function createFakeContext(options = {}) {
  const gains = [];
  const sources = [];
  const context = {
    state: options.state ?? "suspended",
    currentTime: 12,
    destination: { type: "destination" },
    gains,
    sources,
    resumeCalls: 0,
    closeCalls: 0,
    createGain() {
      const gain = {
        gain: { value: -1, setValueAtTime(value) { this.value = value; } },
        connectedTo: null,
        connect(target) { this.connectedTo = target; },
      };
      gains.push(gain);
      return gain;
    },
    async resume() {
      this.resumeCalls += 1;
      if (options.resumeFailure) throw new Error("resume denied");
      this.state = "running";
    },
    async decodeAudioData(value) {
      if (options.decodeFailure) throw new Error("bad audio");
      return { decoded: value };
    },
    createBufferSource() {
      if (options.playbackFailure) throw new Error("source failed");
      const source = {
        buffer: null,
        loop: false,
        started: false,
        stopped: false,
        connect(target) { this.connectedTo = target; },
        start() { this.started = true; },
        stop() { this.stopped = true; },
      };
      sources.push(source);
      return source;
    },
    async close() { this.closeCalls += 1; },
  };
  return context;
}

const DEFAULT_SETTINGS = Object.freeze({
  bgmVolume: 0.8,
  sfxVolume: 0.6,
  bgmMuted: false,
  sfxMuted: false,
});

test("AV-06: START相当のactivateより前にはAudioContextを生成しない", async () => {
  const context = createFakeContext();
  let createCalls = 0;
  const audio = createBrowserAudioAdapter({
    settings: DEFAULT_SETTINGS,
    createContext() { createCalls += 1; return context; },
  });

  assert.deepEqual(audio.getStatus(), { mode: "idle", warning: null });
  assert.equal(createCalls, 0);
  const [first, second] = await Promise.all([audio.activate(), audio.activate()]);
  assert.equal(first.audible, true);
  assert.equal(second.audible, true);
  assert.equal(createCalls, 1);
  assert.equal(context.resumeCalls, 1);
  assert.equal(context.gains.length, 2);
  assert.equal(context.gains[0].gain.value, 0.8);
  assert.equal(context.gains[1].gain.value, 0.6);
});

test("A11Y-01: BGM/SFXの音量とミュートを独立したgainへ反映する", async () => {
  const context = createFakeContext({ state: "running" });
  const audio = createBrowserAudioAdapter({ settings: DEFAULT_SETTINGS, createContext: () => context });
  await audio.activate();

  const changed = audio.setSettings({
    bgmVolume: 0.25,
    sfxVolume: 1,
    bgmMuted: true,
    sfxMuted: false,
  });
  assert.equal(changed.audible, true);
  assert.equal(context.gains[0].gain.value, 0);
  assert.equal(context.gains[1].gain.value, 1);
  assert.throws(() => audio.setSettings({ ...DEFAULT_SETTINGS, sfxVolume: 2 }), /between 0 and 1/);
});

test("AV-06: AudioContext作成拒否とresume拒否は例外にせず無音へ縮退する", async () => {
  const creationDenied = createBrowserAudioAdapter({
    settings: DEFAULT_SETTINGS,
    createContext() { throw new Error("denied"); },
  });
  assert.deepEqual(await creationDenied.activate(), {
    audible: false,
    warning: "audio-context-create-failed",
  });
  assert.deepEqual(creationDenied.playSfx("shot"), {
    audible: false,
    warning: "audio-context-create-failed",
    played: false,
  });

  const context = createFakeContext({ resumeFailure: true });
  const resumeDenied = createBrowserAudioAdapter({
    settings: DEFAULT_SETTINGS,
    createContext: () => context,
  });
  assert.deepEqual(await resumeDenied.activate(), {
    audible: false,
    warning: "audio-context-resume-failed",
  });
  assert.equal(context.closeCalls, 1);
});

test("AV-06: decode失敗と個別音源欠落は他の音声と進行を止めない", async () => {
  const decodeContext = createFakeContext({ decodeFailure: true });
  const decodeAudio = createBrowserAudioAdapter({
    settings: DEFAULT_SETTINGS,
    createContext: () => decodeContext,
  });
  await decodeAudio.activate();
  assert.deepEqual(await decodeAudio.loadSound("shot", "sfx", new ArrayBuffer(1)), {
    audible: true,
    warning: "audio-decode-failed",
    loaded: false,
  });
  assert.equal(decodeAudio.getStatus().mode, "active");

  const context = createFakeContext({ state: "running" });
  const audio = createBrowserAudioAdapter({ settings: DEFAULT_SETTINGS, createContext: () => context });
  await audio.activate();
  assert.equal((await audio.loadSound("missing", "sfx", null)).loaded, false);
  assert.equal(audio.playSfx("missing").played, false);
  assert.equal((await audio.loadSound("shot", "sfx", new ArrayBuffer(2))).loaded, true);
  assert.equal(audio.playSfx("shot").played, true);
  assert.equal(context.sources[0].started, true);
  assert.equal(context.sources[0].connectedTo, context.gains[1]);

  const playbackContext = createFakeContext({ state: "running", playbackFailure: true });
  const playbackAudio = createBrowserAudioAdapter({
    settings: DEFAULT_SETTINGS,
    createContext: () => playbackContext,
  });
  await playbackAudio.activate();
  await playbackAudio.loadSound("shot", "sfx", new ArrayBuffer(1));
  assert.deepEqual(playbackAudio.playSfx("shot"), {
    audible: true,
    warning: "audio-playback-failed",
    played: false,
  });
  assert.equal(playbackAudio.getStatus().mode, "active");
});

test("A11Y-01/AV-06: mute中もBGM/SFX操作と破棄を安全に完了する", async () => {
  const context = createFakeContext({ state: "running" });
  const audio = createBrowserAudioAdapter({
    settings: { ...DEFAULT_SETTINGS, bgmMuted: true, sfxMuted: true },
    createContext: () => context,
  });
  await audio.activate();
  await audio.loadSound("stage", "bgm", new ArrayBuffer(1));
  await audio.loadSound("shot", "sfx", new ArrayBuffer(1));
  assert.equal(audio.playBgm("stage").played, true);
  assert.equal(audio.playSfx("shot").played, true);
  assert.deepEqual(context.gains.map(({ gain }) => gain.value), [0, 0]);

  await audio.dispose();
  assert.equal(context.sources.every((source) => source.stopped), true);
  assert.equal(context.closeCalls, 1);
  assert.deepEqual(audio.getStatus(), { mode: "disposed", warning: null });
  assert.equal((await audio.activate()).audible, false);
});

test("AV-06: resume待機中に破棄してもactiveへ戻らない", async () => {
  let finishResume;
  const context = createFakeContext();
  context.resume = () => new Promise((resolve) => { finishResume = resolve; });
  const audio = createBrowserAudioAdapter({ settings: DEFAULT_SETTINGS, createContext: () => context });

  const activation = audio.activate();
  await audio.dispose();
  finishResume();
  assert.equal((await activation).audible, false);
  assert.deepEqual(audio.getStatus(), { mode: "disposed", warning: null });
});
