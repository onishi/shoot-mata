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
    { tick: 12 * 60, y: 210, count: 4, pattern: "line", type: "salvage-collector" },
    { tick: 34 * 60, y: 420, count: 5, pattern: "weave", type: "salvage-weaver" },
    { tick: 68 * 60, y: 320, count: 6, pattern: "weave", type: "salvage-weaver" },
    { tick: 96 * 60, y: 270, count: 4, pattern: "line", type: "wreck-bulwark" },
    { tick: 132 * 60, y: 410, count: 7, pattern: "weave", type: "salvage-weaver" },
    { tick: 158 * 60, y: 250, count: 6, pattern: "line", type: "wreck-bulwark" }
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
