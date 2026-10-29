import { STAGE_01, visibleTerrain as visibleStage01Terrain } from "./stage-01.mjs";
import { STAGE_02, visibleTerrain as visibleStage02Terrain } from "./stage-02.mjs";
import { STAGE_03, visibleTerrain as visibleStage03Terrain } from "./stage-03.mjs";
import { STAGE_04, visibleTerrain as visibleStage04Terrain } from "./stage-04.mjs";
import { STAGE_05, visibleTerrain as visibleStage05Terrain } from "./stage-05.mjs";
import { STAGE_06, visibleTerrain as visibleStage06Terrain } from "./stage-06.mjs";
import { MISSIONS } from "./missions.mjs";

export const CAMPAIGN_PACE = 0.78;

const scaleTick = (tick) => Math.round(tick * CAMPAIGN_PACE);
const scaleTimed = (items = []) => Object.freeze(items.map((item) => Object.freeze({ ...item, tick: scaleTick(item.tick) })));

function expandedPowerUps(stage) {
  const boss = stage.bossStartTick;
  const additions = [
    { tick: 4 * 60, kind: "barrier", y: 360 },
    { tick: 8 * 60, kind: "option", y: 330 },
    { tick: boss * 0.32, kind: "option", y: 270 },
    { tick: boss * 0.52, kind: "option", y: 450 },
    { tick: boss * 0.25, kind: "barrier", y: 390 },
    { tick: boss * 0.65, kind: "barrier", y: 320 }
  ];
  return Object.freeze([...stage.powerUps, ...additions]
    .map((item) => Object.freeze({ ...item, tick: scaleTick(item.tick) }))
    .sort((left, right) => left.tick - right.tick));
}

function evolveStage(stage) {
  const missions = MISSIONS[stage.id];
  return Object.freeze({
    ...stage,
    durationTicks: scaleTick(stage.durationTicks),
    bossStartTick: scaleTick(stage.bossStartTick),
    scrollSpeed: stage.scrollSpeed / CAMPAIGN_PACE,
    checkpoints: Object.freeze(stage.checkpoints.map(scaleTick)),
    sections: Object.freeze(stage.sections.map((section, index) => Object.freeze({
      ...section,
      startTick: scaleTick(section.startTick),
      endTick: scaleTick(section.endTick),
      mission: missions[index]
    }))),
    coreDrops: scaleTimed(stage.coreDrops),
    powerUps: expandedPowerUps(stage),
    waves: scaleTimed(stage.waves),
    crawlers: scaleTimed(stage.crawlers),
    leeches: scaleTimed(stage.leeches),
    walkers: scaleTimed(stage.walkers),
    moles: scaleTimed(stage.moles)
  });
}

export const STAGES = Object.freeze({
  "stage-01": evolveStage(STAGE_01), "stage-02": evolveStage(STAGE_02), "stage-03": evolveStage(STAGE_03),
  "stage-04": evolveStage(STAGE_04), "stage-05": evolveStage(STAGE_05), "stage-06": evolveStage(STAGE_06)
});
export const CAMPAIGN = Object.freeze(["stage-01", "stage-02", "stage-03", "stage-04", "stage-05", "stage-06"]);

export function stageById(id) {
  const stage = STAGES[id];
  if (!stage) throw new TypeError(`Unknown stage: ${id}`);
  return stage;
}

export function visibleTerrainFor(stageId, scrollX, destroyedIds = [], tick = 0) {
  const sourceTick = tick / CAMPAIGN_PACE;
  if (stageId === "stage-06") return visibleStage06Terrain(scrollX, destroyedIds, sourceTick);
  if (stageId === "stage-05") return visibleStage05Terrain(scrollX, destroyedIds, sourceTick);
  if (stageId === "stage-04") return visibleStage04Terrain(scrollX, destroyedIds, sourceTick);
  if (stageId === "stage-03") return visibleStage03Terrain(scrollX, destroyedIds, sourceTick);
  if (stageId === "stage-02") return visibleStage02Terrain(scrollX, destroyedIds, sourceTick);
  return visibleStage01Terrain(scrollX, destroyedIds);
}
