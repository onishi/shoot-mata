export const STAGE_01_AUDIO_SAMPLE_RATE = 48_000;
export const STAGE_01_AUDIO_CHANNELS = 1;
export const STAGE_01_AUDIO_BIT_DEPTH = 16;

export const STAGE_01_AUDIO = Object.freeze([
  { id: "audio-stg01-rhythm", file: "stage-01-orbital-wreck-rhythm-v1.wav", role: "rhythm music layer", durationMs: 3000, targetPeakDb: -18, peakRangeDb: [-19, -17], loop: true },
  { id: "audio-stg01-melody", file: "stage-01-orbital-wreck-melody-v1.wav", role: "melody music layer", durationMs: 3000, targetPeakDb: -20, peakRangeDb: [-21, -19], loop: true },
  { id: "audio-stg01-danger", file: "stage-01-orbital-wreck-danger-v1.wav", role: "danger and boss music layer", durationMs: 3000, targetPeakDb: -22, peakRangeDb: [-23, -21], loop: true },
  { id: "audio-stg01-intro", file: "stage-01-orbital-wreck-intro-v1.wav", role: "stage introduction notification", durationMs: 400, targetPeakDb: -10, peakRangeDb: [-11, -9], loop: false },
  { id: "audio-stg01-clear", file: "stage-01-orbital-wreck-clear-v1.wav", role: "stage clear notification", durationMs: 700, targetPeakDb: -8, peakRangeDb: [-9, -7], loop: false },
]);

export const STAGE_01_AUDIO_LIMITS = Object.freeze({
  maxClippedSamples: 0,
  maxLeadingSilenceMs: 10,
  maxTrailingSilenceMs: 30,
  silenceThresholdDb: -60,
  maxLoopSeamDelta: 0.01,
  maxMixedPeakDb: -6,
});
