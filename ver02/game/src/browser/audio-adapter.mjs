const AUDIO_GROUPS = Object.freeze(["bgm", "sfx"]);

function validateSettings(settings) {
  if (!settings || typeof settings !== "object") throw new TypeError("audio settings are required");
  for (const group of AUDIO_GROUPS) {
    const volume = settings[`${group}Volume`];
    const muted = settings[`${group}Muted`];
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
      throw new TypeError(`${group} volume must be between 0 and 1`);
    }
    if (typeof muted !== "boolean") throw new TypeError(`${group} muted must be boolean`);
  }
  return {
    bgmVolume: settings.bgmVolume,
    sfxVolume: settings.sfxVolume,
    bgmMuted: settings.bgmMuted,
    sfxMuted: settings.sfxMuted,
  };
}

function defaultContextFactory() {
  const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (typeof AudioContext !== "function") throw new Error("Web Audio is unavailable");
  return new AudioContext();
}

function effectiveGain(settings, group) {
  return settings[`${group}Muted`] ? 0 : settings[`${group}Volume`];
}

export function createBrowserAudioAdapter(options = {}) {
  const createContext = options.createContext ?? defaultContextFactory;
  let settings = validateSettings(options.settings ?? {
    bgmVolume: 0.8,
    sfxVolume: 0.8,
    bgmMuted: false,
    sfxMuted: false,
  });
  let mode = "idle";
  let warning = null;
  let context = null;
  let gains = null;
  let activationPromise = null;
  let currentBgm = null;
  const sounds = new Map();
  const activeSfx = new Set();

  function result(extra = {}) {
    return { audible: mode === "active", warning, ...extra };
  }

  function setGain(group) {
    const parameter = gains[group].gain;
    const value = effectiveGain(settings, group);
    if (typeof parameter.setValueAtTime === "function") {
      parameter.setValueAtTime(value, context.currentTime ?? 0);
    } else {
      parameter.value = value;
    }
  }

  async function closeContext(candidate) {
    try {
      await candidate?.close?.();
    } catch {
      // 音声の後始末失敗をゲーム進行へ伝播させない。
    }
  }

  async function becomeSilent(reason, candidate = context) {
    warning = reason;
    mode = "silent";
    context = null;
    gains = null;
    sounds.clear();
    currentBgm = null;
    activeSfx.clear();
    await closeContext(candidate);
    return result();
  }

  async function activateInternal() {
    let candidate;
    try {
      // ユーザー操作の同期call stack内でAudioContextを生成するため、最初のawaitより前に行う。
      candidate = createContext();
      if (!candidate || typeof candidate.createGain !== "function") {
        throw new TypeError("invalid AudioContext");
      }
      const bgm = candidate.createGain();
      const sfx = candidate.createGain();
      bgm.connect(candidate.destination);
      sfx.connect(candidate.destination);
      context = candidate;
      gains = { bgm, sfx };
      setGain("bgm");
      setGain("sfx");
    } catch {
      return becomeSilent("audio-context-create-failed", candidate);
    }

    try {
      if (candidate.state !== "running") await candidate.resume();
    } catch {
      if (mode === "disposed") return result();
      return becomeSilent("audio-context-resume-failed", candidate);
    }
    if (mode === "disposed") return result();
    mode = "active";
    warning = null;
    return result();
  }

  function stopSource(source) {
    try {
      source?.stop?.();
    } catch {
      // 既に終了したsourceの停止失敗は無視する。
    }
  }

  function play(id, group, loop) {
    if (mode !== "active") return result({ played: false });
    const sound = sounds.get(id);
    if (!sound || sound.group !== group) {
      warning = "audio-source-missing";
      return result({ played: false });
    }
    try {
      const source = context.createBufferSource();
      source.buffer = sound.buffer;
      source.loop = loop;
      source.connect(gains[group]);
      if (group === "bgm") {
        stopSource(currentBgm);
        currentBgm = source;
        source.onended = () => {
          if (currentBgm === source) currentBgm = null;
        };
      } else {
        activeSfx.add(source);
        source.onended = () => activeSfx.delete(source);
      }
      source.start();
      warning = null;
      return result({ played: true });
    } catch {
      warning = "audio-playback-failed";
      return result({ played: false });
    }
  }

  return {
    getStatus() {
      return { mode, warning };
    },

    activate() {
      if (mode === "disposed") return Promise.resolve(result());
      if (mode === "active" || mode === "silent") return Promise.resolve(result());
      activationPromise ??= activateInternal();
      return activationPromise;
    },

    setSettings(nextSettings) {
      settings = validateSettings(nextSettings);
      if (mode !== "active") return result();
      try {
        setGain("bgm");
        setGain("sfx");
        warning = null;
        return result();
      } catch {
        warning = "audio-gain-update-failed";
        return result();
      }
    },

    async loadSound(id, group, encodedAudio) {
      if (typeof id !== "string" || id.length === 0) throw new TypeError("sound id is required");
      if (!AUDIO_GROUPS.includes(group)) throw new TypeError("invalid audio group");
      if (mode !== "active") return result({ loaded: false });
      if (encodedAudio === null || encodedAudio === undefined) {
        warning = "audio-source-missing";
        return result({ loaded: false });
      }
      try {
        const buffer = await context.decodeAudioData(encodedAudio);
        sounds.set(id, { group, buffer });
        warning = null;
        return result({ loaded: true });
      } catch {
        warning = "audio-decode-failed";
        return result({ loaded: false });
      }
    },

    playBgm(id) {
      return play(id, "bgm", true);
    },

    playSfx(id) {
      return play(id, "sfx", false);
    },

    stopBgm() {
      stopSource(currentBgm);
      currentBgm = null;
    },

    async dispose() {
      if (mode === "disposed") return;
      stopSource(currentBgm);
      for (const source of activeSfx) stopSource(source);
      activeSfx.clear();
      sounds.clear();
      const candidate = context;
      context = null;
      gains = null;
      mode = "disposed";
      warning = null;
      await closeContext(candidate);
    },
  };
}
