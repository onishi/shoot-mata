export const WIDTH = 960;
export const HEIGHT = 540;
export type Scene = 'title' | 'play' | 'pause' | 'result';
export type Kind = 'light' | 'heavy' | 'boss';
export interface Point { x: number; y: number }
export interface Bullet extends Point { vx: number; vy: number; radius: number; damage: number; mode?: 'wide' | 'focus' | 'burst' }
export interface Enemy extends Point { kind: Kind; hp: number; radius: number; shotTimer: number; phase: number }
export interface Pickup extends Point { value: number; ttl: number }
export interface GameState {
  scene: Scene; outcome: 'clear' | 'gameover' | null; time: number; score: number;
  lives: number; kills: number; hits: number; wave: number; spawnTimer: number; bossSpawned: boolean;
  mode: 'wide' | 'focus'; energy: number; burstTimer: number;
  player: Point & { invulnerable: number; shotTimer: number };
  bullets: Bullet[]; enemyBullets: Bullet[]; enemies: Enemy[]; pickups: Pickup[];
}
export interface Input { x: number; y: number; fire: boolean }

export function createGame(): GameState {
  return {
    scene: 'title', outcome: null, time: 0, score: 0, lives: 3, kills: 0, hits: 0,
    wave: 0, spawnTimer: 0, bossSpawned: false, mode: 'wide', energy: 0, burstTimer: 0,
    player: { x: 145, y: HEIGHT / 2, invulnerable: 0, shotTimer: 0 },
    bullets: [], enemyBullets: [], enemies: [], pickups: [],
  };
}

export function startGame(): GameState {
  const state = createGame();
  state.scene = 'play';
  return state;
}

export function circlesTouch(a: Point, ar: number, b: Point, br: number): boolean {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy < (ar + br) ** 2;
}

export function toggleMode(state: GameState): void {
  if (state.scene === 'play') state.mode = state.mode === 'wide' ? 'focus' : 'wide';
}

export function activateBurst(state: GameState): boolean {
  if (state.scene !== 'play' || state.energy < 5 || state.burstTimer > 0) return false;
  state.energy = 0;
  state.burstTimer = 1.6;
  state.enemyBullets = [];
  return true;
}

function spawnEnemy(state: GameState): void {
  const heavy = state.wave % 5 === 4;
  state.enemies.push({
    kind: heavy ? 'heavy' : 'light', x: WIDTH + 30,
    y: 90 + ((state.wave * 113) % 350), hp: heavy ? 8 : 2,
    radius: heavy ? 26 : 18, shotTimer: heavy ? 0.5 : 1.5, phase: state.wave * 0.7,
  });
  state.wave++;
}

function hitPlayer(state: GameState): void {
  if (state.player.invulnerable > 0) return;
  state.lives--; state.hits++; state.player.invulnerable = 1.5;
  if (state.lives <= 0) { state.scene = 'result'; state.outcome = 'gameover'; }
}

