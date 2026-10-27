import { STAGE_01, visibleTerrain as visibleStage01Terrain } from "./stage-01.mjs";
import { STAGE_02, visibleTerrain as visibleStage02Terrain } from "./stage-02.mjs";
import { STAGE_03, visibleTerrain as visibleStage03Terrain } from "./stage-03.mjs";
import { STAGE_04, visibleTerrain as visibleStage04Terrain } from "./stage-04.mjs";
import { STAGE_05, visibleTerrain as visibleStage05Terrain } from "./stage-05.mjs";
import { STAGE_06, visibleTerrain as visibleStage06Terrain } from "./stage-06.mjs";

export const STAGES = Object.freeze({ "stage-01": STAGE_01, "stage-02": STAGE_02, "stage-03": STAGE_03, "stage-04": STAGE_04, "stage-05": STAGE_05, "stage-06": STAGE_06 });
export const CAMPAIGN = Object.freeze(["stage-01", "stage-02", "stage-03", "stage-04", "stage-05", "stage-06"]);

export function stageById(id) {
  const stage = STAGES[id];
  if (!stage) throw new TypeError(`Unknown stage: ${id}`);
  return stage;
}

export function visibleTerrainFor(stageId, scrollX, destroyedIds = [], tick = 0) {
  if (stageId === "stage-06") return visibleStage06Terrain(scrollX, destroyedIds, tick);
  if (stageId === "stage-05") return visibleStage05Terrain(scrollX, destroyedIds, tick);
  if (stageId === "stage-04") return visibleStage04Terrain(scrollX, destroyedIds, tick);
  if (stageId === "stage-03") return visibleStage03Terrain(scrollX, destroyedIds, tick);
  if (stageId === "stage-02") return visibleStage02Terrain(scrollX, destroyedIds, tick);
  return visibleStage01Terrain(scrollX, destroyedIds);
}
