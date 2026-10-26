import { STAGE_01, visibleTerrain as visibleStage01Terrain } from "./stage-01.mjs";
import { STAGE_02, visibleTerrain as visibleStage02Terrain } from "./stage-02.mjs";

export const STAGES = Object.freeze({ "stage-01": STAGE_01, "stage-02": STAGE_02 });
export const CAMPAIGN = Object.freeze(["stage-01", "stage-02"]);

export function stageById(id) {
  const stage = STAGES[id];
  if (!stage) throw new TypeError(`Unknown stage: ${id}`);
  return stage;
}

export function visibleTerrainFor(stageId, scrollX, destroyedIds = [], tick = 0) {
  return stageId === "stage-02"
    ? visibleStage02Terrain(scrollX, destroyedIds, tick)
    : visibleStage01Terrain(scrollX, destroyedIds);
}
