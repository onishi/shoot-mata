export const gameLength = 90;
export const waves = [
  [0, 300, 280, 'runner'],
  [1, 470, 280, 'runner'],
  [12, 650, 335, 'runner'],
  [15, 115, 240, 'runner'],
  [23, 630, 220, 'roller'],
  [30, 80, 330, 'runner'],
  [38, 630, 330, 'roller'],
  [49, 650, 240, 'roller'],
  [54, 90, 330, 'runner'],
  [64, 650, 285, 'foreman'],
  [65, 120, 230, 'runner'],
  [72, 650, 330, 'runner'],
  [80, 100, 340, 'runner'],
];

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function createGame() {
  return {
    x: 245, y: 280, facing: 1, time: 0, wave: 0, hp: 5, score: 0,
    grab: null, dodge: 0, invulnerable: 0, enemies: [], over: null, foremanDefeated: false,
  };
}

export function grabTarget(game) {
  let target = null;
  let nearest = 74;
  for (const enemy of game.enemies) {
    if (enemy.kind === 'foreman' || enemy.flight || enemy.hp <= 0) continue;
    const gap = distance(enemy, game);
    if (gap >= nearest) continue;
    target = enemy;
    nearest = gap;
  }
  return target;
}

export function step(game, input, dt, emit = () => {}) {
  if (game.over) return;
  game.time += dt;
  game.dodge = Math.max(0, game.dodge - dt);
  game.invulnerable = Math.max(0, game.invulnerable - dt);
  while (waves[game.wave]?.[0] <= game.time) {
    const [, x, y, kind] = waves[game.wave++];
    game.enemies.push({ x, y, kind, hp: kind === 'foreman' ? 3 : 1, clock: 0, flight: 0 });
  }

  const dx = Number(input.right) - Number(input.left);
  const dy = Number(input.down) - Number(input.up);
  if (dx) game.facing = Math.sign(dx);
  if (input.dodge && !game.dodge) {
    game.dodge = 0.26;
    emit('dodge', game);
  }
  const speed = game.dodge > 0.10 ? 430 : game.grab ? 105 : 170;
  const norm = Math.hypot(dx, dy) || 1;
  game.x = clamp(game.x + (dx || (game.dodge > 0.10 && !dy ? game.facing : 0)) * speed * dt / norm, 42, 758);
  game.y = clamp(game.y + dy * speed * dt / norm, 191, 378);

  if (input.grab) {
    if (game.grab) {
      game.grab.flight = 0.78;
      game.grab.velocity = game.facing * 570;
      emit('throw', game.grab);
      game.grab = null;
    } else {
      const target = grabTarget(game);
      if (target) {
        game.grab = target;
        emit('grab', target);
      } else {
        emit('miss', game);
      }
    }
  }

  for (const enemy of game.enemies) {
    if (enemy.hp <= 0) continue;
    if (enemy === game.grab) {
      enemy.x = game.x + game.facing * 29;
      enemy.y = game.y;
      continue;
    }
    if (enemy.flight) {
      enemy.x += enemy.velocity * dt;
      enemy.flight -= dt;
      const target = game.enemies.find(other => other !== enemy && other !== game.grab &&
        other.hp > 0 && !other.flight && distance(other, enemy) < (other.kind === 'foreman' ? 48 : 33));
      if (target) {
        target.hp--;
        if (target.kind === 'foreman' && !target.hp) game.foremanDefeated = true;
        game.score += target.kind === 'foreman' ? 500 : 200;
        emit('impact', target);
      }
      if (target || enemy.flight <= 0 || enemy.x < 30 || enemy.x > 770) {
        enemy.hp = 0;
        if (!target) emit('impact', enemy);
      }
      continue;
    }
    const gap = distance(enemy, game);
    enemy.clock = (enemy.clock + dt) % 3;
    const charging = enemy.kind !== 'runner' && enemy.clock >= 2.15 && enemy.clock < 2.55;
    const speed = enemy.kind === 'runner' ? 36 : enemy.clock < 1.55 ? 31 : charging ? 156 : 0;
    if (gap > 1) {
      enemy.x += (game.x - enemy.x) * speed * dt / gap;
      enemy.y += (game.y - enemy.y) * speed * dt / gap;
    }
    if ((charging || enemy.kind === 'runner') && gap < 25 && !game.invulnerable && game.dodge <= 0.10) {
      game.hp--;
      game.invulnerable = 1.15;
      emit('hit', game);
    }
  }
  game.enemies = game.enemies.filter(enemy => enemy.hp > 0);
  if (!game.hp) game.over = '停止';
  else if (game.foremanDefeated) game.over = '鎮圧成功';
  else if (game.time >= gameLength) game.over = '時間切れ';
}
