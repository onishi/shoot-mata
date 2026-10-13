import type { GameEvent, GameEventKind } from './game.ts';

interface Effect { kind: GameEventKind; x: number; y: number; value: number; age: number; duration: number }
const duration: Partial<Record<GameEventKind, number>> = {
  kill: 0.42, collect: 0.42, damage: 0.46, burst: 0.58, switch: 0.23,
};

export class Effects {
  private items: Effect[] = [];

  clear(): void { this.items = []; }

  add(event: GameEvent): void {
    const lifetime = duration[event.kind];
    if (!lifetime) return;
    this.items.push({ ...event, value: event.value ?? 1, age: 0, duration: lifetime });
    if (this.items.length > 64) this.items.splice(0, this.items.length - 64);
  }

  update(dt: number): void {
    for (const item of this.items) item.age += Math.min(Math.max(dt, 0), 0.05);
    this.items = this.items.filter(item => item.age < item.duration);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const item of this.items) {
      const progress = item.age / item.duration;
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.lineWidth = 4;
      ctx.translate(item.x, item.y);
      if (item.kind === 'kill') {
        ctx.strokeStyle = '#ff9cad';
        const radius = 14 + progress * (22 + item.value * 8);
        for (let index = 0; index < 8; index++) {
          const angle = index * Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          ctx.lineTo(Math.cos(angle) * (radius + 8), Math.sin(angle) * (radius + 8));
          ctx.stroke();
        }
        ctx.fillStyle = '#f4f7ff';
        ctx.beginPath(); ctx.arc(0, 0, (1 - progress) * 17, 0, Math.PI * 2); ctx.fill();
      } else if (item.kind === 'collect') {
        ctx.strokeStyle = '#7ef2aa';
        ctx.beginPath(); ctx.arc(0, 0, 10 + progress * 28, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#f4f7ff'; ctx.font = 'bold 16px monospace';
        ctx.fillText(`+${item.value}`, 15, -15 - progress * 18);
      } else if (item.kind === 'damage') {
        ctx.strokeStyle = '#ff627e'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, 18 + progress * 42, 0, Math.PI * 2); ctx.stroke();
      } else if (item.kind === 'burst') {
        ctx.strokeStyle = '#7ef2aa'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(0, 0, 25 + progress * 140, 0, Math.PI * 2); ctx.stroke();
      } else if (item.kind === 'switch') {
        ctx.strokeStyle = '#ffe084';
        ctx.beginPath(); ctx.arc(0, 0, 18 + progress * 22, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      }
      ctx.restore();
    }
  }
}
