export const WIDTH = 960;
export const HEIGHT = 540;
export const FIXED_STEP = 1 / 60;

export const RIBBONS = [
  { x: 300, y: 382, name: "LOW CHIME" },
  { x: 690, y: 252, name: "CROSS CHIME" },
  { x: 405, y: 116, name: "HIGH CHIME" },
];

export function createGame() {
  return {
    mode: "title",
    elapsed: 0,
    x: 480,
    y: 488,
    vx: 0,
    tension: 0.12,
    overload: 0,
    ribbons: [false, false, false],
    message: "READ THE WIND",
    messageTime: 0,
  };
}

export function windAt(elapsed) {
  const cycle = Math.floor(elapsed / 6);
  const phase = elapsed - cycle * 6;
  const direction = cycle % 2 === 0 ? 1 : -1;
  if (phase < 3) return { phase: "calm", direction, strength: 0, remaining: 3 - phase };
  if (phase < 4.2) return { phase: "warning", direction, strength: 0, remaining: 4.2 - phase };
  return { phase: "gust", direction, strength: 1, remaining: 6 - phase };
}

export function startGame(game) {
  if (game.mode === "title" || game.mode === "lost" || game.mode === "won") {
    const fresh = createGame();
    Object.assign(game, fresh, { mode: "playing", message: "HOLD SPACE TO CLIMB", messageTime: 2.8 });
  }
  return game;
}

export function retry(game) {
  const fresh = createGame();
  Object.assign(game, fresh, { mode: "playing", message: "THREAD RESTORED", messageTime: 1.8 });
  return game;
}

export function togglePause(game) {
  if (game.mode === "playing") game.mode = "paused";
  else if (game.mode === "paused") game.mode = "playing";
  return game;
}

export function update(game, input, dt = FIXED_STEP) {
  if (game.mode !== "playing") return [];
  const events = [];
  const step = Math.min(dt, 0.05);
  game.elapsed += step;
  game.messageTime = Math.max(0, game.messageTime - step);

  const wind = windAt(game.elapsed);
  const steer = Math.max(-1, Math.min(1, input.steer || 0));
  const windPush = wind.phase === "gust" ? wind.direction * 125 : 0;
  game.vx += (steer * 310 + windPush - game.vx * 3.8) * step;
  game.x += game.vx * step;
  game.x = Math.max(48, Math.min(WIDTH - 48, game.x));

  if (input.reel) {
    game.y -= 82 * step;
    game.tension += (wind.phase === "gust" ? 0.58 : 0.13) * step;
  } else {
    game.y += 62 * step;
    game.tension -= 0.52 * step;
  }
  game.y = Math.max(62, Math.min(488, game.y));
  game.tension = Math.max(0.06, Math.min(1.15, game.tension));

  if (game.tension >= 1) game.overload += step;
  else game.overload = Math.max(0, game.overload - step * 2);
  if (game.overload >= 0.42) {
    game.mode = "lost";
    game.message = "THREAD PARTED";
    events.push({ type: "lost" });
    return events;
  }

  RIBBONS.forEach((ribbon, index) => {
    if (game.ribbons[index]) return;
    const distance = Math.hypot(game.x - ribbon.x, game.y - ribbon.y);
    if (distance <= 42) {
      game.ribbons[index] = true;
      game.message = `${ribbon.name} FOUND`;
      game.messageTime = 2;
      events.push({ type: "ribbon", index });
    }
  });

  if (game.ribbons.every(Boolean) && game.y >= 470 && Math.abs(game.x - 480) <= 78) {
    game.mode = "won";
    game.message = "THE SKY ANSWERS";
    events.push({ type: "won" });
  }
  return events;
}

export function accessibleStatus(game) {
  if (game.mode === "title") return "GALE THREAD title. Press Enter to begin.";
  if (game.mode === "paused") return "Paused. Press Escape to continue.";
  if (game.mode === "lost") return "Thread parted. Press Enter or R to retry.";
  if (game.mode === "won") return "All three chimes returned. The sky answers. Press Enter to fly again.";
  const wind = windAt(game.elapsed);
  const direction = wind.direction > 0 ? "right" : "left";
  return `Flying. ${game.ribbons.filter(Boolean).length} of 3 chimes. Tension ${Math.round(game.tension * 100)} percent. Wind ${wind.phase}, ${direction}.`;
}
