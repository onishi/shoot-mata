import type { Input } from './game.ts';

export interface Vector { x: number; y: number }

export function stickVector(centerX: number, centerY: number, x: number, y: number, radius: number): Vector {
  if (radius <= 0) return { x: 0, y: 0 };
  const dx = x - centerX;
  const dy = y - centerY;
  const length = Math.hypot(dx, dy);
  const scale = length > radius ? radius / length : 1;
  return { x: dx * scale / radius, y: dy * scale / radius };
}

export function combineInput(keyboard: Input, touch: Input): Input {
  return {
    x: Math.max(-1, Math.min(1, keyboard.x + touch.x)),
    y: Math.max(-1, Math.min(1, keyboard.y + touch.y)),
    fire: keyboard.fire || touch.fire,
  };
}

export class TouchControls {
  private stick: HTMLElement;
  private knob: HTMLElement;
  private fire: HTMLButtonElement;
  private stickPointer: number | null = null;
  private firePointer: number | null = null;
  private vector: Vector = { x: 0, y: 0 };
  private firing = false;

  constructor(
    stick: HTMLElement,
    knob: HTMLElement,
    fire: HTMLButtonElement,
    switchButton: HTMLButtonElement,
    burstButton: HTMLButtonElement,
    pauseButton: HTMLButtonElement,
    actions: { switchMode: () => void; burst: () => void; pause: () => void },
  ) {
    this.stick = stick;
    this.knob = knob;
    this.fire = fire;
    stick.addEventListener('pointerdown', event => {
      if (this.stickPointer !== null) return;
      event.preventDefault();
      this.stickPointer = event.pointerId;
      stick.setPointerCapture(event.pointerId);
      this.move(event);
    });
    stick.addEventListener('pointermove', event => {
      if (event.pointerId === this.stickPointer) this.move(event);
    });
    const stopStick = (event: PointerEvent) => {
      if (event.pointerId !== this.stickPointer) return;
      this.stickPointer = null;
      this.vector = { x: 0, y: 0 };
      this.showKnob();
    };
    stick.addEventListener('pointerup', stopStick);
    stick.addEventListener('pointercancel', stopStick);

    fire.addEventListener('pointerdown', event => {
      if (this.firePointer !== null) return;
      event.preventDefault();
      this.firePointer = event.pointerId;
      this.firing = true;
      fire.setPointerCapture(event.pointerId);
      fire.classList.add('pressed');
    });
    const stopFire = (event: PointerEvent) => {
      if (event.pointerId !== this.firePointer) return;
      this.firePointer = null;
      this.firing = false;
      fire.classList.remove('pressed');
    };
    fire.addEventListener('pointerup', stopFire);
    fire.addEventListener('pointercancel', stopFire);

    switchButton.addEventListener('pointerdown', event => { event.preventDefault(); actions.switchMode(); });
    burstButton.addEventListener('pointerdown', event => { event.preventDefault(); actions.burst(); });
    pauseButton.addEventListener('click', actions.pause);
  }

  get input(): Input { return { ...this.vector, fire: this.firing }; }

  reset(): void {
    this.stickPointer = null;
    this.firePointer = null;
    this.vector = { x: 0, y: 0 };
    this.firing = false;
    this.showKnob();
    this.fire.classList.remove('pressed');
  }

  private move(event: PointerEvent): void {
    const rect = this.stick.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) * 0.34;
    this.vector = stickVector(rect.left + rect.width / 2, rect.top + rect.height / 2, event.clientX, event.clientY, radius);
    this.showKnob();
  }

  private showKnob(): void {
    const rect = this.stick.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      this.knob.style.left = '50%';
      this.knob.style.top = '50%';
      return;
    }
    const radius = Math.min(rect.width, rect.height) * 0.34;
    this.knob.style.left = `${50 + this.vector.x * radius / rect.width * 100}%`;
    this.knob.style.top = `${50 + this.vector.y * radius / rect.height * 100}%`;
  }
}
