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
const carryOffset = 29;
const throwSpeed = 570;
const throwDuration = 0.78;
export const impactRadius = kind => kind === 'foreman' ? 48 : 33;
const shiftDuration = 0.60;
const windupStart = 1.55;
const chargeStart = 2.15;
const chargeEnd = 2.55;
const chargeSpeed = 156;
const attackCycle = 3;
export const rollerContactRadius = 25;
export const rollerRecovering = enemy => enemy.kind === 'roller' && enemy.chargeEndX == null && enemy.clock >= chargeEnd;
export const rollerRecoveryRemaining = enemy => rollerRecovering(enemy)
  ? (attackCycle - enemy.clock) / (attackCycle - chargeEnd)
  : 0;
export const rollerWindupRemaining = enemy => clamp((chargeStart - enemy.clock) / (chargeStart - windupStart), 0, 1);

export function firstThrowContact(game, payload, start, end, y) {
  const direction = Math.sign(end - start);
  const length = Math.abs(end - start);
  let first = null;
  for (const actor of game.enemies) {
    if (actor === payload || actor === game.grab || actor.hp <= 0 || actor.flight || actor.shift) continue;
    const radius = impactRadius(actor.kind);
    const depth = Math.abs(actor.y - y);
    if (depth >= radius) continue;

    const reach = Math.sqrt(radius ** 2 - depth ** 2);
    const along = direction ? (actor.x - start) * direction : Math.abs(actor.x - start);
    if (along + reach <= 0 || along - reach >= length) continue;

    const distance = Math.max(0, along - reach);
    if (!first || distance < first.distance) first = { actor, distance };
  }
  return first;
}

export function throwLane(game) {
  const start = clamp(game.x + game.facing * carryOffset, 30, 770);
  const end = clamp(start + game.facing * throwSpeed * throwDuration, 30, 770);
  return { start, end };
}

export function createGame(practice = false) {
  const game = {
    x: 245, y: 280, facing: 1, time: 0, wave: 0, hp: 5, score: 0,
    grab: null, dodge: 0, invulnerable: 0, enemies: [], over: null, foremanDefeated: false,
  };
  if (practice) {
    game.time = 64;
    game.wave = waves.findIndex(([at]) => at > game.time);
    game.enemies = [
      { x: 420, y: 280, kind: 'foreman', hp: 3, clock: 0, flight: 0 },
      ...[[300, 280], [220, 365], [220, 205]].map(([x, y]) => ({
        x, y, kind: 'runner', hp: 1, clock: 0, flight: 0,
      })),
    ];
  }
  return game;
}

export function grabTarget(game) {
  let target = null;
  let nearest = 74;
  for (const enemy of game.enemies) {
    if (enemy.kind === 'foreman' || enemy.chargeEndX != null || enemy.flight || enemy.recoil > 0 || enemy.hp <= 0) continue;
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
      game.grab.x = throwLane(game).start;
      game.grab.y = game.y;
      game.grab.flight = throwDuration;
      game.grab.velocity = game.facing * throwSpeed;
      emit('throw', game.grab);
      game.grab = null;
    } else {
      const target = grabTarget(game);
      if (target) {
        game.grab = target;
        target.chargeEndX = null;
        emit('grab', target);
      } else {
        emit('miss', game);
      }
    }
  }

  for (const enemy of game.enemies) {
    if (enemy.hp <= 0) continue;
    if (enemy === game.grab) {
      enemy.x = game.x + game.facing * carryOffset;
      enemy.y = game.y;
      continue;
    }
    if (enemy.flight) {
      const start = enemy.x;
      enemy.x = clamp(start + enemy.velocity * Math.min(dt, enemy.flight), 30, 770);
      enemy.flight -= dt;
      const target = firstThrowContact(game, enemy, start, enemy.x, enemy.y)?.actor;
      if (target) {
        target.hp--;
        target.recoil = 0.22;
        target.recoilDirection = Math.sign(enemy.velocity);
        if (target.kind === 'foreman') {
          if (target.hp) {
            target.clock = 1.55;
            target.shift = { progress: 0, from: target.y, to: target.y < 285 ? 365 : 205 };
          } else {
            game.foremanDefeated = true;
          }
        }
        game.score += target.kind === 'foreman' ? 500 : 200;
        emit('impact', target);
      }
      if (target || enemy.flight <= 0 || enemy.x === 30 || enemy.x === 770) {
        enemy.hp = 0;
        if (!target) emit('scrap', enemy);
      }
      continue;
    }
    if (enemy.shift) {
      const shift = enemy.shift;
      shift.progress = Math.min(1, shift.progress + dt / shiftDuration);
      enemy.y = shift.from + (shift.to - shift.from) * shift.progress;
      if (shift.progress === 1) {
        enemy.shift = null;
        emit('land', enemy);
      }
    }
    if (enemy.recoil > 0) {
      enemy.recoil -= dt;
      enemy.x = clamp(enemy.x + enemy.recoilDirection * 145 * dt, 42, 758);
      continue;
    }
    if (enemy.shift) continue;
    const gap = distance(enemy, game);
    enemy.clock = (enemy.clock + dt) % attackCycle;
    const charging = enemy.kind !== 'runner' && enemy.clock >= chargeStart && enemy.clock < chargeEnd;
    const rollerCharge = enemy.kind === 'roller' && enemy.clock >= windupStart && enemy.clock - dt < chargeEnd;
    if (rollerCharge) {
      if (enemy.chargeEndX == null) {
        enemy.chargeFacing = game.x < enemy.x ? -1 : 1;
        enemy.chargeEndX = clamp(enemy.x + enemy.chargeFacing * chargeSpeed * (chargeEnd - chargeStart), 42, 758);
        emit('windup', enemy);
      }
      if (enemy.clock >= chargeStart) {
        const remaining = enemy.chargeEndX - enemy.x;
        enemy.x += Math.sign(remaining) * Math.min(Math.abs(remaining),
          chargeSpeed * (Math.min(enemy.clock, chargeEnd) - Math.max(enemy.clock - dt, chargeStart)));
      }
    } else {
      if (enemy.chargeEndX != null) emit('brake', enemy);
      enemy.chargeEndX = null;
      const speed = enemy.kind === 'runner' ? 36 : enemy.clock < windupStart ? 31 : charging ? chargeSpeed : 0;
      if (gap > 1) {
        enemy.x += (game.x - enemy.x) * speed * dt / gap;
        enemy.y += (game.y - enemy.y) * speed * dt / gap;
      }
    }
    const contactGap = rollerCharge ? distance(enemy, game) : gap;
    const canDamage = rollerCharge ? enemy.clock >= chargeStart : charging;
    if ((canDamage || enemy.kind === 'runner') && contactGap < rollerContactRadius && !game.invulnerable && game.dodge <= 0.10) {
      game.hp--;
      game.invulnerable = 1.15;
      if (game.grab) {
        const dropped = game.grab;
        game.grab = null;
        dropped.x = throwLane(game).start;
        dropped.y = game.y;
        dropped.recoil = 0.22;
        dropped.recoilDirection = game.facing;
        emit('drop', dropped);
      }
      emit('hit', game);
    }
  }
  game.enemies = game.enemies.filter(enemy => enemy.hp > 0);
  if (!game.hp) game.over = '停止';
  else if (game.foremanDefeated) game.over = '鎮圧成功';
  else if (game.time >= gameLength) game.over = '時間切れ';
}
