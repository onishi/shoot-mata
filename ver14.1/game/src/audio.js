export const AUDIO_PROFILES = [
  { id: "open-harbor", label: "OPEN HARBOR", tempo: .34, wave: "square", notes: [110, 165, 220, 165], rhythm: [1, 0, .55, 0], droneHz: 55, droneWave: "triangle", droneGain: .009, waterHz: 1450, waterQ: .65 },
  { id: "flooded-arcade", label: "FLOODED ARCADE", tempo: .24, wave: "sawtooth", notes: [110, 220, 247, 196, 147, 220], rhythm: [1, .38, 0, .72, 0, .42], droneHz: 73, droneWave: "sine", droneGain: .007, waterHz: 980, waterQ: 1.25 },
  { id: "underflow", label: "UNDERFLOW", tempo: .46, wave: "triangle", notes: [98, 196, 147, 294], rhythm: [1, 0, 0, .42], droneHz: 41, droneWave: "sine", droneGain: .014, waterHz: 420, waterQ: 2.4 },
  { id: "convoy", label: "CONVOY", tempo: .31, wave: "square", notes: [82, 165, 247, 330, 247, 165], rhythm: [1, .26, .7, 0, .44, 0], droneHz: 62, droneWave: "sawtooth", droneGain: .009, waterHz: 1120, waterQ: .9 },
  { id: "stormwall", label: "STORMWALL", tempo: .205, wave: "sawtooth", notes: [73, 147, 220, 294], rhythm: [1, .52, .78, .36], droneHz: 49, droneWave: "square", droneGain: .011, waterHz: 1880, waterQ: 1.5 },
  { id: "leviathan", label: "LEVIATHAN", tempo: .275, wave: "square", notes: [65, 98, 131, 196, 131], rhythm: [1, 0, .82, .34, 0], droneHz: 33, droneWave: "sawtooth", droneGain: .016, waterHz: 610, waterQ: 2.8 }
];

export function audioProfile(section) {
  return AUDIO_PROFILES[Math.max(0, Math.min(AUDIO_PROFILES.length - 1, Number(section) || 0))];
}

export function motionFeedback(boatV = 0, surgeTime = 0, steering = 0) {
  const velocity = Math.max(-1, Math.min(1, boatV / 1.4));
  const intent = Math.max(-1, Math.min(1, steering));
  return {
    bank: Math.max(-0.032, Math.min(0.032, velocity * 0.026 + intent * 0.008)),
    roll: Math.max(-0.23, Math.min(0.23, velocity * 0.2 + intent * 0.055)),
    pan: Math.max(-0.62, Math.min(0.62, velocity * 0.5 + intent * 0.1)),
    rush: 1 + Math.abs(velocity) * 0.48 + (surgeTime > 0 ? 0.78 : 0)
  };
}

