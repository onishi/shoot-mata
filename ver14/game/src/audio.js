export class ArcadeAudio {
  constructor() {
    this.context = null; this.beat = 0; this.timer = 0;
    this.engine = null; this.engineGain = null; this.waterGain = null;
    this.lastMix = { playing: false, engineHz: 0, engineGain: 0, waterGain: 0 };
    this.masterVolume = 0.8;
  }
  setVolume(value) { this.masterVolume = Math.max(0, Math.min(1, Number(value) || 0)); }
  ensure() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.startContinuousLayers();
    }
    if (this.context.state === "suspended") this.context.resume();
  }
  startContinuousLayers() {
    const engine = this.context.createOscillator();
    const engineBody = this.context.createBiquadFilter();
    const engineGain = this.context.createGain();
    engine.type = "sawtooth"; engine.frequency.value = 74;
    engineBody.type = "lowpass"; engineBody.frequency.value = 260; engineBody.Q.value = 1.8;
    engineGain.gain.value = 0;
    engine.connect(engineBody).connect(engineGain).connect(this.context.destination);

    const length = Math.max(1, Math.floor(this.context.sampleRate * 1.5));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (0.35 + Math.sin(i * 0.013) * 0.15);
    const water = this.context.createBufferSource();
    const waterFilter = this.context.createBiquadFilter();
    const waterGain = this.context.createGain();
    water.buffer = buffer; water.loop = true;
    waterFilter.type = "bandpass"; waterFilter.frequency.value = 1150; waterFilter.Q.value = 0.7;
    waterGain.gain.value = 0;
    water.connect(waterFilter).connect(waterGain).connect(this.context.destination);
    engine.start(); water.start();
    this.engine = engine; this.engineGain = engineGain; this.waterGain = waterGain;
  }
  tone(frequency, duration, type = "square", gain = 0.05, slide = 1) {
    if (!this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const volume = this.context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * slide), now + duration);
    volume.gain.setValueAtTime(gain * this.masterVolume, now); volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(volume).connect(this.context.destination); oscillator.start(now); oscillator.stop(now + duration);
  }
  surge() { this.ensure(); this.tone(120, .28, "sawtooth", .08, 4.2); this.tone(70, .38, "triangle", .09, 1.8); }
  rescue() { this.tone(520, .12, "square", .055, 1.5); setTimeout(() => this.tone(780, .18, "square", .045, 1.25), 85); }
  nearMiss(chain = 1) { this.tone(880 + Math.min(5, chain) * 75, .11, "square", .045, 1.35); this.tone(190, .16, "triangle", .035, .72); }
  hit() { this.tone(100, .32, "sawtooth", .1, .45); }
  coreBreak() {
    this.tone(58, 1.25, "sawtooth", .14, .42);
    this.tone(860, .42, "square", .07, .18);
    setTimeout(() => this.tone(170, .9, "triangle", .1, .5), 210);
  }
  collapse(stage) {
    if (stage === 1) { this.tone(74, 1.1, "sawtooth", .11, .45); this.tone(310, .7, "triangle", .06, 1.7); }
    if (stage === 2) { this.tone(92, 1.35, "sawtooth", .12, .38); this.tone(48, 1.5, "triangle", .1, .72); }
    if (stage === 3) { [262, 392, 523, 784].forEach((note, index) => setTimeout(() => this.tone(note, .34, "square", .055, 1.08), index * 135)); }
  }
  update(dt, playing, section, boatV = 0, surgeTime = 0, depth = 0) {
    if (!this.context) return;
    const now = this.context.currentTime;
    const throttle = playing ? Math.min(1, Math.abs(boatV) * 0.45 + (surgeTime > 0 ? 0.7 : 0.18)) : 0;
    const engineHz = (72 + throttle * 74 + section * 7) * (1 - depth * .24);
    const engineGain = playing ? (0.018 + throttle * 0.024 + depth * .006) * this.masterVolume : 0;
    const waterGain = playing ? (0.012 + throttle * 0.025 + depth * .018) * this.masterVolume : 0;
    this.engine.frequency.setTargetAtTime(engineHz, now, 0.055);
    this.engineGain.gain.setTargetAtTime(engineGain, now, 0.08);
    this.waterGain.gain.setTargetAtTime(waterGain, now, 0.1);
    this.lastMix = { playing, engineHz, engineGain, waterGain, depth };
    if (!playing) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      const sequences = [[110,165,220,165],[110,220,247,196],[98,196,294,247],[82,165,247,330],[73,147,220,294],[65,98,131,196]];
      const note = sequences[section][this.beat++ % 4];
      this.tone(note, .18, "square", .018, 1);
      this.tone(note / 2, .11, "triangle", .025, .98);
      this.timer = .27;
    }
  }
  inspect() { return { active: Boolean(this.context), state: this.context?.state ?? "closed", masterVolume: this.masterVolume, ...this.lastMix }; }
}
