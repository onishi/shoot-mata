export const IMAGE_ASSETS = Object.freeze({
  "background-far": new URL("../../assets/backgrounds/stage-01/orbital-wreck-far-v1.webp", import.meta.url).href,
  "background-mid": new URL("../../assets/backgrounds/stage-01/orbital-wreck-mid-v1.webp", import.meta.url).href,
  "background-fore": new URL("../../assets/backgrounds/stage-01/orbital-wreck-fore-v1.webp", import.meta.url).href,
  player: new URL("../../assets/player/player-interceptor-v1.webp", import.meta.url).href,
  "core-red": new URL("../../assets/cores/reactor-core-red-v1.webp", import.meta.url).href,
  "core-blue": new URL("../../assets/cores/reactor-core-blue-v1.webp", import.meta.url).href,
  "core-yellow": new URL("../../assets/cores/reactor-core-yellow-v1.webp", import.meta.url).href,
  "salvage-collector": new URL("../../assets/enemies/stage-01/salvage-collector-v1.webp", import.meta.url).href,
  "salvage-weaver": new URL("../../assets/enemies/stage-01/salvage-weaver-v1.webp", import.meta.url).href,
  "wreck-bulwark": new URL("../../assets/enemies/stage-01/wreck-bulwark-v1.webp", import.meta.url).href,
  "hull-crawler": new URL("../../assets/enemies/stage-01/hull-crawler-v1.webp", import.meta.url).href,
  "wreck-warden": new URL("../../assets/bosses/stage-01/wreck-warden-v1.webp", import.meta.url).href,
  "background-stage-02-far": new URL("../../assets/backgrounds/stage-02/cloud-refinery-far-v1.webp", import.meta.url).href,
  "background-stage-02-mid": new URL("../../assets/backgrounds/stage-02/cloud-refinery-mid-v1.webp", import.meta.url).href,
  "background-stage-02-fore": new URL("../../assets/backgrounds/stage-02/cloud-refinery-fore-v1.webp", import.meta.url).href,
  "cloud-skimmer": new URL("../../assets/enemies/stage-02/cloud-skimmer-v1.webp", import.meta.url).href,
  "shutter-turret": new URL("../../assets/enemies/stage-02/shutter-turret-v1.webp", import.meta.url).href,
  "storm-diver": new URL("../../assets/enemies/stage-02/storm-diver-v1.webp", import.meta.url).href,
  "condenser-leech": new URL("../../assets/enemies/stage-02/condenser-leech-v1.webp", import.meta.url).href,
  "refinery-guardian": new URL("../../assets/bosses/stage-02/refinery-guardian-v1.webp", import.meta.url).href,
  "background-stage-03-far": new URL("../../assets/backgrounds/stage-03/living-ark-far-v1.webp", import.meta.url).href,
  "background-stage-03-mid": new URL("../../assets/backgrounds/stage-03/living-ark-mid-v1.webp", import.meta.url).href,
  "background-stage-03-fore": new URL("../../assets/backgrounds/stage-03/living-ark-fore-v1.webp", import.meta.url).href,
  "regenerating-swarm": new URL("../../assets/enemies/stage-03/regenerating-swarm-v1.webp", import.meta.url).href,
  "parasite-turret": new URL("../../assets/enemies/stage-03/parasite-turret-v1.webp", import.meta.url).href,
  "ark-predator": new URL("../../assets/enemies/stage-03/ark-predator-v1.webp", import.meta.url).href,
  "cilia-walker": new URL("../../assets/enemies/stage-03/cilia-walker-v1.webp", import.meta.url).href,
  "ark-core": new URL("../../assets/bosses/stage-03/ark-core-v1.webp", import.meta.url).href,
  "background-stage-04-far": new URL("../../assets/backgrounds/stage-04/stellar-furnace-far-v1.webp", import.meta.url).href,
  "background-stage-04-mid": new URL("../../assets/backgrounds/stage-04/stellar-furnace-mid-v1.webp", import.meta.url).href,
  "background-stage-04-fore": new URL("../../assets/backgrounds/stage-04/stellar-furnace-fore-v1.webp", import.meta.url).href,
  "heat-armor": new URL("../../assets/enemies/stage-04/heat-armor-v1.webp", import.meta.url).href,
  "solar-rammer": new URL("../../assets/enemies/stage-04/solar-rammer-v1.webp", import.meta.url).href,
  "omni-turret": new URL("../../assets/enemies/stage-04/omni-turret-v1.webp", import.meta.url).href,
  "furnace-mole": new URL("../../assets/enemies/stage-04/furnace-mole-v1.webp", import.meta.url).href,
  "furnace-controller": new URL("../../assets/bosses/stage-04/furnace-controller-v1.webp", import.meta.url).href,
  "background-stage-05-far": new URL("../../assets/backgrounds/stage-05/crystal-sea-far-v1.webp", import.meta.url).href,
  "background-stage-05-mid": new URL("../../assets/backgrounds/stage-05/crystal-sea-mid-v1.webp", import.meta.url).href,
  "background-stage-05-fore": new URL("../../assets/backgrounds/stage-05/crystal-sea-fore-v1.webp", import.meta.url).href,
  "shard-skater": new URL("../../assets/enemies/stage-05/shard-skater-v1.webp", import.meta.url).href,
  "mirror-nest": new URL("../../assets/enemies/stage-05/mirror-nest-v1.webp", import.meta.url).href,
  "phase-ray": new URL("../../assets/enemies/stage-05/phase-ray-v1.webp", import.meta.url).href,
  "lattice-keeper": new URL("../../assets/enemies/stage-05/lattice-keeper-v1.webp", import.meta.url).href,
  "prism-oracle": new URL("../../assets/bosses/stage-05/prism-oracle-v1.webp", import.meta.url).href
});

