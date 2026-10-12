import type { GameEvent } from './game.ts';

type Tone = { start: number; end: number; seconds: number; volume: number; wave: OscillatorType };
const tones: Partial<Record<GameEvent['kind'], Tone>> = {
  shot: { start: 650, end: 420, seconds: 0.045, volume: 0.015, wave: 'triangle' },
  kill: { start: 180, end: 65, seconds: 0.16, volume: 0.06, wave: 'sawtooth' },
  collect: { start: 520, end: 920, seconds: 0.13, volume: 0.045, wave: 'sine' },
  damage: { start: 190, end: 70, seconds: 0.27, volume: 0.08, wave: 'sawtooth' },
  burst: { start: 120, end: 500, seconds: 0.36, volume: 0.085, wave: 'triangle' },
  switch: { start: 360, end: 520, seconds: 0.09, volume: 0.025, wave: 'square' },
};

export class Sound {
  private context: AudioContext | null = null;
  private enabled = false;
  private lastShot = -1;

  async toggle(): Promise<boolean> {
    try {
      if (this.enabled) {
        this.enabled = false;
        await this.context?.suspend();
      } else {
        this.context ??= new AudioContext();
        await this.context.resume();
        this.enabled = this.context.state === 'running';
      }
    } catch {
      this.enabled = false;
    }
    return this.enabled;
  }

  play(events: GameEvent[]): void {
    const context = this.context;
    if (!this.enabled || !context || context.state !== 'running') return;
    for (const event of events) {
      if (event.kind === 'shot') {
        if (context.currentTime - this.lastShot < 0.09) continue;
        this.lastShot = context.currentTime;
      }
      const tone = tones[event.kind];
      if (!tone) continue;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = tone.wave;
      oscillator.frequency.setValueAtTime(tone.start, now);
      oscillator.frequency.exponentialRampToValueAtTime(tone.end, now + tone.seconds);
      gain.gain.setValueAtTime(tone.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + tone.seconds);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + tone.seconds);
    }
  }
}
