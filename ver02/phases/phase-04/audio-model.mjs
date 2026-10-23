export const AUDIO_SAMPLE_RATE = 48_000;
export const AUDIO_CHANNELS = 1;
export const AUDIO_BIT_DEPTH = 16;

export const REFERENCE_AUDIO = Object.freeze([
  { id: "weapon-lance-shot", file: "weapon-lance-shot-v1.wav", role: "red weapon fire", durationMs: 180, targetPeakDb: -6, peakRangeDb: [-7, -5], loop: false },
  { id: "weapon-spread-shot", file: "weapon-spread-shot-v1.wav", role: "blue weapon fire", durationMs: 240, targetPeakDb: -8, peakRangeDb: [-9, -7], loop: false },
  { id: "weapon-seeker-launch", file: "weapon-seeker-launch-v1.wav", role: "yellow weapon launch", durationMs: 320, targetPeakDb: -8, peakRangeDb: [-9, -7], loop: false },
  { id: "core-collect", file: "core-collect-v1.wav", role: "core pickup", durationMs: 380, targetPeakDb: -7, peakRangeDb: [-8, -6], loop: false },
  { id: "core-load", file: "core-load-v1.wav", role: "FIFO queue update", durationMs: 250, targetPeakDb: -9, peakRangeDb: [-10, -8], loop: false },
  { id: "ui-confirm", file: "ui-confirm-v1.wav", role: "UI confirmation", durationMs: 120, targetPeakDb: -12, peakRangeDb: [-13, -11], loop: false },
  { id: "title-theme-loop", file: "title-theme-loop-v1.wav", role: "title and menu music loop", durationMs: 3000, targetPeakDb: -18, peakRangeDb: [-19, -17], loop: true },
  { id: "result-theme-loop", file: "result-theme-loop-v1.wav", role: "stage result music loop", durationMs: 2400, targetPeakDb: -18, peakRangeDb: [-19, -17], loop: true },
  { id: "ending-theme-loop", file: "ending-theme-loop-v1.wav", role: "campaign ending music loop", durationMs: 3600, targetPeakDb: -18, peakRangeDb: [-19, -17], loop: true },
  { id: "stage-01-rhythm-loop", file: "stage-01-rhythm-loop-v1.wav", role: "stage rhythm layer loop", durationMs: 4000, targetPeakDb: -12, peakRangeDb: [-13, -11], loop: true },
]);

export const AUDIO_LIMITS = Object.freeze({
  maxClippedSamples: 0,
  maxLeadingSilenceMs: 10,
  maxTrailingSilenceMs: 30,
  silenceThresholdDb: -60,
  maxLoopSeamDelta: 0.01,
});