export const BACKGROUND_LAYERS = Object.freeze([
  Object.freeze({ asset: "background-far", speed: 0.07, overlap: 240, opacity: 1 }),
  Object.freeze({ asset: "background-mid", speed: 0.18, overlap: 220, opacity: 0.68 }),
  Object.freeze({ asset: "background-fore", speed: 0.36, overlap: 200, opacity: 0.32 })
]);

export const STAGE_02_BACKGROUND_LAYERS = Object.freeze([
  Object.freeze({ asset: "background-stage-02-far", speed: 0.06, overlap: 240, opacity: 1 }),
  Object.freeze({ asset: "background-stage-02-mid", speed: 0.2, overlap: 220, opacity: 0.7 }),
  Object.freeze({ asset: "background-stage-02-fore", speed: 0.42, overlap: 200, opacity: 0.34 })
]);

export const STAGE_03_BACKGROUND_LAYERS = Object.freeze([
  Object.freeze({ asset: "background-stage-03-far", speed: 0.055, overlap: 240, opacity: 1 }),
  Object.freeze({ asset: "background-stage-03-mid", speed: 0.19, overlap: 220, opacity: 0.72 }),
  Object.freeze({ asset: "background-stage-03-fore", speed: 0.4, overlap: 200, opacity: 0.36 })
]);

export const STAGE_04_BACKGROUND_LAYERS = Object.freeze([
  Object.freeze({ asset: "background-stage-04-far", speed: 0.06, overlap: 240, opacity: 1 }),
  Object.freeze({ asset: "background-stage-04-mid", speed: 0.21, overlap: 220, opacity: 0.72 }),
  Object.freeze({ asset: "background-stage-04-fore", speed: 0.44, overlap: 200, opacity: 0.36 })
]);

export const STAGE_05_BACKGROUND_LAYERS = Object.freeze([
  Object.freeze({ asset: "background-stage-05-far", speed: 0.055, overlap: 240, opacity: 1 }),
  Object.freeze({ asset: "background-stage-05-mid", speed: 0.18, overlap: 220, opacity: 0.68 }),
  Object.freeze({ asset: "background-stage-05-fore", speed: 0.4, overlap: 200, opacity: 0.34 })
]);
