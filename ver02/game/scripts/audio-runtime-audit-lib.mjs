import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createBrowserAudioAdapter } from "../src/browser/audio-adapter.mjs";
import { AUDIO_ASSETS } from "../src/browser/audio-assets.mjs";
import { STAGE_01_ORBITAL_WRECK } from "../src/content/stages/stage-01-orbital-wreck.mjs";
import { STAGE_02_CLOUD_REFINERY } from "../src/content/stages/stage-02-cloud-refinery.mjs";
import { STAGE_03_LIVING_ARK } from "../src/content/stages/stage-03-living-ark.mjs";
import { STAGE_04_STELLAR_FURNACE } from "../src/content/stages/stage-04-stellar-furnace.mjs";

const GAME_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STAGES = Object.freeze([
  STAGE_01_ORBITAL_WRECK,
  STAGE_02_CLOUD_REFINERY,
  STAGE_03_LIVING_ARK,
  STAGE_04_STELLAR_FURNACE,
]);
const DEFAULT_SETTINGS = Object.freeze({
  bgmVolume: 0.8,
  sfxVolume: 0.8,
  bgmMuted: false,
  sfxMuted: false,
});

function readWav(assetId) {
  const asset = AUDIO_ASSETS.find(({ id }) => id === assetId);
  if (!asset) throw new Error(`unknown audio asset: ${assetId}`);
  const file = readFileSync(resolve(GAME_ROOT, "public", asset.url));
  if (file.toString("ascii", 0, 4) !== "RIFF" || file.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error(`invalid WAV: ${assetId}`);
  }
  const channels = file.readUInt16LE(22);
  const sampleRate = file.readUInt32LE(24);
  const bitDepth = file.readUInt16LE(34);
  const dataBytes = file.readUInt32LE(40);
  if (channels !== 1 || bitDepth !== 16 || 44 + dataBytes > file.length) {
    throw new Error(`unsupported WAV layout: ${assetId}`);
  }
  const samples = Array.from(
    { length: dataBytes / 2 },
    (_, index) => file.readInt16LE(44 + index * 2) / 32768,
  );
  return { assetId, sampleRate, sampleCount: samples.length, durationSeconds: samples.length / sampleRate, samples };
}

function peakDb(samples, gain = 1) {
  const peak = samples.reduce((maximum, sample) => Math.max(maximum, Math.abs(sample * gain)), 0);
  return Number((20 * Math.log10(peak)).toFixed(3));
}

function mixedPeakDb(layers, gain) {
  const samples = layers[0].samples.map((_, index) => (
    layers.reduce((sum, layer) => sum + layer.samples[index], 0)
  ));
  return peakDb(samples, gain);
}

function fakeContext(durations) {
  const gains = [];
  const sources = [];
  return {
    state: "running",
    currentTime: 0,
    destination: {},
    gains,
    sources,
    createGain() {
      const node = {
        gain: { value: -1, setValueAtTime(value) { this.value = value; } },
        connect() {},
      };
      gains.push(node);
      return node;
    },
    async decodeAudioData(encoded) { return { duration: durations.get(encoded.assetId) }; },
    createBufferSource() {
      const source = {
        loop: false,
        stopped: false,
        connect() {},
        start(when, offset = 0) { this.startedAt = when; this.startedOffset = offset; },
        stop() { this.stopped = true; },
      };
      sources.push(source);
      return source;
    },
    async close() {},
  };
}

async function transitionAudit(stage, wavs, soakSeconds) {
  const durations = new Map(wavs.map(({ assetId, durationSeconds }) => [assetId, durationSeconds]));
  const context = fakeContext(durations);
  const audio = createBrowserAudioAdapter({ settings: DEFAULT_SETTINGS, createContext: () => context });
  await audio.activate();
  for (const wav of wavs) await audio.loadSound(wav.assetId, "bgm", { assetId: wav.assetId });
  const stagePlayback = audio.playBgm(stage.audio.stageLayerAssetIds);
  const initialSources = [...context.sources];
  context.currentTime = soakSeconds + 0.875;
  const bossPlayback = audio.playBgm(stage.audio.bossLayerAssetIds);
  const added = context.sources.slice(initialSources.length);
  const expectedOffset = Number((context.currentTime % wavs[0].durationSeconds).toFixed(6));

  const missingContext = fakeContext(durations);
  const missingAudio = createBrowserAudioAdapter({ settings: DEFAULT_SETTINGS, createContext: () => missingContext });
  await missingAudio.activate();
  for (const wav of wavs.slice(0, 2)) await missingAudio.loadSound(wav.assetId, "bgm", { assetId: wav.assetId });
  const beforeMissing = missingAudio.playBgm(stage.audio.stageLayerAssetIds);
  const missingBoss = missingAudio.playBgm(stage.audio.bossLayerAssetIds);

  return {
    stagePlayback: stagePlayback.played,
    bossPlayback: bossPlayback.played,
    retainedLayerCount: initialSources.filter(({ stopped }) => !stopped).length,
    addedLayerCount: added.length,
    addedLayerOffsetSeconds: Number((added[0]?.startedOffset ?? -1).toFixed(6)),
    expectedOffsetSeconds: expectedOffset,
    missingDanger: {
      stagePlaybackContinues: beforeMissing.played && missingContext.sources.every(({ stopped }) => !stopped),
      bossPlaybackRejected: missingBoss.played === false,
      warning: missingAudio.getStatus().warning,
    },
  };
}

