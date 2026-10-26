const DEFAULT_SETTINGS = Object.freeze({ bgmVolume: 0.65, sfxVolume: 0.45 });
const DUCK_GAIN = 10 ** (-3 / 20);
const NORMAL_LAYERS = Object.freeze(["stage-rhythm", "stage-melody"]);
const DANGER_LAYERS = Object.freeze([...NORMAL_LAYERS, "stage-danger"]);
const STAGE_02_NORMAL_LAYERS = Object.freeze(["stage-02-rhythm", "stage-02-melody"]);
const STAGE_02_DANGER_LAYERS = Object.freeze([...STAGE_02_NORMAL_LAYERS, "stage-02-danger"]);
const STAGE_03_NORMAL_LAYERS = Object.freeze(["stage-03-rhythm", "stage-03-melody"]);
const STAGE_03_DANGER_LAYERS = Object.freeze([...STAGE_03_NORMAL_LAYERS, "stage-03-danger"]);

export const AUDIO_ASSETS = Object.freeze([
  { id: "stage-rhythm", group: "bgm", url: "./assets/audio/stage-01/stage-01-orbital-wreck-rhythm-v1.wav", level: 0.72 },
  { id: "stage-melody", group: "bgm", url: "./assets/audio/stage-01/stage-01-orbital-wreck-melody-v1.wav", level: 0.5 },
  { id: "stage-danger", group: "bgm", url: "./assets/audio/stage-01/stage-01-orbital-wreck-danger-v1.wav", level: 0.42 },
  { id: "stage-intro", group: "sfx", url: "./assets/audio/stage-01/stage-01-orbital-wreck-intro-v1.wav", level: 0.72 },
  { id: "stage-clear", group: "sfx", url: "./assets/audio/stage-01/stage-01-orbital-wreck-clear-v1.wav", level: 0.8 },
  { id: "stage-02-rhythm", group: "bgm", url: "./assets/audio/stage-02/stage-02-cloud-refinery-rhythm-v1.wav", level: 0.72 },
  { id: "stage-02-melody", group: "bgm", url: "./assets/audio/stage-02/stage-02-cloud-refinery-melody-v1.wav", level: 0.5 },
  { id: "stage-02-danger", group: "bgm", url: "./assets/audio/stage-02/stage-02-cloud-refinery-danger-v1.wav", level: 0.42 },
  { id: "stage-02-intro", group: "sfx", url: "./assets/audio/stage-02/stage-02-cloud-refinery-intro-v1.wav", level: 0.72 },
  { id: "stage-02-clear", group: "sfx", url: "./assets/audio/stage-02/stage-02-cloud-refinery-clear-v1.wav", level: 0.8 },
  { id: "stage-03-rhythm", group: "bgm", url: "./assets/audio/stage-03/stage-03-living-ark-rhythm-v1.wav", level: 0.72 },
  { id: "stage-03-melody", group: "bgm", url: "./assets/audio/stage-03/stage-03-living-ark-melody-v1.wav", level: 0.5 },
  { id: "stage-03-danger", group: "bgm", url: "./assets/audio/stage-03/stage-03-living-ark-danger-v1.wav", level: 0.42 },
  { id: "stage-03-intro", group: "sfx", url: "./assets/audio/stage-03/stage-03-living-ark-intro-v1.wav", level: 0.72 },
  { id: "stage-03-clear", group: "sfx", url: "./assets/audio/stage-03/stage-03-living-ark-clear-v1.wav", level: 0.8 },
  { id: "ui-confirm", group: "sfx", url: "./assets/audio/shared/ui-confirm-v1.wav", level: 0.58 },
  { id: "pulse", group: "sfx", url: "./assets/audio/generated/pulse-shot-v1.wav", level: 0.18 },
  { id: "lance", group: "sfx", url: "./assets/audio/shared/weapon-lance-shot-v1.wav", level: 0.24 },
  { id: "spread", group: "sfx", url: "./assets/audio/shared/weapon-spread-shot-v1.wav", level: 0.2 },
  { id: "seeker", group: "sfx", url: "./assets/audio/shared/weapon-seeker-launch-v1.wav", level: 0.22 },
  { id: "core", group: "sfx", url: "./assets/audio/shared/core-collect-v1.wav", level: 0.64 },
  { id: "enemy-shot", group: "sfx", url: "./assets/audio/generated/enemy-shot-v1.wav", level: 0.22 },
  { id: "impact", group: "sfx", url: "./assets/audio/generated/impact-v1.wav", level: 0.38 },
  { id: "explosion", group: "sfx", url: "./assets/audio/generated/explosion-v1.wav", level: 0.48, limit: 6 },
  { id: "miss", group: "sfx", url: "./assets/audio/generated/miss-v1.wav", level: 0.66 },
  { id: "warning", group: "sfx", url: "./assets/audio/generated/warning-v1.wav", level: 0.62 }
]);

