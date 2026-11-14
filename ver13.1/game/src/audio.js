const CUE_SPECS = Object.freeze({
  coin: [[988, 0.05, 'square'], [1319, 0.12, 'square']],
  start: [[392, 0.08, 'square'], [523, 0.13, 'square']],
  waveStart: [[294, 0.08, 'square'], [440, 0.12, 'square']],
  cast: [[210, 0.09, 'sawtooth'], [315, 0.06, 'square']],
  turn: [[660, 0.05, 'sine'], [880, 0.09, 'sine']],
  outboundHit: [[150, 0.05, 'square'], [300, 0.07, 'square']],
  outboundBreak: [[220, 0.05, 'square'], [440, 0.11, 'sawtooth']],
  sidestep: [[740, 0.04, 'square'], [554, 0.06, 'square'], [831, 0.08, 'sine']],
  refract: [[932, 0.04, 'sine'], [698, 0.05, 'square'], [1047, 0.09, 'sine']],
  mirror: [[392, 0.04, 'square'], [784, 0.05, 'sine'], [392, 0.07, 'square']],
  chorus: [[349, 0.04, 'square'], [523, 0.05, 'square'], [698, 0.08, 'sine']],
  returnBreak: [[196, 0.06, 'square'], [392, 0.08, 'square'], [784, 0.14, 'sawtooth']],
  guard: [[105, 0.08, 'sawtooth'], [118, 0.12, 'square']],
  catch: [[523, 0.06, 'square'], [659, 0.06, 'square'], [988, 0.13, 'sine']],
  miss: [[180, 0.12, 'sawtooth'], [120, 0.18, 'sawtooth']],
  bellHit: [[82, 0.32, 'sine'], [123, 0.24, 'square'], [247, 0.12, 'sawtooth']],
  waveClear: [[330, 0.08, 'square'], [494, 0.08, 'square'], [659, 0.16, 'square']],
  guardianStart: [[98, 0.18, 'sawtooth'], [196, 0.14, 'square'], [392, 0.2, 'square']],
  guardianPhase: [[147, 0.08, 'square'], [294, 0.1, 'sawtooth'], [588, 0.16, 'square']],
  guardianBreak: [[131, 0.1, 'sawtooth'], [262, 0.1, 'square'], [523, 0.12, 'square'], [1047, 0.24, 'sine']],
  guardianClear: [[262, 0.09, 'square'], [392, 0.09, 'square'], [523, 0.09, 'square'], [784, 0.12, 'square'], [1047, 0.28, 'sine']],
  victory: [[392, 0.1, 'square'], [523, 0.1, 'square'], [659, 0.1, 'square'], [1047, 0.28, 'sine']],
  gameOver: [[220, 0.16, 'square'], [165, 0.2, 'square'], [110, 0.35, 'sawtooth']],
  continue: [[196, 0.08, 'square'], [392, 0.08, 'square'], [784, 0.18, 'square']],
  nameEntry: [[330, 0.08, 'square'], [440, 0.08, 'square'], [660, 0.14, 'sine']],
  initial: [[523, 0.05, 'square'], [659, 0.08, 'square']],
  ranking: [[262, 0.08, 'square'], [392, 0.08, 'square'], [523, 0.08, 'square'], [784, 0.2, 'sine']]
});

export const AUDIO_CUES = Object.freeze(Object.keys(CUE_SPECS));
export const AUDIO_CUE_SIGNATURES = Object.freeze(Object.fromEntries(
  Object.entries(CUE_SPECS).map(([cue, spec]) => [cue, JSON.stringify(spec)])
));
export const musicEnabledForState = (mode, paused = false) => mode === 'playing' && !paused;
export const volumeGain = volume => Math.pow(Math.max(0, Math.min(10, volume)) / 10, 1.6);

export const MUSIC_VARIATIONS = Object.freeze([
  { name: 'Dawn Procession', step: 0.19, bass: [98, 98, 131, 147, 98, 196, 165, 131], metal: [392, 494, 523, 659, 392, 784, 659, 494], accents: [1, 3, 5, 7] },
  { name: 'Lantern Vortex', step: 0.17, bass: [110, 147, 110, 165, 123, 196, 147, 220], metal: [440, 587, 659, 587, 494, 740, 659, 880], accents: [0, 3, 4, 7] },
  { name: 'Gale Banner', step: 0.16, bass: [131, 165, 196, 165, 147, 220, 196, 262], metal: [523, 659, 784, 659, 587, 880, 784, 1047], accents: [0, 2, 5, 6] },
  { name: 'Prism Forge', step: 0.21, bass: [82, 123, 165, 123, 92, 147, 185, 147], metal: [659, 494, 831, 554, 740, 587, 988, 659], accents: [1, 2, 5, 6] },
  { name: 'Moon Mirror', step: 0.23, bass: [110, 165, 220, 165, 110, 147, 196, 147], metal: [880, 659, 523, 659, 988, 740, 587, 740], accents: [0, 2, 4, 6] },
  { name: 'Star Chorus', step: 0.15, bass: [131, 196, 165, 247, 147, 220, 196, 294], metal: [523, 784, 659, 988, 587, 880, 784, 1175], accents: [0, 1, 3, 4, 6, 7] }
]);

export const musicVariationForAct = act => MUSIC_VARIATIONS[Math.max(0, Math.min(5, Number.isInteger(act) ? act : 0))];

export class RingwardAudio {
  constructor(contextFactory = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)()) {
    this.contextFactory = contextFactory;
    this.context = null;
    this.master = null;
    this.volume = 7;
    this.musicActive = false;
    this.nextBeat = 0;
    this.beat = 0;
    this.musicAct = 0;
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

  scheduleMusicBeat(act, beat, offset = 0) {
    const variation = musicVariationForAct(act);
    const index = beat % variation.bass.length;
    this.tone(variation.bass[index], 0.17, 'square', offset, 0.035);
    if (variation.accents.includes(index)) this.tone(variation.metal[index], 0.055, 'sine', offset, 0.025);
    return variation.step;
  }

  scheduleMusicSample(act, beats = 16, offset = 0) {
    let cursor = offset;
    for (let beat = 0; beat < beats; beat += 1) {
      cursor += this.scheduleMusicBeat(act, beat, cursor);
    }
    return cursor + 0.2;
  }

  update(mode, paused = false, act = 0) {
    const active = musicEnabledForState(mode, paused);
    if (!this.context || this.volume === 0) {
      this.musicActive = active;
      if (this.context) this.nextBeat = this.context.currentTime;
      return;
    }
    const nextAct = Math.max(0, Math.min(5, Number.isInteger(act) ? act : 0));
    if (active !== this.musicActive || nextAct !== this.musicAct) {
      this.musicActive = active;
      this.musicAct = nextAct;
      this.nextBeat = this.context.currentTime;
      this.beat = 0;
    }
    if (!active) return;
    while (this.nextBeat < this.context.currentTime + 0.12) {
      const offset = Math.max(0, this.nextBeat - this.context.currentTime);
      this.nextBeat += this.scheduleMusicBeat(this.musicAct, this.beat, offset);
      this.beat += 1;
    }
  }
}
