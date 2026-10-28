export const TICKS_PER_SECOND = 60;
export const STAGE_DURATION_TICKS = 240 * TICKS_PER_SECOND;
export const BOSS_START_TICK = 190 * TICKS_PER_SECOND;
export const SCROLL_SPEED = 0.8;

const beam = (id, x, y, width, height, kind = "beam", hp = null) => ({ id, x, y, width, height, kind, hp });

export const STAGE_01 = Object.freeze({
  id: "stage-01",
  number: 1,
  name: "ORBITAL WRECK",
  durationTicks: STAGE_DURATION_TICKS,
  bossStartTick: BOSS_START_TICK,
  scrollSpeed: SCROLL_SPEED,
  enemyTypes: Object.freeze(["salvage-collector", "salvage-weaver", "wreck-bulwark", "hull-crawler", "scrap-dart", "shield-drone"]),
  sections: Object.freeze([
    { id: "introduction", startTick: 0, endTick: 55 * 60 },
    { id: "development", startTick: 55 * 60, endTick: 125 * 60 },
    { id: "climax", startTick: 125 * 60, endTick: BOSS_START_TICK },
    { id: "boss", startTick: BOSS_START_TICK, endTick: STAGE_DURATION_TICKS }
  ]),
  checkpoints: [0, 55 * 60, 125 * 60, 185 * 60],
  coreDrops: Object.freeze([
    { tick: 18 * 60, color: "red", y: 350 },
    { tick: 42 * 60, color: "red", y: 465 },
    { tick: 61 * 60, color: "red", y: 340 },
    { tick: 82 * 60, color: "blue", y: 360 },
    { tick: 106 * 60, color: "blue", y: 280 },
    { tick: 129 * 60, color: "blue", y: 380 },
    { tick: 148 * 60, color: "yellow", y: 310 },
    { tick: 166 * 60, color: "yellow", y: 440 },
    { tick: 181 * 60, color: "yellow", y: 350 }
  ]),
  powerUps: Object.freeze([
    { tick: 26 * 60, kind: "option", y: 300 },
    { tick: 78 * 60, kind: "barrier", y: 430 },
    { tick: 118 * 60, kind: "overdrive", y: 310 },
    { tick: 154 * 60, kind: "option", y: 390 }
  ]),
  terrain: Object.freeze([
    beam("floor-a", 820, 610, 620, 110),
    beam("ceiling-a", 1610, 0, 570, 190),
    beam("floor-b", 2440, 560, 620, 160),
    beam("ceiling-b", 3260, 0, 740, 235),
    beam("floor-c", 4080, 600, 500, 120),
    beam("ceiling-c", 4890, 0, 650, 205),
    beam("floor-d", 5660, 530, 720, 190),
    beam("ceiling-d", 6500, 0, 600, 220),
    beam("breakable-wreck", 7240, 260, 150, 200, "destructible-wreck", 48),
    beam("floor-e", 7650, 605, 710, 115),
    beam("ceiling-e", 8500, 0, 590, 215),
    beam("floor-f", 9240, 555, 760, 165),
    beam("ceiling-f", 10180, 0, 650, 210)
  ]),
  waves: Object.freeze([
    { tick: 8 * 60, y: 210, count: 7, pattern: "line", type: "salvage-collector" },
    { tick: 24 * 60, y: 430, count: 8, pattern: "weave", type: "scrap-dart" },
    { tick: 38 * 60, y: 420, count: 8, pattern: "weave", type: "salvage-weaver" },
    { tick: 58 * 60, y: 130, count: 6, pattern: "ceiling-combo", type: "shield-drone" },
    { tick: 70 * 60, y: 320, count: 10, pattern: "weave", type: "salvage-weaver" },
    { tick: 88 * 60, y: 560, count: 7, pattern: "floor-combo", type: "scrap-dart" },
    { tick: 101 * 60, y: 270, count: 7, pattern: "line", type: "wreck-bulwark" },
    { tick: 126 * 60, y: 125, count: 7, pattern: "ceiling-combo", type: "shield-drone" },
    { tick: 139 * 60, y: 410, count: 11, pattern: "weave", type: "salvage-weaver" },
    { tick: 157 * 60, y: 255, count: 9, pattern: "line", type: "wreck-bulwark" },
    { tick: 176 * 60, y: 540, count: 10, pattern: "floor-combo", type: "scrap-dart" }
  ]),
  crawlers: Object.freeze([
    { tick: 15 * 60, terrainId: "ceiling-a", worldX: 1990 },
    { tick: 50 * 60, terrainId: "ceiling-b", worldX: 3680 },
    { tick: 84 * 60, terrainId: "ceiling-c", worldX: 5290 },
    { tick: 117 * 60, terrainId: "ceiling-d", worldX: 6880 },
    { tick: 159 * 60, terrainId: "ceiling-e", worldX: 8870 }
  ])
});

export function visibleTerrain(scrollX, destroyedIds = []) {
  const destroyed = destroyedIds instanceof Set ? destroyedIds : new Set(destroyedIds);
  return STAGE_01.terrain
    .filter((item) => !destroyed.has(item.id))
    .map((item) => ({ ...item, screenX: item.x - scrollX }))
    .filter((item) => item.screenX < 1280 && item.screenX + item.width > 0);
}
