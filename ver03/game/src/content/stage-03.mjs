export const TICKS_PER_SECOND = 60;
export const STAGE_DURATION_TICKS = 270 * TICKS_PER_SECOND;
export const BOSS_START_TICK = 215 * TICKS_PER_SECOND;
export const SCROLL_SPEED = 0.8;

const tissue = (id, x, y, width, height, kind = "living-tissue", extra = {}) => ({ id, x, y, width, height, kind, ...extra });

export const STAGE_03 = Object.freeze({
  id: "stage-03",
  number: 3,
  name: "LIVING ARK",
  durationTicks: STAGE_DURATION_TICKS,
  bossStartTick: BOSS_START_TICK,
  scrollSpeed: SCROLL_SPEED,
  enemyTypes: Object.freeze(["regenerating-swarm", "parasite-turret", "ark-predator", "cilia-walker"]),
  sections: Object.freeze([
    { id: "introduction", startTick: 0, endTick: 60 * 60 },
    { id: "development", startTick: 60 * 60, endTick: 135 * 60 },
    { id: "climax", startTick: 135 * 60, endTick: BOSS_START_TICK },
    { id: "boss", startTick: BOSS_START_TICK, endTick: STAGE_DURATION_TICKS }
  ]),
  checkpoints: [0, 60 * 60, 135 * 60, 210 * 60],
  coreDrops: Object.freeze([
    { tick: 14 * 60, color: "blue", y: 345 },
    { tick: 39 * 60, color: "red", y: 430 },
    { tick: 67 * 60, color: "yellow", y: 285 },
    { tick: 91 * 60, color: "blue", y: 420 },
    { tick: 118 * 60, color: "red", y: 300 },
    { tick: 143 * 60, color: "yellow", y: 430 },
    { tick: 169 * 60, color: "blue", y: 290 },
    { tick: 191 * 60, color: "red", y: 410 },
    { tick: 208 * 60, color: "yellow", y: 350 }
  ]),
  terrain: Object.freeze([
    tissue("ark-floor-a", 1150, 610, 760, 110),
    tissue("ark-ceiling-a", 2350, 0, 720, 145),
    tissue("cyst-a", 3950, 535, 150, 185, "destructible-cyst", { hp: 42 }),
    tissue("rib-ceiling", 4700, 0, 680, 175),
    tissue("cyst-b", 6000, 0, 160, 205, "destructible-cyst", { hp: 48 }),
    tissue("ark-floor-b", 6900, 580, 760, 140),
    tissue("cyst-c", 8250, 520, 180, 200, "destructible-cyst", { hp: 54 }),
    tissue("peristalsis-ceiling", 9450, 0, 760, 185),
    tissue("peristalsis-floor", 9450, 555, 760, 165),
    tissue("cyst-refuge", 10680, 0, 205, 125, "destructible-cyst", { hp: 28 })
  ]),
  membranes: Object.freeze([
    { id: "membrane-a", x: 3250, width: 125, centerY: 355, openGap: 330, closedGap: 135, startTick: 25 * 60, period: 390 },
    { id: "membrane-b", x: 5550, width: 135, centerY: 365, openGap: 315, closedGap: 145, startTick: 76 * 60, period: 420 },
    { id: "contraction-a", x: 9000, width: 230, centerY: 355, openGap: 300, closedGap: 155, startTick: 138 * 60, period: 360, contracting: true },
    { id: "contraction-b", x: 10280, width: 250, centerY: 370, openGap: 290, closedGap: 150, startTick: 169 * 60, period: 330, contracting: true }
  ]),
  waves: Object.freeze([
    { tick: 11 * 60, y: 250, count: 6, pattern: "weave", type: "regenerating-swarm" },
    { tick: 39 * 60, y: 420, count: 7, pattern: "weave", type: "regenerating-swarm" },
    { tick: 66 * 60, y: 105, count: 2, pattern: "ceiling-turret", type: "parasite-turret" },
    { tick: 94 * 60, y: 560, count: 3, pattern: "floor-turret", type: "parasite-turret" },
    { tick: 130 * 60, y: 150, count: 5, pattern: "ambush", type: "ark-predator" },
    { tick: 157 * 60, y: 510, count: 6, pattern: "ambush", type: "ark-predator" },
    { tick: 188 * 60, y: 300, count: 7, pattern: "weave", type: "regenerating-swarm" }
  ]),
  walkers: Object.freeze([
    { tick: 55 * 60, worldX: 4030, surfaceY: 535 },
    { tick: 111 * 60, worldX: 6120, surfaceY: 205, side: "ceiling" },
    { tick: 148 * 60, worldX: 8330, surfaceY: 520 },
    { tick: 190 * 60, worldX: 10780, surfaceY: 125, side: "ceiling" }
  ])
});

function membraneParts(membrane, tick) {
  const age = tick - membrane.startTick;
  const phase = age < 0 ? 0 : age % membrane.period;
  const warning = age >= 0 && phase < 90;
  const closingEnd = membrane.contracting ? 180 : 150;
  const closedEnd = membrane.contracting ? 255 : 245;
  const openingEnd = membrane.contracting ? 330 : 305;
  let amount = 0;
  if (phase >= 90 && phase < closingEnd) amount = (phase - 90) / (closingEnd - 90);
  else if (phase >= closingEnd && phase < closedEnd) amount = 1;
  else if (phase >= closedEnd && phase < openingEnd) amount = 1 - (phase - closedEnd) / (openingEnd - closedEnd);
  const pulse = membrane.contracting ? Math.sin(Math.max(0, age) / 46) * 18 : 0;
  const center = membrane.centerY + pulse;
  const gap = membrane.openGap + (membrane.closedGap - membrane.openGap) * amount;
  const topHeight = Math.max(0, center - gap / 2);
  const bottomY = Math.min(720, center + gap / 2);
  return [
    tissue(`${membrane.id}-top`, membrane.x, 0, membrane.width, topHeight, "membrane", { warning }),
    tissue(`${membrane.id}-bottom`, membrane.x, bottomY, membrane.width, 720 - bottomY, "membrane", { warning })
  ];
}

export function visibleTerrain(scrollX, destroyedIds = [], tick = 0) {
  const destroyed = destroyedIds instanceof Set ? destroyedIds : new Set(destroyedIds);
  return [...STAGE_03.terrain, ...STAGE_03.membranes.flatMap((membrane) => membraneParts(membrane, tick))]
    .filter((item) => !destroyed.has(item.id) && item.height > 0)
    .map((item) => ({ ...item, screenX: item.x - scrollX }))
    .filter((item) => item.screenX < 1280 && item.screenX + item.width > 0);
}
