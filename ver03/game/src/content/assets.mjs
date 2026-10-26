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
  "wreck-warden": new URL("../../assets/bosses/stage-01/wreck-warden-v1.webp", import.meta.url).href
});

export const BACKGROUND_LAYERS = Object.freeze([
  Object.freeze({ asset: "background-far", speed: 0.07, overlap: 240, opacity: 1 }),
  Object.freeze({ asset: "background-mid", speed: 0.18, overlap: 220, opacity: 0.68 }),
  Object.freeze({ asset: "background-fore", speed: 0.36, overlap: 200, opacity: 0.32 })
]);
