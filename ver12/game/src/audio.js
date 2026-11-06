export const MIX = Object.freeze({
  master: 0.17,
  musicVoice: 0.055,
  effectVoice: 0.16,
  maxMusicVoices: 2,
  maxEffectVoices: 10
});

export const THEME_STEP_MS = 250;
export const THEME_STEPS = 16;

const melody = [330, 0, 392, 440, 494, 0, 440, 392, 330, 0, 294, 330, 392, 0, 294, 247];
const bass = [110, 0, 110, 0, 123.47, 0, 123.47, 0, 98, 0, 98, 0, 110, 0, 82.41, 0];

export function theoreticalPeak() {
  return MIX.master * (MIX.musicVoice * MIX.maxMusicVoices + MIX.effectVoice * MIX.maxEffectVoices);
}

export class ForgeAudio {
  constructor(context, timers = globalThis) {
    this.context = context;
    this.timers = timers;
    this.volume = 0.7;
    this.scene = "silent";
    this.lastCue = "none";
    this.musicTimer = null;
    this.musicGeneration = 0;
    this.musicNodes = new Set();
    this.master = context.createGain();
    this.master.connect(context.destination);
    this.setVolume(this.volume);
  }

  resume() {
    if (this.context.state === "suspended") return this.context.resume();
    return Promise.resolve();
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.volume * MIX.master, now);
  }

  voice(frequency, delay = 0, duration = 0.1, level = MIX.effectVoice, type = "square", fmDepth = 0, music = false) {
    if (this.volume === 0) return;
    const now = this.context.currentTime + delay;
    const carrier = this.context.createOscillator();
    const envelope = this.context.createGain();
    carrier.type = type;
    carrier.frequency.setValueAtTime(frequency, now);
    envelope.gain.setValueAtTime(0.001, now);
    envelope.gain.exponentialRampToValueAtTime(level, now + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
    carrier.connect(envelope).connect(this.master);
    if (fmDepth > 0) {
      const modulator = this.context.createOscillator();
      const modulation = this.context.createGain();
      modulator.type = "sine";
      modulator.frequency.setValueAtTime(frequency * 2, now);
      modulation.gain.setValueAtTime(fmDepth, now);
      modulator.connect(modulation).connect(carrier.frequency);
      modulator.start(now);
      modulator.stop(now + duration);
    }
    carrier.start(now);
    carrier.stop(now + duration);
    if (music) {
      this.musicNodes.add(carrier);
      carrier.onended = () => this.musicNodes.delete(carrier);
    }
  }

  cue(name, detail = 0) {
    this.lastCue = name;
    const notes = {
      coin: [[784, 0, 0.06], [1047, 0.08, 0.14]],
      start: [[196, 0, 0.1], [330, 0.09, 0.12], [494, 0.18, 0.24]],
      chamber: [[392, 0, 0.18], [494, 0.09, 0.2], [659, 0.18, 0.3]],
      ending: [[196, 0, 0.28], [294, 0.14, 0.3], [392, 0.28, 0.32], [494, 0.42, 0.38], [659, 0.56, 0.65]],
      ranking: [[659, 0, 0.12], [523, 0.1, 0.14], [784, 0.2, 0.3]],
      pull: [[280, 0, 0.08], [420, 0.05, 0.12]],
      push: [[180, 0, 0.08], [260, 0.05, 0.12]],
      move: [[135, 0, 0.04]],
      blocked: [[95, 0, 0.05]]
    }[name] ?? [];
    for (const [frequency, delay, duration] of notes) this.voice(frequency, delay, duration, MIX.effectVoice, "square", 8);
    if (name === "dock") {
      for (let i = 0; i < detail; i += 1) this.voice(520 + i * 90, 0.12 + i * 0.06, 0.2, MIX.effectVoice, "triangle", 12);
    }
  }

  scheduleTheme(generation) {
    if (this.scene !== "play" || generation !== this.musicGeneration) return;
    for (let step = 0; step < THEME_STEPS; step += 1) {
      const delay = step * THEME_STEP_MS / 1000;
      if (melody[step]) this.voice(melody[step], delay, 0.19, MIX.musicVoice, "square", 18, true);
      if (bass[step]) this.voice(bass[step], delay, 0.21, MIX.musicVoice, "triangle", 5, true);
    }
    this.musicTimer = this.timers.setTimeout(
      () => this.scheduleTheme(generation),
      THEME_STEP_MS * THEME_STEPS
    );
  }

  setScene(scene, delay = 0) {
    if (scene === this.scene) return;
    this.scene = scene;
    this.musicGeneration += 1;
    if (this.musicTimer !== null) this.timers.clearTimeout(this.musicTimer);
    this.musicTimer = null;
    for (const node of this.musicNodes) {
      try { node.stop(this.context.currentTime); } catch { /* already stopped */ }
    }
    this.musicNodes.clear();
    if (scene === "play") {
      const generation = this.musicGeneration;
      this.musicTimer = this.timers.setTimeout(() => this.scheduleTheme(generation), delay * 1000);
    }
  }
}
