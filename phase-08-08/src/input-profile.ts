export interface InputFrameSummary {
  count: number;
  meanMs: number;
  p95Ms: number;
  maxMs: number;
}

export class InputFrameProfiler {
  private pending: number[] = [];
  private samples: number[] = [];
  private readonly limit: number;

  constructor(limit = 500) { this.limit = limit; }

  input(at: number): void {
    if (this.samples.length + this.pending.length < this.limit) this.pending.push(at);
  }

  clearPending(): void {
    this.pending = [];
  }

  frame(at: number): InputFrameSummary | null {
    if (!this.pending.length) return null;
    for (const inputAt of this.pending) this.samples.push(Math.max(0, at - inputAt));
    this.pending = [];
    const sorted = [...this.samples].sort((a, b) => a - b);
    return {
      count: sorted.length,
      meanMs: Number((sorted.reduce((sum, value) => sum + value, 0) / sorted.length).toFixed(2)),
      p95Ms: Number(sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(2)),
      maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
    };
  }
}
