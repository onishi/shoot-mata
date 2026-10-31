import type { AppScreen } from '../app/app';
import type { GameEvent, GameState, StageId } from '../core/types';

type Bus = 'music' | 'se' | 'ui' | 'environment';
type Cue = 'shot' | 'annotation' | 'candidate' | 'collate' | 'collate-miss' | 'retrace-start' | 'retrace-end' | 'damage' | 'warning' | 'ui-confirm' | 'ui-back'
  | 'wind-left' | 'wind-right' | 'wind-lock' | 'seam-exposed' | 'seam-hit' | 'compiler-phase';
type StemName = 'ambient' | 'pulse' | 'crisis';

const commonFiles: Record<Exclude<Cue, 'wind-left' | 'wind-right' | 'wind-lock' | 'seam-exposed' | 'seam-hit' | 'compiler-phase'>, string> = {
  shot: 'stage-01/shot-v1.wav', annotation: 'stage-01/annotation-v1.wav', candidate: 'stage-01/candidate-v1.wav', collate: 'stage-01/collate-v1.wav',
  'collate-miss': 'stage-01/collate-miss-v1.wav', 'retrace-start': 'stage-01/retrace-start-v1.wav', 'retrace-end': 'stage-01/retrace-end-v1.wav',
  damage: 'stage-01/damage-v1.wav', warning: 'stage-01/warning-v1.wav', 'ui-confirm': 'stage-01/ui-confirm-v1.wav', 'ui-back': 'stage-01/ui-back-v1.wav'
};
const stageTwoFiles = {
  'wind-left': 'stage-02/crosswind-left-v1.wav', 'wind-right': 'stage-02/crosswind-right-v1.wav', 'wind-lock': 'stage-02/wind-lock-v1.wav',
  'seam-exposed': 'stage-02/seam-exposed-v1.wav', 'seam-hit': 'stage-02/seam-hit-v1.wav', 'compiler-phase': 'stage-02/compiler-phase-v1.wav'
} as const;
const stemFiles: Partial<Record<StageId, Record<StemName, string>>> = {
  'stage-01': { ambient: 'stage-01/harbor-ambient-v1.wav', pulse: 'stage-01/harbor-pulse-v1.wav', crisis: 'stage-01/harbor-crisis-v1.wav' },
  'stage-02': { ambient: 'stage-02/crosswind-ambient-v1.wav', pulse: 'stage-02/crosswind-pulse-v1.wav', crisis: 'stage-02/crosswind-crisis-v1.wav' }
};
const files = { ...commonFiles, ...stageTwoFiles, ...Object.fromEntries(Object.entries(stemFiles).flatMap(([stage, stems]) => Object.entries(stems).map(([name, file]) => [`${stage}-${name}`, file]))) };

const cueRules: Record<Cue, { bus: Bus; gain: number; cooldown: number; max: number }> = {
  shot: { bus: 'se', gain: 0.45, cooldown: 0.055, max: 3 }, annotation: { bus: 'se', gain: 0.45, cooldown: 0.045, max: 3 },
  candidate: { bus: 'se', gain: 0.5, cooldown: 0.2, max: 1 }, collate: { bus: 'se', gain: 0.72, cooldown: 0.08, max: 2 },
  'collate-miss': { bus: 'se', gain: 0.48, cooldown: 0.1, max: 2 }, 'retrace-start': { bus: 'se', gain: 0.55, cooldown: 0.1, max: 1 },
  'retrace-end': { bus: 'se', gain: 0.48, cooldown: 0.1, max: 1 }, damage: { bus: 'se', gain: 0.81, cooldown: 0.2, max: 2 },
  warning: { bus: 'se', gain: 0.81, cooldown: 0.35, max: 2 }, 'ui-confirm': { bus: 'ui', gain: 0.57, cooldown: 0.06, max: 2 },
  'ui-back': { bus: 'ui', gain: 0.57, cooldown: 0.06, max: 2 }, 'wind-left': { bus: 'environment', gain: 0.58, cooldown: 0.3, max: 1 },
  'wind-right': { bus: 'environment', gain: 0.58, cooldown: 0.3, max: 1 }, 'wind-lock': { bus: 'se', gain: 0.7, cooldown: 0.25, max: 1 },
  'seam-exposed': { bus: 'se', gain: 0.62, cooldown: 0.25, max: 1 }, 'seam-hit': { bus: 'se', gain: 0.68, cooldown: 0.07, max: 3 },
  'compiler-phase': { bus: 'se', gain: 0.76, cooldown: 0.3, max: 1 }
};

