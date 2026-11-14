export class ArcadeAudio {
  constructor() { this.context = null; this.beat = 0; this.timer = 0; }
  ensure() {
    if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
    if (this.context.state === "suspended") this.context.resume();
  }
  tone(frequency, duration, type = "square", gain = 0.05, slide = 1) {
    if (!this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const volume = this.context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * slide), now + duration);
    volume.gain.setValueAtTime(gain, now); volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(volume).connect(this.context.destination); oscillator.start(now); oscillator.stop(now + duration);
  }
  surge() { this.ensure(); this.tone(120, .28, "sawtooth", .08, 4.2); this.tone(70, .38, "triangle", .09, 1.8); }
  rescue() { this.tone(520, .12, "square", .055, 1.5); setTimeout(() => this.tone(780, .18, "square", .045, 1.25), 85); }
  hit() { this.tone(100, .32, "sawtooth", .1, .45); }
  update(dt, playing, section) {
    if (!this.context || !playing) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      const sequences = [[110,165,220,165],[110,220,247,196],[98,196,294,247],[82,165,247,330]];
      const note = sequences[section][this.beat++ % 4];
      this.tone(note, .18, "square", .018, 1);
      this.tone(note / 2, .11, "triangle", .025, .98);
      this.timer = .27;
    }
  }
}