export function updateGame(state: GameState, input: Input, dt: number): void {
  if (state.scene !== 'play') return;
  const step = Math.min(Math.max(dt, 0), 0.05);
  state.time += step;
  const p = state.player;
  p.invulnerable = Math.max(0, p.invulnerable - step);
  state.burstTimer = Math.max(0, state.burstTimer - step);
  const length = Math.hypot(input.x, input.y) || 1;
  const speed = state.mode === 'focus' ? 220 : 330;
  p.x = Math.max(28, Math.min(WIDTH - 28, p.x + input.x / length * speed * step));
  p.y = Math.max(62, Math.min(HEIGHT - 28, p.y + input.y / length * speed * step));
  p.shotTimer -= step;
  if (input.fire && p.shotTimer <= 0) {
    const burst = state.burstTimer > 0;
    const velocities = burst ? [-130, 0, 130] : state.mode === 'wide' ? [-180, 0, 180] : [0];
    for (const vy of velocities) state.bullets.push({
      x: p.x + 23, y: p.y, vx: 650, vy, radius: burst ? 8 : 5,
      damage: burst ? 3 : state.mode === 'focus' ? 2 : 1, mode: burst ? 'burst' : state.mode,
    });
    p.shotTimer = burst ? 0.09 : state.mode === 'focus' ? 0.12 : 0.25;
  }

  if (!state.bossSpawned && state.time >= 43) {
    state.bossSpawned = true;
    state.enemies.push({ kind: 'boss', x: WIDTH + 70, y: HEIGHT / 2, hp: 60, radius: 53, shotTimer: 1, phase: 0 });
  }
  if (!state.bossSpawned) {
    state.spawnTimer -= step;
    if (state.spawnTimer <= 0) { spawnEnemy(state); state.spawnTimer = state.time < 10 ? 1.7 : 1.1; }
  }

  for (const b of state.bullets) { b.x += b.vx * step; b.y += b.vy * step; }
  for (const b of state.enemyBullets) { b.x += b.vx * step; b.y += b.vy * step; }
  for (const pickup of state.pickups) { pickup.x -= 45 * step; pickup.ttl -= step; }
  for (const e of state.enemies) {
    e.phase += step;
    e.x -= (e.kind === 'boss' ? (e.x > 800 ? 100 : 0) : e.kind === 'heavy' ? 95 : 145) * step;
    if (e.kind === 'boss') e.y = HEIGHT / 2 + Math.sin(e.phase) * 110;
    e.shotTimer -= step;
    if (e.x < WIDTH - 20 && e.shotTimer <= 0) {
      const dx = p.x - e.x, dy = p.y - e.y;
      const distance = Math.hypot(dx, dy) || 1;
      const speed = e.kind === 'boss' ? 210 : 155;
      state.enemyBullets.push({ x: e.x - e.radius, y: e.y, vx: dx / distance * speed, vy: dy / distance * speed, radius: e.kind === 'boss' ? 9 : 7, damage: 1 });
      e.shotTimer = e.kind === 'boss' ? 0.55 : e.kind === 'heavy' ? 1.2 : 2.1;
    }
  }

  const spent = new Set<Bullet>();
  for (const b of state.bullets) for (const e of state.enemies) {
    if (e.hp <= 0 || spent.has(b) || !circlesTouch(b, b.radius, e, e.radius)) continue;
    e.hp -= b.damage; spent.add(b);
    if (e.hp <= 0) {
      state.kills++;
      state.score += e.kind === 'boss' ? 2000 : e.kind === 'heavy' ? 300 : 100;
      if (e.kind !== 'boss') state.pickups.push({ x: e.x, y: e.y, value: e.kind === 'heavy' ? 2 : 1, ttl: 8 });
      if (e.kind === 'boss') {
        state.score += state.lives * 500; state.scene = 'result'; state.outcome = 'clear';
      }
    }
  }
  state.bullets = state.bullets.filter(b => !spent.has(b) && b.x < WIDTH + 20 && b.y > -20 && b.y < HEIGHT + 20);
  state.enemies = state.enemies.filter(e => e.hp > 0 && e.x > -80);
  if (state.scene === 'result') return;
  state.enemyBullets = state.enemyBullets.filter(b => {
    if (circlesTouch(b, b.radius, p, 13)) { hitPlayer(state); return false; }
    return b.x > -20 && b.x < WIDTH + 20 && b.y > -20 && b.y < HEIGHT + 20;
  });
  state.pickups = state.pickups.filter(pickup => {
    if (circlesTouch(pickup, 14, p, 18)) {
      state.energy = Math.min(5, state.energy + pickup.value);
      state.score += 50;
      return false;
    }
    return pickup.ttl > 0 && pickup.x > -20;
  });
  for (const e of state.enemies) if (circlesTouch(e, e.radius, p, 13)) hitPlayer(state);
}
