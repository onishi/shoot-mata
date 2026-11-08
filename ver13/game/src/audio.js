const CUE_SPECS = Object.freeze({
  start: [[392, 0.08, 'square'], [523, 0.13, 'square']],
  waveStart: [[294, 0.08, 'square'], [440, 0.12, 'square']],
  cast: [[210, 0.09, 'sawtooth'], [315, 0.06, 'square']],
  turn: [[660, 0.05, 'sine'], [880, 0.09, 'sine']],
  outboundHit: [[150, 0.05, 'square'], [300, 0.07, 'square']],
  outboundBreak: [[220, 0.05, 'square'], [440, 0.11, 'sawtooth']],
  returnBreak: [[196, 0.06, 'square'], [392, 0.08, 'square'], [784, 0.14, 'sawtooth']],
  guard: [[105, 0.08, 'sawtooth'], [118, 0.12, 'square']],
  catch: [[523, 0.06, 'square'], [659, 0.06, 'square'], [988, 0.13, 'sine']],
  miss: [[180, 0.12, 'sawtooth'], [120, 0.18, 'sawtooth']],
  bellHit: [[82, 0.32, 'sine'], [123, 0.24, 'square'], [247, 0.12, 'sawtooth']],
  waveClear: [[330, 0.08, 'square'], [494, 0.08, 'square'], [659, 0.16, 'square']],
  victory: [[392, 0.1, 'square'], [523, 0.1, 'square'], [659, 0.1, 'square'], [1047, 0.28, 'sine']],
  gameOver: [[220, 0.16, 'square'], [165, 0.2, 'square'], [110, 0.35, 'sawtooth']]
});

export const AUDIO_CUES = Object.freeze(Object.keys(CUE_SPECS));
export const AUDIO_CUE_SIGNATURES = Object.freeze(Object.fromEntries(
  Object.entries(CUE_SPECS).map(([cue, spec]) => [cue, JSON.stringify(spec)])
));
export const musicEnabledForState = (mode, paused = false) => mode === 'playing' && !paused;
export const volumeGain = volume => Math.pow(Math.max(0, Math.min(10, volume)) / 10, 1.6);

export class RingwardAudio {
  constructor(contextFactory = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)()) {
    this.contextFactory = contextFactory;
    this.context = null;
    this.master = null;
    this.volume = 7;
    this.musicActive = false;
    this.nextBeat = 0;
    this.beat = 0;
  }

  unlock() {
    if (!this.context) {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass && !this.contextFactory) return false;
      try {
        this.context = this.contextFactory();
        this.master = this.context.createGain();
        this.master.gain.value = volumeGain(this.volume);
        this.master.connect(this.context.destination);
      } catch {
        this.context = null;
        return false;
      }
    }
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    return true;
  }

  setVolume(volume) {
    const wasSilent = this.volume === 0;
    this.volume = Math.max(0, Math.min(10, Number(volume) || 0));
    if (this.master) this.master.gain.setTargetAtTime(volumeGain(this.volume), this.context.currentTime, 0.01);
    if (wasSilent && this.volume > 0 && this.context) {
      this.nextBeat = this.context.currentTime;
      this.beat = 0;
    }
  }

  tone(frequency, duration, wave = 'square', offset = 0, gain = 0.09) {
    if (!this.context || this.volume === 0) return;
    const start = this.context.currentTime + offset;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope); envelope.connect(this.master);
    oscillator.start(start); oscillator.stop(start + duration + 0.02);
  }

  play(cue) {
    const spec = CUE_SPECS[cue];
    if (!spec || !this.context || this.volume === 0) return false;
    let offset = 0;
    for (const [frequency, duration, wave] of spec) {
      this.tone(frequency, duration, wave, offset, cue === 'bellHit' ? 0.13 : 0.09);
      offset += Math.min(duration * 0.58, 0.07);
    }
    return true;
  }

  update(mode, paused = false) {
    const active = musicEnabledForState(mode, paused);
    if (!this.context || this.volume === 0) {
      this.musicActive = active;
      if (this.context) this.nextBeat = this.context.currentTime;
      return;
    }
    if (active !== this.musicActive) {
      this.musicActive = active;
      this.nextBeat = this.context.currentTime;
      this.beat = 0;
    }
    if (!active) return;
    const bass = [98, 98, 131, 147, 98, 196, 165, 131];
    const metal = [392, 494, 523, 659, 392, 784, 659, 494];
    while (this.nextBeat < this.context.currentTime + 0.12) {
      const index = this.beat % bass.length;
      const offset = Math.max(0, this.nextBeat - this.context.currentTime);
      this.tone(bass[index], 0.17, 'square', offset, 0.035);
      if (index % 2 === 1) this.tone(metal[index], 0.055, 'sine', offset, 0.025);
      this.nextBeat += 0.19;
      this.beat += 1;
    }
  }
}
