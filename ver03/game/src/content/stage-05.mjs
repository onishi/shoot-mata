export const TICKS_PER_SECOND = 60;
export const STAGE_DURATION_TICKS = 280 * TICKS_PER_SECOND;
export const BOSS_START_TICK = 220 * TICKS_PER_SECOND;
export const SCROLL_SPEED = 0.8;

const crystal = (id, x, y, width, height, kind = "crystal-wall", extra = {}) => ({ id, x, y, width, height, kind, ...extra });

export const STAGE_05 = Object.freeze({
  id: "stage-05", number: 5, name: "CRYSTAL COMPUTATION SEA",
  durationTicks: STAGE_DURATION_TICKS, bossStartTick: BOSS_START_TICK, scrollSpeed: SCROLL_SPEED,
  enemyTypes: Object.freeze(["shard-skater", "mirror-nest", "phase-ray", "lattice-keeper"]),
  sections: Object.freeze([
    { id: "introduction", startTick: 0, endTick: 65 * 60 },
    { id: "development", startTick: 65 * 60, endTick: 140 * 60 },
    { id: "climax", startTick: 140 * 60, endTick: BOSS_START_TICK },
    { id: "boss", startTick: BOSS_START_TICK, endTick: STAGE_DURATION_TICKS }
  ]),
  checkpoints: [0, 65 * 60, 140 * 60, 215 * 60],
  coreDrops: Object.freeze([
    { tick: 14 * 60, color: "blue", y: 335 }, { tick: 40 * 60, color: "yellow", y: 420 },
    { tick: 68 * 60, color: "red", y: 280 }, { tick: 94 * 60, color: "blue", y: 405 },
    { tick: 120 * 60, color: "yellow", y: 300 }, { tick: 147 * 60, color: "red", y: 425 },
    { tick: 173 * 60, color: "blue", y: 285 }, { tick: 198 * 60, color: "yellow", y: 395 },
    { tick: 214 * 60, color: "red", y: 350 }
  ]),
  terrain: Object.freeze([
    crystal("reflector-floor-a", 1050, 610, 920, 110, "reflective-crystal", { reflectSide: "floor" }),
    crystal("crystal-ceiling-a", 2440, 0, 620, 155),
    crystal("mirror-nest-wall-a", 3540, 500, 720, 220, "mirror-reef"),
    crystal("reflector-ceiling-b", 4820, 0, 920, 125, "reflective-crystal", { reflectSide: "ceiling" }),
    crystal("crystal-floor-b", 6260, 585, 820, 135),
    crystal("mirror-nest-wall-b", 7460, 0, 760, 165, "mirror-reef"),
    crystal("reflector-floor-c", 8660, 610, 980, 110, "reflective-crystal", { reflectSide: "floor" }),
    crystal("oracle-ceiling", 10020, 0, 680, 150),
    crystal("oracle-floor", 10880, 585, 720, 135)
  ]),
  movingWalls: Object.freeze([
    { id: "lattice-a", x: 3180, width: 165, centerY: 350, openGap: 320, closedGap: 175, startTick: 54 * 60, period: 450 },
    { id: "lattice-b", x: 5960, width: 175, centerY: 370, openGap: 300, closedGap: 165, startTick: 112 * 60, period: 420 },
    { id: "lattice-c", x: 8380, width: 185, centerY: 340, openGap: 285, closedGap: 155, startTick: 158 * 60, period: 390 }
  ]),
  freezeGates: Object.freeze([
    { id: "freeze-a", x: 4540, width: 90, centerY: 350, gap: 245, startTick: 75 * 60, period: 480 },
    { id: "freeze-b", x: 9750, width: 100, centerY: 365, gap: 220, startTick: 181 * 60, period: 450 }
  ]),
  waves: Object.freeze([
    { tick: 10 * 60, y: 520, count: 5, pattern: "floor-skate", type: "shard-skater" },
    { tick: 37 * 60, y: 170, count: 5, pattern: "weave", type: "shard-skater" },
    { tick: 70 * 60, y: 155, count: 3, pattern: "ceiling-turret", type: "mirror-nest" },
    { tick: 97 * 60, y: 455, count: 4, pattern: "floor-turret", type: "mirror-nest" },
    { tick: 126 * 60, y: 210, count: 4, pattern: "beam", type: "phase-ray" },
    { tick: 154 * 60, y: 430, count: 4, pattern: "beam", type: "phase-ray" },
    { tick: 181 * 60, y: 230, count: 4, pattern: "keeper", type: "lattice-keeper" },
    { tick: 204 * 60, y: 410, count: 5, pattern: "keeper", type: "lattice-keeper" }
  ])
});

function pairedParts(id, x, width, centerY, gap, kind, warning = false) {
  const topHeight = Math.max(0, centerY - gap / 2);
  const bottomY = Math.min(720, centerY + gap / 2);
  return [crystal(`${id}-top`, x, 0, width, topHeight, kind, { warning }), crystal(`${id}-bottom`, x, bottomY, width, 720 - bottomY, kind, { warning })];
}

function movingWallParts(wall, tick) {
  const age = tick - wall.startTick;
  const phase = age < 0 ? 0 : age % wall.period;
  const warning = age >= 0 && phase < 90;
  const move = phase < 90 ? 0 : phase < 195 ? (phase - 90) / 105 : phase < 300 ? 1 : phase < 390 ? 1 - (phase - 300) / 90 : 0;
  const gap = wall.openGap + (wall.closedGap - wall.openGap) * move;
  return pairedParts(wall.id, wall.x, wall.width, wall.centerY, gap, "moving-crystal", warning);
}

function freezeGateParts(gate, tick) {
  const age = tick - gate.startTick;
  if (age < 0) return [];
  const phase = age % gate.period;
  if (phase >= 230 && phase < 390) return [];
  const warning = phase < 90 || phase >= 390;
  return pairedParts(gate.id, gate.x, warning ? 12 : gate.width, gate.centerY, gate.gap, "freeze-gate", warning);
}

export function visibleTerrain(scrollX, destroyedIds = [], tick = 0) {
  const destroyed = destroyedIds instanceof Set ? destroyedIds : new Set(destroyedIds);
  return [...STAGE_05.terrain, ...STAGE_05.movingWalls.flatMap((wall) => movingWallParts(wall, tick)), ...STAGE_05.freezeGates.flatMap((gate) => freezeGateParts(gate, tick))]
    .filter((item) => !destroyed.has(item.id) && item.height > 0)
    .map((item) => ({ ...item, screenX: item.x - scrollX }))
    .filter((item) => item.screenX < 1280 && item.screenX + item.width > 0);
}