export class ArcadeAudio {
  constructor() {
    this.context = null; this.beat = 0; this.timer = 0;
    this.engine = null; this.engineGain = null; this.waterFilter = null; this.waterPan = null; this.waterGain = null;
    this.drone = null; this.droneGain = null; this.lastSection = -1; this.transitionCount = 0;
    this.lastMix = { playing: false, engineHz: 0, engineGain: 0, waterGain: 0, profile: audioProfile(0).id };
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
    const waterPan = this.context.createStereoPanner();
    const waterGain = this.context.createGain();
    water.buffer = buffer; water.loop = true;
    waterFilter.type = "bandpass"; waterFilter.frequency.value = 1150; waterFilter.Q.value = 0.7;
    waterGain.gain.value = 0;
    water.connect(waterFilter).connect(waterPan).connect(waterGain).connect(this.context.destination);

    const drone = this.context.createOscillator();
    const droneFilter = this.context.createBiquadFilter();
    const droneGain = this.context.createGain();
    drone.type = "triangle"; drone.frequency.value = 55;
    droneFilter.type = "lowpass"; droneFilter.frequency.value = 190; droneFilter.Q.value = 1.2;
    droneGain.gain.value = 0;
    drone.connect(droneFilter).connect(droneGain).connect(this.context.destination);
    engine.start(); water.start(); drone.start();
    this.engine = engine; this.engineGain = engineGain; this.waterFilter = waterFilter; this.waterPan = waterPan; this.waterGain = waterGain;
    this.drone = drone; this.droneGain = droneGain;
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
  transition(section) {
    const profile = audioProfile(section);
    const roots = [220, 196, 147, 165, 110, 82];
    const root = roots[Math.max(0, Math.min(roots.length - 1, section))];
    this.tone(root, .2, profile.wave, .045, 1.5);
    setTimeout(() => this.tone(root * 1.5, .28, profile.wave, .04, section === 5 ? .55 : 1.2), 115);
    if (section >= 3) this.tone(root / 2, .48, "sawtooth", .035, .7);
    this.transitionCount += 1;
  }
  update(dt, playing, section, boatV = 0, surgeTime = 0, depth = 0, steering = 0) {
    if (!this.context) return;
    const now = this.context.currentTime;
    const profile = audioProfile(section);
    const motion = motionFeedback(boatV, surgeTime, steering);
    if (playing && section !== this.lastSection) {
      this.lastSection = section; this.beat = 0; this.timer = 0; this.transition(section);
    }
    const throttle = playing ? Math.min(1, Math.abs(boatV) * 0.45 + (surgeTime > 0 ? 0.7 : 0.18)) : 0;
    const engineHz = (72 + throttle * 74 + section * 7) * (1 - depth * .24);
    const engineGain = playing ? (0.018 + throttle * 0.024 + depth * .006) * this.masterVolume : 0;
    const waterGain = playing ? (0.012 + throttle * 0.025 + depth * .018) * this.masterVolume : 0;
    this.engine.frequency.setTargetAtTime(engineHz, now, 0.055);
    this.engineGain.gain.setTargetAtTime(engineGain, now, 0.08);
    this.waterGain.gain.setTargetAtTime(waterGain, now, 0.1);
    this.waterPan.pan.setTargetAtTime(playing ? motion.pan : 0, now, 0.045);
    this.waterFilter.frequency.setTargetAtTime(profile.waterHz * (1 - depth * .34), now, .18);
    this.waterFilter.Q.setTargetAtTime(profile.waterQ, now, .18);
    this.drone.type = profile.droneWave;
    this.drone.frequency.setTargetAtTime(profile.droneHz * (1 - depth * .12), now, .2);
    const droneGain = playing ? profile.droneGain * (section === 2 ? 1 + depth * .65 : 1) * this.masterVolume : 0;
    this.droneGain.gain.setTargetAtTime(droneGain, now, .16);
    this.lastMix = { playing, section, profile: profile.id, label: profile.label, tempo: profile.tempo, rhythm: profile.rhythm.join("/"), wave: profile.wave, engineHz, engineGain, waterGain, waterPan: playing ? motion.pan : 0, waterHz: profile.waterHz, droneHz: profile.droneHz, droneGain, depth, transitionCount: this.transitionCount };
    if (!playing) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      const step = this.beat++;
      const accent = profile.rhythm[step % profile.rhythm.length];
      const note = profile.notes[step % profile.notes.length];
      if (accent > 0) {
        this.tone(note, Math.min(.24, profile.tempo * .72), profile.wave, .012 + accent * .012, section === 2 ? .82 : 1);
        this.tone(note / 2, .09 + accent * .06, "triangle", .014 + accent * .014, .96);
        if (section === 3 || section === 4) this.tone(section === 4 ? 58 : 92, .055, "square", .012 + accent * .009, .58);
      }
      this.timer = profile.tempo;
    }
  }
  inspect() { return { active: Boolean(this.context), state: this.context?.state ?? "closed", masterVolume: this.masterVolume, ...this.lastMix }; }
}
