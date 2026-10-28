export const TICKS_PER_SECOND = 60;
export const STAGE_DURATION_TICKS = 300 * TICKS_PER_SECOND;
export const BOSS_START_TICK = 230 * TICKS_PER_SECOND;
export const SCROLL_SPEED = 0.8;

const relay = (id, x, y, width, height, kind = "relay-hull", extra = {}) => ({ id, x, y, width, height, kind, ...extra });

export const STAGE_06 = Object.freeze({
  id: "stage-06", number: 6, name: "ZERO-POINT RELAY CORE",
  durationTicks: STAGE_DURATION_TICKS, bossStartTick: BOSS_START_TICK, scrollSpeed: SCROLL_SPEED,
  enemyTypes: Object.freeze(["gate-mite", "vector-inverter", "relay-sniper", "null-carrier", "phase-echo", "relay-sapper"]),
  sections: Object.freeze([
    { id: "introduction", startTick: 0, endTick: 60 * 60 },
    { id: "development", startTick: 60 * 60, endTick: 145 * 60 },
    { id: "climax", startTick: 145 * 60, endTick: BOSS_START_TICK },
    { id: "boss", startTick: BOSS_START_TICK, endTick: STAGE_DURATION_TICKS }
  ]),
  checkpoints: [0, 60 * 60, 145 * 60, 225 * 60],
  coreDrops: Object.freeze([
    { tick: 12 * 60, color: "red", y: 320 }, { tick: 38 * 60, color: "yellow", y: 405 },
    { tick: 64 * 60, color: "blue", y: 285 }, { tick: 92 * 60, color: "red", y: 430 },
    { tick: 120 * 60, color: "yellow", y: 300 }, { tick: 149 * 60, color: "blue", y: 410 },
    { tick: 177 * 60, color: "red", y: 270 }, { tick: 205 * 60, color: "yellow", y: 400 },
    { tick: 224 * 60, color: "blue", y: 345 }
  ]),
  powerUps: Object.freeze([
    { tick: 20 * 60, kind: "option", y: 340 }, { tick: 82 * 60, kind: "barrier", y: 420 },
    { tick: 146 * 60, kind: "overdrive", y: 290 }, { tick: 208 * 60, kind: "option", y: 380 }
  ]),
  terrain: Object.freeze([
    relay("relay-ceiling-a", 900, 0, 780, 130),
    relay("relay-floor-a", 1980, 590, 740, 130),
    relay("sniper-column-a", 4020, 130, 150, 360, "relay-column"),
    relay("gravity-floor", 5100, 600, 920, 120),
    relay("gravity-ceiling", 6350, 0, 820, 125),
    relay("mason-column-a", 7600, 485, 150, 235, "destructible-relay", { hp: 52 }),
    relay("mason-column-b", 8560, 0, 150, 230, "destructible-relay", { hp: 52 }),
    relay("mason-column-c", 9580, 470, 160, 250, "destructible-relay", { hp: 58 }),
    relay("sovereign-ceiling", 10550, 0, 680, 135),
    relay("sovereign-floor", 11300, 585, 760, 135)
  ]),
  phaseWalls: Object.freeze([
    { id: "phase-a", x: 2900, width: 105, centerY: 350, gap: 285, startTick: 32 * 60, period: 480 },
    { id: "phase-b", x: 4680, width: 115, centerY: 365, gap: 300, startTick: 72 * 60, period: 450 },
    { id: "phase-c", x: 7180, width: 120, centerY: 345, gap: 220, startTick: 132 * 60, period: 420 }
  ]),
  gravityDebris: Object.freeze([
    { id: "gravity-debris-a", x: 5480, width: 310, height: 72, startTick: 80 * 60, period: 420 },
    { id: "gravity-debris-b", x: 6600, width: 340, height: 76, startTick: 110 * 60, period: 390 }
  ]),
  repriseGates: Object.freeze([
    { id: "reprise-wreck", x: 8040, width: 100, centerY: 350, gap: 260, startTick: 150 * 60, period: 900 },
    { id: "reprise-refinery", x: 9020, width: 105, centerY: 360, gap: 235, startTick: 165 * 60, period: 900 },
    { id: "reprise-ark", x: 10020, width: 110, centerY: 345, gap: 220, startTick: 180 * 60, period: 900 }
  ]),
  waves: Object.freeze([
    { tick: 6 * 60, y: 145, count: 9, pattern: "wall-run", type: "gate-mite" },
    { tick: 22 * 60, y: 430, count: 9, pattern: "weave", type: "phase-echo" },
    { tick: 39 * 60, y: 505, count: 9, pattern: "wall-run", type: "gate-mite" },
    { tick: 59 * 60, y: 125, count: 5, pattern: "ceiling-combo", type: "relay-sapper" },
    { tick: 72 * 60, y: 210, count: 5, pattern: "gravity", type: "vector-inverter" },
    { tick: 94 * 60, y: 550, count: 9, pattern: "floor-combo", type: "phase-echo" },
    { tick: 108 * 60, y: 430, count: 5, pattern: "gravity", type: "vector-inverter" },
    { tick: 130 * 60, y: 190, count: 4, pattern: "sniper", type: "relay-sniper" },
    { tick: 151 * 60, y: 125, count: 6, pattern: "ceiling-combo", type: "relay-sapper" },
    { tick: 170 * 60, y: 435, count: 4, pattern: "sniper", type: "relay-sniper" },
    { tick: 198 * 60, y: 205, count: 5, pattern: "carrier", type: "null-carrier" },
    { tick: 222 * 60, y: 400, count: 5, pattern: "carrier", type: "null-carrier" }
  ])
});

function pairedParts(id, x, width, centerY, gap, kind, warning = false, extra = {}) {
  const topHeight = Math.max(0, centerY - gap / 2);
  const bottomY = Math.min(720, centerY + gap / 2);
  return [relay(`${id}-top`, x, 0, width, topHeight, kind, { warning, ...extra }), relay(`${id}-bottom`, x, bottomY, width, 720 - bottomY, kind, { warning, ...extra })];
}

function phaseWallParts(wall, tick) {
  const age = tick - wall.startTick;
  if (age < -90) return [];
  const phase = ((age % wall.period) + wall.period) % wall.period;
  const warning = age < 0 || phase < 90 || phase >= wall.period - 90;
  const active = warning || phase < 300;
  return active ? pairedParts(wall.id, wall.x, warning ? 14 : wall.width, wall.centerY, wall.gap, "phase-wall", warning) : [];
}

function gravityDebrisPart(item, tick) {
  const age = Math.max(0, tick - item.startTick);
  const direction = Math.floor(age / (item.period / 2)) % 2 === 0 ? 1 : -1;
  const y = direction > 0 ? 520 : 128;
  return relay(item.id, item.x, y, item.width, item.height, "gravity-debris", { gravityDirection: direction });
}

export function visibleTerrain(scrollX, destroyedIds = [], tick = 0) {
  const destroyed = destroyedIds instanceof Set ? destroyedIds : new Set(destroyedIds);
  const dynamic = [
    ...STAGE_06.phaseWalls.flatMap((wall) => phaseWallParts(wall, tick)),
    ...STAGE_06.gravityDebris.map((item) => gravityDebrisPart(item, tick)),
    ...STAGE_06.repriseGates.flatMap((gate) => phaseWallParts(gate, tick))
  ];
  return [...STAGE_06.terrain, ...dynamic]
    .filter((item) => !destroyed.has(item.id) && item.height > 0)
    .map((item) => ({ ...item, screenX: item.x - scrollX }))
    .filter((item) => item.screenX < 1280 && item.screenX + item.width > 0);
}
