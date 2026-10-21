export const GAME_ASSETS = Object.freeze({
  "bg-stg01-far": "../../assets/game/backgrounds/stage-01/orbital-wreck-far-v1.png",
  "bg-stg01-mid": "../../assets/game/backgrounds/stage-01/orbital-wreck-mid-v1.png",
  "bg-stg01-fore": "../../assets/game/backgrounds/stage-01/orbital-wreck-fore-v1.png",
  "player-interceptor": "../../assets/game/player/player-interceptor-v1.png",
  "enemy-stg01-01": "../../assets/game/enemies/stage-01/salvage-collector-v1.png",
  "core-red": "../../assets/game/cores/reactor-core-red-v1.png",
  "core-blue": "../../assets/game/cores/reactor-core-blue-v1.png",
  "core-yellow": "../../assets/game/cores/reactor-core-yellow-v1.png",
});

export function assetIdsForStage(stage) {
  if (!stage || typeof stage !== "object") throw new TypeError("stage is required");
  return Object.freeze([
    ...stage.backgroundLayers.map(({ assetId }) => assetId),
    ...stage.enemyTypes.map(({ assetId }) => assetId),
    stage.boss.assetId,
  ]);
}
