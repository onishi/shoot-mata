export const TICKS_PER_SECOND = 60;
export const STAGE_DURATION_TICKS = 240 * TICKS_PER_SECOND;
export const BOSS_START_TICK = 190 * TICKS_PER_SECOND;
export const SCROLL_SPEED = 0.8;

const beam = (id, x, y, width, height, kind = "beam") => ({ id, x, y, width, height, kind });

export const STAGE_01 = Object.freeze({
  id: "stage-01",
  name: "ORBITAL WRECK",
  durationTicks: STAGE_DURATION_TICKS,
  bossStartTick: BOSS_START_TICK,
  checkpoints: [0, 55 * 60, 125 * 60, 185 * 60],
  terrain: Object.freeze([
    beam("floor-a", 820, 610, 620, 110),
    beam("ceiling-a", 1610, 0, 570, 190),
    beam("floor-b", 2440, 560, 620, 160),
    beam("ceiling-b", 3260, 0, 740, 235),
    beam("floor-c", 4080, 600, 500, 120),
    beam("ceiling-c", 4890, 0, 650, 205),
    beam("floor-d", 5660, 530, 720, 190),
    beam("ceiling-d", 6500, 0, 600, 220),
    beam("wall-upper", 7240, 0, 150, 465, "wreck-wall"),
    beam("floor-e", 7650, 605, 710, 115),
    beam("ceiling-e", 8500, 0, 590, 215),
    beam("floor-f", 9240, 555, 760, 165),
    beam("ceiling-f", 10180, 0, 650, 210)
  ]),
  waves: Object.freeze([
    { tick: 12 * 60, y: 210, count: 4, pattern: "line" },
    { tick: 34 * 60, y: 420, count: 5, pattern: "weave" },
    { tick: 68 * 60, y: 320, count: 6, pattern: "weave" },
    { tick: 96 * 60, y: 270, count: 4, pattern: "line" },
    { tick: 132 * 60, y: 410, count: 7, pattern: "weave" },
    { tick: 158 * 60, y: 250, count: 6, pattern: "line" }
  ])
});

export function visibleTerrain(scrollX) {
  return STAGE_01.terrain
    .map((item) => ({ ...item, screenX: item.x - scrollX }))
    .filter((item) => item.screenX < 1280 && item.screenX + item.width > 0);
}