export function clampVolume(value) {
  return Math.max(0, Math.min(1, Number.isFinite(Number(value)) ? Number(value) : 0));
}

export function bgmLayersFor(game) {
  if (game.screen !== "playing") return [];
  if (game.stageId === "stage-03") return game.boss || game.tick >= 150 * 60 ? STAGE_03_DANGER_LAYERS : STAGE_03_NORMAL_LAYERS;
  if (game.stageId === "stage-02") return game.boss || game.tick >= 150 * 60 ? STAGE_02_DANGER_LAYERS : STAGE_02_NORMAL_LAYERS;
  return game.boss || game.tick >= 150 * 60 ? DANGER_LAYERS : NORMAL_LAYERS;
}

function defaultContext() {
  const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AudioContext) throw new Error("Web Audio is unavailable");
  return new AudioContext();
}

function counterState(game) {
  return {
    screen: game.screen,
    stageId: game.stageId,
    tick: game.tick,
    lives: game.lives,
    pulse: game.pulseShots,
    lance: game.weaponShots.lance,
    spread: game.weaponShots.spread,
    seeker: game.weaponShots.seeker,
    cores: game.coresCollected,
    enemyShots: game.enemyShots,
    combatHits: game.combatHits,
    defeatedEnemies: game.defeatedEnemies,
    destroyedTerrain: game.destroyedTerrain.length,
    bossWarning: game.boss?.attackWarning === true
  };
}