export const cueForEvent = (event: GameEvent, stageId: StageId = 'stage-01'): { cue: Cue; rate: number } | null => {
  if (event.type === 'wind-reversed') return { cue: event.direction < 0 ? 'wind-left' : 'wind-right', rate: 1 };
  if (event.type === 'compiler-wind-locked') return { cue: 'wind-lock', rate: event.direction < 0 ? 0.94 : 1.06 };
  if (event.type === 'compiler-seam-exposed') return { cue: 'seam-exposed', rate: event.side < 0 ? 0.96 : 1.04 };
  if (event.type === 'compiler-seam-hit') return { cue: 'seam-hit', rate: 1 };
  if (event.type === 'shot-fired') return { cue: 'shot', rate: 1 };
  if (event.type === 'shot-annotated') return { cue: 'annotation', rate: 1 };
  if (event.type === 'loop-ready') return { cue: 'candidate', rate: 1 };
  if (event.type === 'loop-collated') return { cue: 'collate', rate: event.captured >= 12 ? 1.24 : event.captured >= 4 ? 1.1 : 0.96 };
  if (event.type === 'collate-missed') return { cue: 'collate-miss', rate: 1 };
  if (event.type === 'retrace-started') return { cue: 'retrace-start', rate: 1 };
  if (event.type === 'retrace-ended') return { cue: 'retrace-end', rate: 1 };
  if (event.type === 'damage') return { cue: 'damage', rate: 1 };
  if (stageId === 'stage-02' && (event.type === 'boss-spawned' || event.type === 'boss-phase')) return { cue: 'compiler-phase', rate: event.type === 'boss-phase' ? 0.9 + event.phase * 0.1 : 0.86 };
  if (event.type === 'boss-spawned' || event.type === 'boss-warning') return { cue: 'warning', rate: 1 };
  if (event.type === 'boss-phase') return { cue: 'warning', rate: 1 + event.phase * 0.06 };
  if (event.type === 'boss-defeated' || event.type === 'enemy-defeated') return { cue: 'collate', rate: event.type === 'boss-defeated' ? 0.74 : 1.34 };
  return null;
};

interface ActiveVoice { source: AudioBufferSourceNode; cue: Cue; bus: Bus }

export class StageOneAudio {
  private context: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private buses = new Map<Bus, GainNode>();
  private active = new Set<ActiveVoice>();
  private lastPlayed = new Map<Cue, number>();
  private cueCounts = new Map<Cue, number>();
  private stems: Array<{ source: AudioBufferSourceNode; name: StemName; gain: GainNode }> = [];
  private loading: Promise<void> | null = null;
  private desiredScreen: AppScreen = 'title';
  private desiredTick = 0;
  private desiredStage: StageId = 'stage-01';
  private activeStemStage: StageId | null = null;
  private busLevels: Record<Bus, number> = { music: 0.5, se: 0.42, ui: 0.35, environment: 0.45 };
  private peakVoices = { se: 0, ui: 0, music: 0, environment: 0 };

  async ensureStarted(): Promise<void> {
    if (!this.context) this.createGraph();
    if (!this.context) return;
    this.loading ??= this.loadBuffers();
    await Promise.all([this.loading, this.context.resume()]);
    if (this.desiredScreen === 'playing' && this.stems.length === 0) this.startStems(this.desiredTick, this.desiredStage);
  }

  private createGraph(): void {
    this.context = new AudioContext({ latencyHint: 'interactive' });
    const limiter = this.context.createDynamicsCompressor();
    limiter.threshold.value = -1.1; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.003; limiter.release.value = 0.12;
    limiter.connect(this.context.destination);
    for (const name of Object.keys(this.busLevels) as Bus[]) {
      const node = this.context.createGain(); node.gain.value = this.busLevels[name]; node.connect(limiter); this.buses.set(name, node);
    }
  }

  private async loadBuffers(): Promise<void> {
    if (!this.context) return;
    await Promise.all(Object.entries(files).map(async ([id, file]) => {
      const response = await fetch(`${import.meta.env.BASE_URL}assets/audio/${file}`);
      if (!response.ok) throw new Error(`Unable to load audio ${file}`);
      this.buffers.set(id, await this.context!.decodeAudioData(await response.arrayBuffer()));
    }));
  }

