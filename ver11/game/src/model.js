export const WIDTH = 960;
export const HEIGHT = 540;
export const FIXED_STEP = 1 / 60;

export const AIRSPACES = [
  {
    name: "AMBER REACH",
    subtitle: "open wind",
    ribbons: [
      { x: 300, y: 382, name: "LOW CHIME" },
      { x: 690, y: 252, name: "CROSS CHIME" },
      { x: 405, y: 116, name: "HIGH CHIME" },
    ],
    clouds: [],
    downdrafts: [],
    galeLifts: [],
    soundGates: [],
    gustPush: 125,
  },
  {
    name: "CLOUD LEE",
    subtitle: "find shelter in the silver cloud",
    ribbons: [
      { x: 720, y: 382, name: "LOW CHIME" },
      { x: 245, y: 238, name: "LEE CHIME" },
      { x: 710, y: 108, name: "HIGH CHIME" },
    ],
    clouds: [{ x: 335, y: 174, width: 290, height: 172 }],
    downdrafts: [],
    galeLifts: [],
    soundGates: [],
    gustPush: 168,
  },
  {
    name: "FALLING WEFT",
    subtitle: "cross the sinking air without losing the line",
    ribbons: [
      { x: 250, y: 372, name: "LOW CHIME" },
      { x: 735, y: 238, name: "DRIFT CHIME" },
      { x: 250, y: 102, name: "ZENITH CHIME" },
    ],
    clouds: [{ x: 610, y: 156, width: 250, height: 158 }],
    downdrafts: [{ x: 390, y: 78, width: 180, height: 350, sink: 58 }],
    galeLifts: [],
    soundGates: [],
    gustPush: 178,
  },
  {
    name: "TURNING TACK",
    subtitle: "meet the forecast gale and rise on an open thread",
    ribbons: [
      { x: 255, y: 365, name: "PORT CHIME" },
      { x: 705, y: 230, name: "TACK CHIME" },
      { x: 255, y: 96, name: "CROWN CHIME" },
    ],
    clouds: [],
    downdrafts: [],
    galeLifts: [
      { x: 105, y: 72, width: 250, height: 382, direction: 1, lift: 148 },
      { x: 605, y: 72, width: 250, height: 382, direction: -1, lift: 148 },
    ],
    soundGates: [],
    gustPush: 188,
  },
  {
    name: "RESONANT PASS",
    subtitle: "hold the thread in tune to cross the sounding gates",
    ribbons: [
      { x: 225, y: 370, name: "BASS CHIME" },
      { x: 735, y: 236, name: "ANSWER CHIME" },
      { x: 225, y: 102, name: "OVERTONE CHIME" },
    ],
    clouds: [],
    downdrafts: [],
    galeLifts: [],
    soundGates: [
      { x: 360, y: 62, height: 426, minTension: 0.32, maxTension: 0.68 },
      { x: 600, y: 62, height: 426, minTension: 0.32, maxTension: 0.68 },
    ],
    gustPush: 172,
  },
];

// Kept as the first-airspace layout for consumers that only need the M1 course.
export const RIBBONS = AIRSPACES[0].ribbons;

export function airspaceFor(game) {
  return AIRSPACES[Math.max(0, Math.min(AIRSPACES.length - 1, game.airspace || 0))];
}

export function isSheltered(game) {
  return airspaceFor(game).clouds.some((cloud) => (
    game.x >= cloud.x && game.x <= cloud.x + cloud.width
    && game.y >= cloud.y && game.y <= cloud.y + cloud.height
  ));
}

export function downdraftAt(game) {
  return airspaceFor(game).downdrafts.find((draft) => (
    game.x >= draft.x && game.x <= draft.x + draft.width
    && game.y >= draft.y && game.y <= draft.y + draft.height
  ));
}

export function galeLiftAt(game, wind = windAt(game.elapsed)) {
  if (wind.phase !== "gust") return undefined;
  return airspaceFor(game).galeLifts.find((lift) => (
    lift.direction === wind.direction
    && game.x >= lift.x && game.x <= lift.x + lift.width
    && game.y >= lift.y && game.y <= lift.y + lift.height
  ));
}

