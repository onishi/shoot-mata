export const TICKS_PER_SECOND = 60;
export const STAGE_DURATION_TICKS = 260 * TICKS_PER_SECOND;
export const BOSS_START_TICK = 205 * TICKS_PER_SECOND;
export const SCROLL_SPEED = 0.8;

const structure = (id, x, y, width, height, kind = "refinery") => ({ id, x, y, width, height, kind });

export const STAGE_02 = Object.freeze({
  id: "stage-02",
  number: 2,
  name: "CLOUD REFINERY",
  durationTicks: STAGE_DURATION_TICKS,
  bossStartTick: BOSS_START_TICK,
  scrollSpeed: SCROLL_SPEED,
  enemyTypes: Object.freeze(["cloud-skimmer", "shutter-turret", "storm-diver", "condenser-leech"]),
  sections: Object.freeze([
    { id: "introduction", startTick: 0, endTick: 60 * 60 },
    { id: "development", startTick: 60 * 60, endTick: 130 * 60 },
    { id: "climax", startTick: 130 * 60, endTick: BOSS_START_TICK },
    { id: "boss", startTick: BOSS_START_TICK, endTick: STAGE_DURATION_TICKS }
  ]),
  checkpoints: [0, 60 * 60, 130 * 60, 200 * 60],
  coreDrops: Object.freeze([
    { tick: 12 * 60, color: "yellow", y: 330 },
    { tick: 38 * 60, color: "yellow", y: 450 },
    { tick: 63 * 60, color: "blue", y: 300 },
    { tick: 88 * 60, color: "red", y: 420 },
    { tick: 112 * 60, color: "red", y: 285 },
    { tick: 136 * 60, color: "blue", y: 430 },
    { tick: 158 * 60, color: "yellow", y: 310 },
    { tick: 181 * 60, color: "red", y: 410 },
    { tick: 198 * 60, color: "yellow", y: 350 }
  ]),
  terrain: Object.freeze([
    structure("pipe-floor-a", 1180, 620, 760, 100),
    structure("pipe-ceiling-a", 2260, 0, 660, 135),
    structure("charged-floor", 3620, 600, 720, 120, "charged-wall"),
    structure("pipe-ceiling-b", 4550, 0, 650, 170),
    structure("charged-ceiling", 5750, 0, 720, 145, "charged-wall"),
    structure("pipe-floor-b", 6880, 585, 690, 135),
    structure("tower-ceiling", 8480, 0, 740, 165),
    structure("tower-floor", 8480, 585, 740, 135)
  ]),
  shutters: Object.freeze([
    { id: "shutter-a", x: 4050, width: 150, centerY: 350, openGap: 310, closedGap: 170, startTick: 58 * 60, period: 360 },
    { id: "shutter-b", x: 6240, width: 160, centerY: 405, openGap: 300, closedGap: 165, startTick: 104 * 60, period: 390 },
    { id: "lift-a", x: 9250, width: 180, centerY: 340, openGap: 260, closedGap: 185, startTick: 158 * 60, period: 300, moving: true },
    { id: "lift-b", x: 10180, width: 180, centerY: 390, openGap: 270, closedGap: 180, startTick: 178 * 60, period: 330, moving: true }
  ]),
  currents: Object.freeze([
    { startTick: 8 * 60, endTick: 55 * 60, direction: -1, strength: 0.42 },
    { startTick: 126 * 60, endTick: 178 * 60, direction: 1, strength: 0.48 }
  ]),
  waves: Object.freeze([
    { tick: 10 * 60, y: 250, count: 6, pattern: "current-weave", type: "cloud-skimmer" },
    { tick: 36 * 60, y: 430, count: 7, pattern: "current-weave", type: "cloud-skimmer" },
    { tick: 65 * 60, y: 145, count: 2, pattern: "turret", type: "shutter-turret" },
    { tick: 91 * 60, y: 515, count: 3, pattern: "turret", type: "shutter-turret" },
    { tick: 125 * 60, y: 120, count: 6, pattern: "dive", type: "storm-diver" },
    { tick: 151 * 60, y: 570, count: 7, pattern: "dive", type: "storm-diver" },
    { tick: 180 * 60, y: 250, count: 4, pattern: "current-weave", type: "cloud-skimmer" }
  ]),
  leeches: Object.freeze([
    { tick: 72 * 60, worldX: 4970, surfaceY: 170, side: "ceiling" },
    { tick: 116 * 60, worldX: 7040, surfaceY: 585, side: "floor" },
    { tick: 145 * 60, worldX: 8350, surfaceY: 165, side: "ceiling" },
    { tick: 174 * 60, worldX: 9740, surfaceY: 585, side: "floor" }
  ])
});

function shutterParts(shutter, tick) {
  const age = tick - shutter.startTick;
  const phase = age < 0 ? 0 : age % shutter.period;
  const warning = age >= 0 && phase < 90;
  const closing = age >= 0 && phase >= 90 && phase < 150;
  const closed = age >= 0 && phase >= 150 && phase < 250;
  const opening = age >= 0 && phase >= 250 && phase < 310;
  let amount = 0;
  if (closing) amount = (phase - 90) / 60;
  else if (closed) amount = 1;
  else if (opening) amount = 1 - (phase - 250) / 60;
  const center = shutter.centerY + (shutter.moving ? Math.sin(Math.max(0, age) / 75) * 75 : 0);
  const gap = shutter.openGap + (shutter.closedGap - shutter.openGap) * amount;
  const topHeight = Math.max(0, center - gap / 2);
  const bottomY = Math.min(720, center + gap / 2);
  return [
    { id: `${shutter.id}-top`, x: shutter.x, y: 0, width: shutter.width, height: topHeight, kind: "shutter", warning },
    { id: `${shutter.id}-bottom`, x: shutter.x, y: bottomY, width: shutter.width, height: 720 - bottomY, kind: "shutter", warning }
  ];
}

export function visibleTerrain(scrollX, destroyedIds = [], tick = 0) {
  const destroyed = destroyedIds instanceof Set ? destroyedIds : new Set(destroyedIds);
  return [...STAGE_02.terrain, ...STAGE_02.shutters.flatMap((shutter) => shutterParts(shutter, tick))]
    .filter((item) => !destroyed.has(item.id) && item.height > 0)
    .map((item) => ({ ...item, screenX: item.x - scrollX }))
    .filter((item) => item.screenX < 1280 && item.screenX + item.width > 0);
}

export function activeCurrent(tick) {
  return STAGE_02.currents.find(({ startTick, endTick }) => tick >= startTick && tick < endTick) ?? null;
}
