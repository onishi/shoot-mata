import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const evidence = new URL("../../docs/evidence/m4-audio-waveform-audit.json", import.meta.url);
const cues = ["coin", "start", "chamber", "ending", "masterwork", "gameover", "ranking", "pull", "push", "move", "blocked", "sigil", "dock"];

test("rendered Web Audio cues and theme are audible and unclipped", async ({ page }) => {
  await page.goto("/");
  const report = await page.evaluate(async (cueNames) => {
    const { ForgeAudio } = await import("/src/audio.js");
    const sampleRate = 44100;

    const metrics = (buffer) => {
      let peak = 0;
      let sumSquares = 0;
      let nonSilentSamples = 0;
      let clippedSamples = 0;
      for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
        const samples = buffer.getChannelData(channel);
        for (const sample of samples) {
          const magnitude = Math.abs(sample);
          peak = Math.max(peak, magnitude);
          sumSquares += sample * sample;
          if (magnitude > 0.0001) nonSilentSamples += 1;
          if (magnitude >= 1) clippedSamples += 1;
        }
      }
      const sampleCount = buffer.length * buffer.numberOfChannels;
      return {
        durationSeconds: buffer.duration,
        peak: Number(peak.toFixed(6)),
        rms: Number(Math.sqrt(sumSquares / sampleCount).toFixed(6)),
        nonSilentSamples,
        clippedSamples
      };
    };

    const renderCue = async (name) => {
      const context = new OfflineAudioContext(1, sampleRate * 2, sampleRate);
      const synth = new ForgeAudio(context, { setTimeout: () => 1, clearTimeout() {} });
      synth.cue(name, name === "dock" ? 3 : 0);
      return metrics(await context.startRendering());
    };

    const renderedCues = {};
    for (const name of cueNames) renderedCues[name] = await renderCue(name);

    const callbacks = [];
    const context = new OfflineAudioContext(1, sampleRate * 5, sampleRate);
    const synth = new ForgeAudio(context, {
      setTimeout(callback) { callbacks.push(callback); return callbacks.length; },
      clearTimeout() {}
    });
    synth.setScene("play");
    callbacks.shift()();
    const theme = metrics(await context.startRendering());
    return { sampleRate, cues: renderedCues, theme };
  }, cues);

  for (const [name, metrics] of Object.entries(report.cues)) {
    expect(metrics.nonSilentSamples, `${name} must render audible PCM`).toBeGreaterThan(100);
    expect(metrics.peak, `${name} must stay below full scale`).toBeLessThan(1);
    expect(metrics.clippedSamples, `${name} must not clip`).toBe(0);
  }
  expect(report.theme.nonSilentSamples).toBeGreaterThan(10_000);
  expect(report.theme.peak).toBeLessThan(1);
  expect(report.theme.clippedSamples).toBe(0);
  await writeFile(evidence, `${JSON.stringify({
    measuredAt: new Date().toISOString(),
    renderer: "Chrome OfflineAudioContext",
    assessment: "pass",
    ...report
  }, null, 2)}\n`, "utf8");
});