export function soundGateAt(game) {
  return airspaceFor(game).soundGates.find((gate) => (
    Math.abs(game.x - gate.x) <= 54
    && game.y >= gate.y && game.y <= gate.y + gate.height
  ));
}

export function soundGateIsTuned(game, gate = soundGateAt(game)) {
  return Boolean(gate && game.tension >= gate.minTension && game.tension <= gate.maxTension);
}

export function createGame(airspace = 0) {
  return {
    mode: "title",
    airspace,
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
    const nextAirspace = game.mode === "won" && game.airspace < AIRSPACES.length - 1 ? game.airspace + 1 : game.airspace;
    const fresh = createGame(nextAirspace);
    const changedAirspace = game.airspace !== nextAirspace;
    const entryMessages = [
      "HOLD SPACE TO CLIMB",
      "SILVER CLOUDS SHELTER THE THREAD",
      "SINKING AIR STEALS YOUR HEIGHT",
      "MEET THE GALE · RELEASE TO RISE",
      "TUNE THE THREAD TO CROSS",
    ];
    Object.assign(game, fresh, {
      mode: "playing",
      message: entryMessages[nextAirspace],
      messageTime: changedAirspace || nextAirspace > 0 ? 3.8 : 2.8,
    });
  }
  return game;
}

export function retry(game) {
  const fresh = createGame(game.airspace);
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
  const airspace = airspaceFor(game);
  const sheltered = isSheltered(game);
  const downdraft = downdraftAt(game);
  const galeLift = galeLiftAt(game, wind);
  const steer = Math.max(-1, Math.min(1, input.steer || 0));
  const windPush = wind.phase === "gust" && !sheltered ? wind.direction * airspace.gustPush : 0;
  game.vx += (steer * 310 + windPush - game.vx * 3.8) * step;
  const previousX = game.x;
  game.x += game.vx * step;
  game.x = Math.max(48, Math.min(WIDTH - 48, game.x));

  for (const gate of airspace.soundGates) {
    const crossesGate = (previousX < gate.x && game.x >= gate.x) || (previousX > gate.x && game.x <= gate.x);
    const withinGate = game.y >= gate.y && game.y <= gate.y + gate.height;
    if (!crossesGate || !withinGate) continue;
    if (soundGateIsTuned(game, gate)) {
      game.message = "GATE IN TUNE";
      game.messageTime = 1.1;
      events.push({ type: "gate" });
    } else {
      game.x = previousX < gate.x ? gate.x - 34 : gate.x + 34;
      game.vx *= -0.22;
      game.message = "TUNE THE THREAD";
      game.messageTime = 1.1;
      events.push({ type: "gate-blocked" });
    }
  }

  if (input.reel) {
    game.y -= (82 - (downdraft?.sink || 0)) * step;
    game.tension += (wind.phase === "gust" && !sheltered ? 0.58 : 0.13) * step;
  } else {
    game.y += (62 + (downdraft?.sink || 0)) * step;
    game.y -= (galeLift?.lift || 0) * step;
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

  airspace.ribbons.forEach((ribbon, index) => {
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
  if (game.mode === "won" && game.airspace < AIRSPACES.length - 1) return `All three chimes returned from ${airspaceFor(game).name}. Press Enter to cross into ${AIRSPACES[game.airspace + 1].name}.`;
  if (game.mode === "won") return `All three chimes returned from ${airspaceFor(game).name}. Five skies answer. Press Enter to fly again.`;
  const wind = windAt(game.elapsed);
  const direction = wind.direction > 0 ? "right" : "left";
  const shelter = isSheltered(game) ? " Sheltered by cloud." : "";
  const sinking = downdraftAt(game) ? " In sinking air." : "";
  const lifting = galeLiftAt(game, wind) ? " Riding gale lift." : "";
  const gate = soundGateAt(game);
  const tuning = gate ? soundGateIsTuned(game, gate) ? " Sound gate in tune." : " Sound gate out of tune." : "";
  return `Flying in ${airspaceFor(game).name}. ${game.ribbons.filter(Boolean).length} of 3 chimes. Tension ${Math.round(game.tension * 100)} percent. Wind ${wind.phase}, ${direction}.${shelter}${sinking}${lifting}${tuning}`;
}