  private startStems(tick: number, stageId: StageId): void {
    if (!this.context || this.context.state !== 'running') return;
    this.stopStems();
    for (const name of ['ambient', 'pulse', 'crisis'] as const) {
      const buffer = this.buffers.get(`${stageId}-${name}`); if (!buffer) continue;
      const source = this.context.createBufferSource(); const gain = this.context.createGain();
      source.buffer = buffer; source.loop = true; source.connect(gain); gain.connect(this.buses.get(name === 'ambient' ? 'environment' : 'music')!);
      gain.gain.value = name === 'ambient' ? 0.4 : name === 'pulse' ? 0.12 : 0;
      source.start(0, (tick / 120) % buffer.duration); this.stems.push({ source, name, gain });
    }
    this.activeStemStage = stageId;
    this.peakVoices.environment = Math.max(this.peakVoices.environment, 1);
    this.peakVoices.music = Math.max(this.peakVoices.music, 2);
  }

  private stopStems(): void {
    const now = this.context?.currentTime ?? 0;
    for (const stem of this.stems) {
      stem.gain.gain.cancelScheduledValues(now); stem.gain.gain.setValueAtTime(stem.gain.gain.value, now); stem.gain.gain.linearRampToValueAtTime(0, now + 0.04);
      try { stem.source.stop(now + 0.045); } catch { /* already stopped */ }
      stem.source.onended = () => { stem.source.disconnect(); stem.gain.disconnect(); };
    }
    this.stems = []; this.activeStemStage = null;
  }

  setScreen(screen: AppScreen, tick: number, stageId: StageId = this.desiredStage): void {
    const wasPlaying = this.desiredScreen === 'playing'; const stageChanged = stageId !== this.desiredStage;
    this.desiredScreen = screen; this.desiredTick = tick; this.desiredStage = stageId;
    if (!this.context) return;
    if (screen === 'playing' && (!wasPlaying || stageChanged)) this.startStems(tick, stageId);
    else if (screen !== 'playing' && wasPlaying) this.stopStems();
  }

  updateMix(state: GameState): void {
    this.desiredTick = state.tick; this.desiredStage = state.stageId;
    const pulse = Math.min(0.28, 0.1 + state.enemies.length * 0.012 + state.bullets.filter((bullet) => bullet.kind === 'enemy').length * 0.0015 + (state.boss ? 0.07 : 0));
    const crisis = state.boss ? 0.1 + state.boss.phase * 0.06 : 0;
    const now = this.context?.currentTime ?? 0;
    for (const stem of this.stems) stem.gain.gain.setTargetAtTime(stem.name === 'ambient' ? 0.4 : stem.name === 'pulse' ? pulse : crisis, now, 0.18);
  }

  playEvent(event: GameEvent, stageId: StageId = this.desiredStage): void { const mapped = cueForEvent(event, stageId); if (mapped) this.play(mapped.cue, mapped.rate); }
  playUi(back = false): void { this.play(back ? 'ui-back' : 'ui-confirm', 1); }

  private play(cue: Cue, rate: number): void {
    if (!this.context || this.context.state !== 'running') return;
    const rule = cueRules[cue]; const now = this.context.currentTime;
    if (now - (this.lastPlayed.get(cue) ?? -100) < rule.cooldown) return;
    const sameCue = [...this.active].filter((voice) => voice.cue === cue).length;
    const sameBus = [...this.active].filter((voice) => voice.bus === rule.bus).length;
    const busLimit = rule.bus === 'se' ? 24 : rule.bus === 'ui' ? 4 : rule.bus === 'environment' ? 8 : 6;
    if (sameCue >= rule.max || sameBus >= busLimit) return;
    const buffer = this.buffers.get(cue); if (!buffer) return;
    const source = this.context.createBufferSource(); const gain = this.context.createGain();
    source.buffer = buffer; source.playbackRate.value = rate; gain.gain.value = rule.gain; source.connect(gain); gain.connect(this.buses.get(rule.bus)!);
    const voice = { source, cue, bus: rule.bus }; this.active.add(voice); this.lastPlayed.set(cue, now); this.cueCounts.set(cue, (this.cueCounts.get(cue) ?? 0) + 1);
    this.peakVoices[rule.bus] = Math.max(this.peakVoices[rule.bus], sameBus + 1);
    source.onended = () => { this.active.delete(voice); source.disconnect(); gain.disconnect(); }; source.start();
  }

  setBusLevel(bus: Bus, level: number): void {
    const value = Math.max(0, Math.min(1, level)); this.busLevels[bus] = value === 0 ? 0 : value * value;
    this.buses.get(bus)?.gain.setTargetAtTime(this.busLevels[bus], this.context?.currentTime ?? 0, 0.02);
  }

  snapshot() {
    return { state: this.context?.state ?? 'uninitialized', loaded: this.buffers.size, stems: this.stems.length, stemStage: this.activeStemStage, active: this.active.size, peakVoices: { ...this.peakVoices }, busLevels: { ...this.busLevels }, cueCounts: Object.fromEntries(this.cueCounts) };
  }
}
