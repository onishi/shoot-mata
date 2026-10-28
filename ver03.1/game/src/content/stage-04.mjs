export const TICKS_PER_SECOND = 60;
export const STAGE_DURATION_TICKS = 270 * TICKS_PER_SECOND;
export const BOSS_START_TICK = 215 * TICKS_PER_SECOND;
export const SCROLL_SPEED = 0.8;

const furnace = (id, x, y, width, height, kind = "furnace-wall", extra = {}) => ({ id, x, y, width, height, kind, ...extra });

export const STAGE_04 = Object.freeze({
  id: "stage-04", number: 4, name: "STELLAR FURNACE",
  durationTicks: STAGE_DURATION_TICKS, bossStartTick: BOSS_START_TICK, scrollSpeed: SCROLL_SPEED,
  enemyTypes: Object.freeze(["heat-armor", "solar-rammer", "omni-turret", "furnace-mole", "flare-wisp", "slag-hauler"]),
  sections: Object.freeze([
    { id: "introduction", startTick: 0, endTick: 60 * 60 },
    { id: "development", startTick: 60 * 60, endTick: 135 * 60 },
    { id: "climax", startTick: 135 * 60, endTick: BOSS_START_TICK },
    { id: "boss", startTick: BOSS_START_TICK, endTick: STAGE_DURATION_TICKS }
  ]),
  checkpoints: [0, 60 * 60, 135 * 60, 210 * 60],
  coreDrops: Object.freeze([
    { tick: 13 * 60, color: "red", y: 330 }, { tick: 38 * 60, color: "blue", y: 420 },
    { tick: 64 * 60, color: "yellow", y: 280 }, { tick: 90 * 60, color: "red", y: 410 },
    { tick: 116 * 60, color: "blue", y: 300 }, { tick: 142 * 60, color: "yellow", y: 430 },
    { tick: 167 * 60, color: "red", y: 290 }, { tick: 190 * 60, color: "blue", y: 405 },
    { tick: 207 * 60, color: "yellow", y: 350 }
  ]),
  powerUps: Object.freeze([
    { tick: 20 * 60, kind: "option", y: 340 }, { tick: 76 * 60, kind: "barrier", y: 440 },
    { tick: 134 * 60, kind: "overdrive", y: 280 }, { tick: 186 * 60, kind: "option", y: 370 }
  ]),
  terrain: Object.freeze([
    furnace("molten-floor-a", 1050, 625, 900, 95, "molten-floor"),
    furnace("heat-shield-a", 2700, 0, 155, 245, "heat-shield"),
    furnace("heat-shield-b", 3860, 475, 170, 245, "heat-shield"),
    furnace("furnace-ceiling", 4920, 0, 760, 145),
    furnace("rail-floor", 6030, 590, 980, 130, "furnace-rail"),
    furnace("molten-floor-b", 7440, 620, 1080, 100, "molten-floor"),
    furnace("furnace-upper", 8750, 0, 680, 170),
    furnace("breakable-shield-a", 9800, 0, 185, 280, "destructible-shield", { hp: 52 }),
    furnace("breakable-shield-b", 10500, 440, 185, 280, "destructible-shield", { hp: 52 })
  ]),
  heatWaves: Object.freeze([
    { id: "heat-wave-a", x: 3350, width: 100, centerY: 360, gap: 250, startTick: 31 * 60, period: 480 },
    { id: "heat-wave-b", x: 7140, width: 110, centerY: 335, gap: 230, startTick: 106 * 60, period: 450 },
    { id: "heat-wave-c", x: 10180, width: 120, centerY: 370, gap: 210, startTick: 166 * 60, period: 420 }
  ]),
  rotatingWalls: Object.freeze([
    { id: "rotor-a", x: 8250, width: 180, centerY: 355, openGap: 315, closedGap: 155, startTick: 128 * 60, period: 420 },
    { id: "rotor-b", x: 11050, width: 190, centerY: 365, openGap: 300, closedGap: 145, startTick: 178 * 60, period: 390 }
  ]),
  waves: Object.freeze([
    { tick: 7 * 60, y: 245, count: 8, pattern: "weave", type: "heat-armor" },
    { tick: 23 * 60, y: 430, count: 9, pattern: "weave", type: "flare-wisp" },
    { tick: 41 * 60, y: 420, count: 8, pattern: "weave", type: "heat-armor" },
    { tick: 60 * 60, y: 125, count: 5, pattern: "ceiling-combo", type: "slag-hauler" },
    { tick: 72 * 60, y: 190, count: 8, pattern: "ram", type: "solar-rammer" },
    { tick: 94 * 60, y: 560, count: 9, pattern: "floor-combo", type: "flare-wisp" },
    { tick: 108 * 60, y: 465, count: 8, pattern: "ram", type: "solar-rammer" },
    { tick: 129 * 60, y: 90, count: 5, pattern: "ceiling-turret", type: "omni-turret" },
    { tick: 148 * 60, y: 130, count: 6, pattern: "ceiling-combo", type: "slag-hauler" },
    { tick: 168 * 60, y: 535, count: 5, pattern: "floor-turret", type: "omni-turret" },
    { tick: 199 * 60, y: 330, count: 10, pattern: "ram", type: "solar-rammer" }
  ]),
  moles: Object.freeze([
    { tick: 79 * 60, worldX: 6250, surfaceY: 590 }, { tick: 113 * 60, worldX: 6810, surfaceY: 590 },
    { tick: 158 * 60, worldX: 9200, surfaceY: 170, side: "ceiling" }, { tick: 194 * 60, worldX: 11120, surfaceY: 545 }
  ])
});

function pairedParts(id, x, width, centerY, gap, kind, warning = false) {
  const topHeight = Math.max(0, centerY - gap / 2);
  const bottomY = Math.min(720, centerY + gap / 2);
  return [furnace(`${id}-top`, x, 0, width, topHeight, kind, { warning }), furnace(`${id}-bottom`, x, bottomY, width, 720 - bottomY, kind, { warning })];
}

function heatWaveParts(wave, tick) {
  const age = tick - wave.startTick;
  if (age < 0) return [];
  const phase = age % wave.period;
  if (phase >= 210) return [];
  const warning = phase < 90;
  const width = warning ? 14 : wave.width;
  return pairedParts(wave.id, wave.x, width, wave.centerY, wave.gap, "heat-wave", warning);
}

function rotatingParts(wall, tick) {
  const age = tick - wall.startTick;
  const phase = age < 0 ? 0 : age % wall.period;
  const warning = age >= 0 && phase < 90;
  const turn = phase < 90 ? 0 : phase < 180 ? (phase - 90) / 90 : phase < 270 ? 1 : phase < 360 ? 1 - (phase - 270) / 90 : 0;
  const gap = wall.openGap + (wall.closedGap - wall.openGap) * turn;
  return pairedParts(wall.id, wall.x, wall.width, wall.centerY, gap, "rotating-wall", warning);
}

export function visibleTerrain(scrollX, destroyedIds = [], tick = 0) {
  const destroyed = destroyedIds instanceof Set ? destroyedIds : new Set(destroyedIds);
  return [...STAGE_04.terrain, ...STAGE_04.heatWaves.flatMap((wave) => heatWaveParts(wave, tick)), ...STAGE_04.rotatingWalls.flatMap((wall) => rotatingParts(wall, tick))]
    .filter((item) => !destroyed.has(item.id) && item.height > 0)
    .map((item) => ({ ...item, screenX: item.x - scrollX }))
    .filter((item) => item.screenX < 1280 && item.screenX + item.width > 0);
}
