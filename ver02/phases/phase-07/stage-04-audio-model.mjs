export const STAGE_04_AUDIO_SAMPLE_RATE = 48_000;
export const STAGE_04_AUDIO_CHANNELS = 1;
export const STAGE_04_AUDIO_BIT_DEPTH = 16;

export const STAGE_04_AUDIO = Object.freeze([
  { id: "audio-stg04-rhythm", file: "stage-04-stellar-furnace-rhythm-v1.wav", role: "rhythm music layer", durationMs: 3000, targetPeakDb: -18, peakRangeDb: [-19, -17], loop: true },
  { id: "audio-stg04-melody", file: "stage-04-stellar-furnace-melody-v1.wav", role: "melody music layer", durationMs: 3000, targetPeakDb: -20, peakRangeDb: [-21, -19], loop: true },
  { id: "audio-stg04-danger", file: "stage-04-stellar-furnace-danger-v1.wav", role: "danger and boss music layer", durationMs: 3000, targetPeakDb: -22, peakRangeDb: [-23, -21], loop: true },
  { id: "audio-stg04-intro", file: "stage-04-stellar-furnace-intro-v1.wav", role: "stage introduction notification", durationMs: 350, targetPeakDb: -10, peakRangeDb: [-11, -9], loop: false },
  { id: "audio-stg04-clear", file: "stage-04-stellar-furnace-clear-v1.wav", role: "stage clear notification", durationMs: 650, targetPeakDb: -8, peakRangeDb: [-9, -7], loop: false },
]);

export const STAGE_04_AUDIO_LIMITS = Object.freeze({
  maxClippedSamples: 0,
  maxLeadingSilenceMs: 10,
  maxTrailingSilenceMs: 30,
  silenceThresholdDb: -60,
  maxLoopSeamDelta: 0.01,
  maxMixedPeakDb: -6,
});
