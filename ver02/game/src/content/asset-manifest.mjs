export const GAME_ASSETS = Object.freeze({
  "bg-stg01-far": "../../assets/delivery/game/backgrounds/stage-01/orbital-wreck-far-v1.webp",
  "bg-stg01-mid": "../../assets/delivery/game/backgrounds/stage-01/orbital-wreck-mid-v1.webp",
  "bg-stg01-fore": "../../assets/delivery/game/backgrounds/stage-01/orbital-wreck-fore-v1.webp",
  "bg-stg02-far": "../../assets/delivery/game/backgrounds/stage-02/cloud-refinery-far-v1.webp",
  "bg-stg02-mid": "../../assets/delivery/game/backgrounds/stage-02/cloud-refinery-mid-v1.webp",
  "bg-stg02-fore": "../../assets/delivery/game/backgrounds/stage-02/cloud-refinery-fore-v1.webp",
  "player-interceptor": "../../assets/delivery/game/player/player-interceptor-v1.webp",
  "enemy-stg01-01": "../../assets/delivery/game/enemies/stage-01/salvage-collector-v1.webp",
  "enemy-stg01-collector": "../../assets/delivery/game/enemies/stage-01/salvage-collector-v1.webp",
  "enemy-stg01-weaver": "../../assets/delivery/game/enemies/stage-01/salvage-weaver-v1.webp",
  "enemy-stg01-bulwark": "../../assets/delivery/game/enemies/stage-01/wreck-bulwark-v1.webp",
  "boss-stg01-wreck-warden": "../../assets/delivery/game/bosses/stage-01/wreck-warden-v1.webp",
  "enemy-stg02-skimmer": "../../assets/delivery/game/enemies/stage-02/cloud-skimmer-v1.webp",
  "enemy-stg02-turret": "../../assets/delivery/game/enemies/stage-02/shutter-turret-v1.webp",
  "enemy-stg02-diver": "../../assets/delivery/game/enemies/stage-02/storm-diver-v1.webp",
  "boss-stg02-refinery-guardian": "../../assets/delivery/game/bosses/stage-02/refinery-guardian-v1.webp",
  "core-red": "../../assets/delivery/game/cores/reactor-core-red-v1.webp",
  "core-blue": "../../assets/delivery/game/cores/reactor-core-blue-v1.webp",
  "core-yellow": "../../assets/delivery/game/cores/reactor-core-yellow-v1.webp",
});

export function assetIdsForStage(stage) {
  if (!stage || typeof stage !== "object") throw new TypeError("stage is required");
  return Object.freeze([
    ...stage.backgroundLayers.map(({ assetId }) => assetId),
    ...stage.enemyTypes.map(({ assetId }) => assetId),
    stage.boss.assetId,
  ]);
}