export async function auditAudioRuntime(options = {}) {
  const soakSeconds = options.soakSeconds ?? 360;
  const violations = [];
  const stages = [];
  for (const stage of STAGES) {
    const wavs = stage.audio.bossLayerAssetIds.map(readWav);
    const sampleRates = [...new Set(wavs.map(({ sampleRate }) => sampleRate))];
    const sampleCounts = [...new Set(wavs.map(({ sampleCount }) => sampleCount))];
    const phases = wavs.map(({ sampleCount, sampleRate }) => ((soakSeconds * sampleRate) % sampleCount));
    const driftSamples = Math.max(...phases) - Math.min(...phases);
    const transition = await transitionAudit(stage, wavs, soakSeconds);
    const stageLayers = wavs.slice(0, 2);
    const record = {
      stageId: stage.id,
      layerAssetIds: wavs.map(({ assetId }) => assetId),
      sampleRate: sampleRates.length === 1 ? sampleRates[0] : null,
      sampleCount: sampleCounts.length === 1 ? sampleCounts[0] : null,
      durationSeconds: sampleCounts.length === 1 ? wavs[0].durationSeconds : null,
      soakSeconds,
      phaseSamplesAfterSoak: phases,
      driftSamples,
      mixedPeakDb: {
        stageAtUnity: mixedPeakDb(stageLayers, 1),
        bossAtUnity: mixedPeakDb(wavs, 1),
        stageAtDefaultGain: mixedPeakDb(stageLayers, DEFAULT_SETTINGS.bgmVolume),
        bossAtDefaultGain: mixedPeakDb(wavs, DEFAULT_SETTINGS.bgmVolume),
      },
      transition,
    };
    if (sampleRates.length !== 1) violations.push({ stageId: stage.id, reason: "layer-sample-rate-mismatch" });
    if (sampleCounts.length !== 1) violations.push({ stageId: stage.id, reason: "layer-duration-mismatch" });
    if (driftSamples !== 0) violations.push({ stageId: stage.id, reason: "layer-phase-drift", driftSamples });
    if (record.mixedPeakDb.bossAtUnity > -6) violations.push({ stageId: stage.id, reason: "boss-mix-headroom-below-6db" });
    if (!transition.stagePlayback || !transition.bossPlayback
      || transition.retainedLayerCount !== 2 || transition.addedLayerCount !== 1
      || transition.addedLayerOffsetSeconds !== transition.expectedOffsetSeconds) {
      violations.push({ stageId: stage.id, reason: "phase-aligned-layer-transition-failed" });
    }
    if (!transition.missingDanger.stagePlaybackContinues
      || !transition.missingDanger.bossPlaybackRejected
      || transition.missingDanger.warning !== "audio-source-missing") {
      violations.push({ stageId: stage.id, reason: "missing-layer-degradation-failed" });
    }
    stages.push(record);
  }

  const volumeProfiles = [
    { id: "default", settings: DEFAULT_SETTINGS, expected: [0.8, 0.8] },
    { id: "bgm-muted", settings: { ...DEFAULT_SETTINGS, bgmMuted: true }, expected: [0, 0.8] },
    { id: "sfx-muted", settings: { ...DEFAULT_SETTINGS, sfxMuted: true }, expected: [0.8, 0] },
    { id: "independent-levels", settings: { ...DEFAULT_SETTINGS, bgmVolume: 0.45, sfxVolume: 0.65 }, expected: [0.45, 0.65] },
  ].map(({ id, settings, expected }) => {
    const context = fakeContext(new Map());
    const audio = createBrowserAudioAdapter({ settings, createContext: () => context });
    return audio.activate().then(() => ({ id, actualGains: context.gains.map(({ gain }) => gain.value), expectedGains: expected }));
  });
  const resolvedProfiles = await Promise.all(volumeProfiles);
  for (const profile of resolvedProfiles) {
    if (profile.actualGains.some((gain, index) => gain !== profile.expectedGains[index])) {
      violations.push({ profile: profile.id, reason: "independent-gain-mismatch" });
    }
  }

  return {
    thresholds: { minimumSoakSeconds: 300, minimumBossMixHeadroomDb: 6 },
    soakSeconds,
    stages,
    volumeProfiles: resolvedProfiles,
    violations,
  };
}
