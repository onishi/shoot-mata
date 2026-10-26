import { STAGE_01, visibleTerrain as visibleStage01Terrain } from "./stage-01.mjs";
import { STAGE_02, visibleTerrain as visibleStage02Terrain } from "./stage-02.mjs";
import { STAGE_03, visibleTerrain as visibleStage03Terrain } from "./stage-03.mjs";

export const STAGES = Object.freeze({ "stage-01": STAGE_01, "stage-02": STAGE_02, "stage-03": STAGE_03 });
export const CAMPAIGN = Object.freeze(["stage-01", "stage-02", "stage-03"]);

export function stageById(id) {
  const stage = STAGES[id];
  if (!stage) throw new TypeError(`Unknown stage: ${id}`);
  return stage;
}

export function visibleTerrainFor(stageId, scrollX, destroyedIds = [], tick = 0) {
  if (stageId === "stage-03") return visibleStage03Terrain(scrollX, destroyedIds, tick);
  if (stageId === "stage-02") return visibleStage02Terrain(scrollX, destroyedIds, tick);
  return visibleStage01Terrain(scrollX, destroyedIds);
}