export function createAudioSystem(options = {}) {
  const fetchResource = options.fetchResource ?? globalThis.fetch;
  const createContext = options.createContext ?? defaultContext;
  let settings = {
    bgmVolume: clampVolume(options.settings?.bgmVolume ?? DEFAULT_SETTINGS.bgmVolume),
    sfxVolume: clampVolume(options.settings?.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume)
  };
  let mode = "idle";
  let warning = null;
  let context;
  let bgmBus;
  let bgmDuck;
  let sfxBus;
  let limiter;
  let activation;
  let previous;
  let bgmEpoch = 0;
  const buffers = new Map();
  const bgmSources = new Map();
  const activeSfx = new Map();
  const stats = { playedSfx: 0, cappedSfx: 0, duckCount: 0, maxConcurrentSfx: 0 };

  function setBusVolumes() {
    if (!context) return;
    bgmBus.gain.setValueAtTime(settings.bgmVolume, context.currentTime);
    sfxBus.gain.setValueAtTime(settings.sfxVolume, context.currentTime);
  }

  function stopSource(source) {
    try { source.stop(); } catch { /* An ended source is already stopped. */ }
  }

  function stopBgm() {
    for (const { source } of bgmSources.values()) stopSource(source);
    bgmSources.clear();
  }

  function setBgm(ids) {
    if (mode !== "active" || ids.join() === [...bgmSources.keys()].join()) return;
    const now = context.currentTime;
    if (bgmSources.size === 0) bgmEpoch = now;
    for (const [id, item] of bgmSources) {
      if (!ids.includes(id)) { stopSource(item.source); bgmSources.delete(id); }
    }
    for (const id of ids) {
      if (bgmSources.has(id)) continue;
      const asset = AUDIO_ASSETS.find((candidate) => candidate.id === id);
      const buffer = buffers.get(id);
      if (!asset || !buffer) continue;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = asset.level;
      source.connect(gain).connect(bgmDuck);
      const offset = (now - bgmEpoch) % buffer.duration;
      source.start(now, offset);
      source.onended = () => { if (bgmSources.get(id)?.source === source) bgmSources.delete(id); };
      bgmSources.set(id, { source, gain });
    }
  }

  function playSfx(id) {
    if (mode !== "active") return false;
    const asset = AUDIO_ASSETS.find((candidate) => candidate.id === id);
    const buffer = buffers.get(id);
    if (!asset || !buffer) return false;
    const entries = activeSfx.get(id) ?? [];
    const limit = asset.limit ?? 4;
    while (entries.length >= limit) {
      stopSource(entries.shift().source);
      stats.cappedSfx += 1;
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = asset.level;
    source.connect(gain).connect(sfxBus);
    const entry = { source, gain };
    entries.push(entry);
    activeSfx.set(id, entries);
    source.onended = () => {
      const current = activeSfx.get(id) ?? [];
      const index = current.indexOf(entry);
      if (index >= 0) current.splice(index, 1);
      if (current.length === 0) activeSfx.delete(id);
    };
    source.start();
    stats.playedSfx += 1;
    stats.maxConcurrentSfx = Math.max(stats.maxConcurrentSfx, [...activeSfx.values()].reduce((sum, list) => sum + list.length, 0));
    return true;
  }

  function duckBgm() {
    if (mode !== "active") return;
    const now = context.currentTime;
    bgmDuck.gain.cancelScheduledValues(now);
    bgmDuck.gain.setValueAtTime(DUCK_GAIN, now);
    bgmDuck.gain.linearRampToValueAtTime(1, now + 0.5);
    stats.duckCount += 1;
  }

  function sync(game) {
    if (mode !== "active") return;
    const next = counterState(game);
    if (!previous) {
      previous = next;
      setBgm(bgmLayersFor(game));
      return;
    }
    if (next.screen !== previous.screen) {
      if (next.screen === "stage-intro") playSfx(next.stageId === "stage-03" ? "stage-03-intro" : next.stageId === "stage-02" ? "stage-02-intro" : "stage-intro");
      if (next.screen === "stage-result") { stopBgm(); playSfx(next.stageId === "stage-03" ? "stage-03-clear" : next.stageId === "stage-02" ? "stage-02-clear" : "stage-clear"); }
    }
    if (next.pulse > previous.pulse) playSfx("pulse");
    if (next.lance > previous.lance) playSfx("lance");
    if (next.spread > previous.spread) playSfx("spread");
    if (next.seeker > previous.seeker) playSfx("seeker");
    if (next.cores > previous.cores) playSfx("core");
    if (next.enemyShots > previous.enemyShots) playSfx("enemy-shot");
    if (next.combatHits > previous.combatHits) playSfx("impact");
    if (next.defeatedEnemies > previous.defeatedEnemies || next.destroyedTerrain > previous.destroyedTerrain) playSfx("explosion");
    if (next.lives < previous.lives) { playSfx("miss"); duckBgm(); }
    if (next.bossWarning && !previous.bossWarning) { playSfx("warning"); duckBgm(); }
    setBgm(bgmLayersFor(game));
    previous = next;
  }

  function activate(game) {
    if (activation) return activation;
    try {
      context = createContext();
      bgmBus = context.createGain();
      bgmDuck = context.createGain();
      sfxBus = context.createGain();
      limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -1;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.08;
      bgmDuck.connect(bgmBus).connect(limiter);
      sfxBus.connect(limiter);
      limiter.connect(context.destination);
      bgmDuck.gain.value = 1;
      setBusVolumes();
      mode = "loading";
    } catch {
      mode = "silent";
      warning = "audio-context-unavailable";
      return Promise.resolve(status());
    }
    activation = Promise.all(AUDIO_ASSETS.map(async (asset) => {
      const response = await fetchResource(asset.url);
      if (!response.ok) throw new Error(`${response.status} ${asset.url}`);
      buffers.set(asset.id, await context.decodeAudioData(await response.arrayBuffer()));
    })).then(async () => {
      if (context.state !== "running") await context.resume();
      mode = "active";
      previous = counterState(game);
      setBgm(bgmLayersFor(game));
      if (game.screen === "stage-intro") playSfx(game.stageId === "stage-03" ? "stage-03-intro" : game.stageId === "stage-02" ? "stage-02-intro" : "stage-intro");
      return status();
    }).catch(() => {
      mode = "silent";
      warning = "audio-load-failed";
      return status();
    });
    return activation;
  }

  function setVolumes(next) {
    settings = {
      bgmVolume: clampVolume(next.bgmVolume ?? settings.bgmVolume),
      sfxVolume: clampVolume(next.sfxVolume ?? settings.sfxVolume)
    };
    setBusVolumes();
    return { ...settings };
  }

  function status() {
    return {
      mode,
      warning,
      loaded: buffers.size,
      assetCount: AUDIO_ASSETS.length,
      settings: { ...settings },
      bgmLayers: [...bgmSources.keys()],
      activeSfx: [...activeSfx.values()].reduce((sum, list) => sum + list.length, 0),
      perSoundLimit: 4,
      explosionLimit: 6,
      duckDb: -3,
      limiterDb: -1,
      ...stats
    };
  }

  return { activate, sync, setVolumes, playUi: () => playSfx("ui-confirm"), status };
}
