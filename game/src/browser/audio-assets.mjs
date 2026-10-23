export const AUDIO_ASSETS = Object.freeze([
  Object.freeze({
    id: "audio-stg01-rhythm",
    group: "bgm",
    url: "../../assets/audio/stage-01/stage-01-orbital-wreck-rhythm-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg01-melody",
    group: "bgm",
    url: "../../assets/audio/stage-01/stage-01-orbital-wreck-melody-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg01-danger",
    group: "bgm",
    url: "../../assets/audio/stage-01/stage-01-orbital-wreck-danger-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg01-intro",
    group: "sfx",
    url: "../../assets/audio/stage-01/stage-01-orbital-wreck-intro-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg01-clear",
    group: "sfx",
    url: "../../assets/audio/stage-01/stage-01-orbital-wreck-clear-v1.wav",
  }),
  Object.freeze({
    id: "audio-ref-ui-confirm",
    group: "sfx",
    url: "../../assets/audio/reference/ui-confirm-v1.wav",
  }),
  Object.freeze({
    id: "audio-ref-weapon-lance",
    group: "sfx",
    url: "../../assets/audio/reference/weapon-lance-shot-v1.wav",
  }),
  Object.freeze({
    id: "audio-ref-weapon-spread",
    group: "sfx",
    url: "../../assets/audio/reference/weapon-spread-shot-v1.wav",
  }),
  Object.freeze({
    id: "audio-ref-weapon-seeker",
    group: "sfx",
    url: "../../assets/audio/reference/weapon-seeker-launch-v1.wav",
  }),
  Object.freeze({
    id: "audio-ref-core-collect",
    group: "sfx",
    url: "../../assets/audio/reference/core-collect-v1.wav",
  }),
  Object.freeze({
    id: "audio-ref-core-load",
    group: "sfx",
    url: "../../assets/audio/reference/core-load-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg02-rhythm",
    group: "bgm",
    url: "../../assets/audio/stage-02/stage-02-cloud-refinery-rhythm-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg02-melody",
    group: "bgm",
    url: "../../assets/audio/stage-02/stage-02-cloud-refinery-melody-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg02-danger",
    group: "bgm",
    url: "../../assets/audio/stage-02/stage-02-cloud-refinery-danger-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg02-intro",
    group: "sfx",
    url: "../../assets/audio/stage-02/stage-02-cloud-refinery-intro-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg02-clear",
    group: "sfx",
    url: "../../assets/audio/stage-02/stage-02-cloud-refinery-clear-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg03-rhythm",
    group: "bgm",
    url: "../../assets/audio/stage-03/stage-03-living-ark-rhythm-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg03-melody",
    group: "bgm",
    url: "../../assets/audio/stage-03/stage-03-living-ark-melody-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg03-danger",
    group: "bgm",
    url: "../../assets/audio/stage-03/stage-03-living-ark-danger-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg03-intro",
    group: "sfx",
    url: "../../assets/audio/stage-03/stage-03-living-ark-intro-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg03-clear",
    group: "sfx",
    url: "../../assets/audio/stage-03/stage-03-living-ark-clear-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg04-rhythm",
    group: "bgm",
    url: "../../assets/audio/stage-04/stage-04-stellar-furnace-rhythm-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg04-melody",
    group: "bgm",
    url: "../../assets/audio/stage-04/stage-04-stellar-furnace-melody-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg04-danger",
    group: "bgm",
    url: "../../assets/audio/stage-04/stage-04-stellar-furnace-danger-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg04-intro",
    group: "sfx",
    url: "../../assets/audio/stage-04/stage-04-stellar-furnace-intro-v1.wav",
  }),
  Object.freeze({
    id: "audio-stg04-clear",
    group: "sfx",
    url: "../../assets/audio/stage-04/stage-04-stellar-furnace-clear-v1.wav",
  }),
]);

export async function loadBrowserAudioAssets(audio, options = {}) {
  if (!audio || typeof audio.loadSound !== "function") throw new TypeError("audio adapter is required");
  const fetchResource = options.fetchResource ?? globalThis.fetch;
  if (typeof fetchResource !== "function") throw new TypeError("fetch is unavailable");

  const results = [];
  for (const asset of AUDIO_ASSETS) {
    try {
      const response = await fetchResource(asset.url);
      if (!response?.ok) throw new Error(`HTTP ${response?.status ?? "unknown"}`);
      const encoded = await response.arrayBuffer();
      const loaded = await audio.loadSound(asset.id, asset.group, encoded);
      results.push({ id: asset.id, loaded: loaded.loaded === true, warning: loaded.warning });
    } catch {
      results.push({ id: asset.id, loaded: false, warning: "audio-source-load-failed" });
    }
  }
  return results;
}
