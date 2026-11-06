import test from "node:test";
import assert from "node:assert/strict";
import { ForgeAudio, MIX, THEME_STEPS, theoreticalPeak } from "../src/audio.js";

const parameter = () => ({
  values: [],
  cancelScheduledValues() {},
  setValueAtTime(value, time) { this.values.push(["set", value, time]); },
  exponentialRampToValueAtTime(value, time) { this.values.push(["ramp", value, time]); }
});

function fakeContext() {
  const oscillators = [];
  const context = {
    currentTime: 4,
    destination: {},
    state: "running",
    createGain() {
      return { gain: parameter(), connect() { return this; } };
    },
    createOscillator() {
      const oscillator = {
        frequency: parameter(),
        connect() { return this; },
        start(time) { this.started = time; },
        stop(time) { this.stopped = time; }
      };
      oscillators.push(oscillator);
      return oscillator;
    }
  };
  return { context, oscillators };
}

test("audio mix keeps the conservative simultaneous-voice peak below 0.30", () => {
  assert.ok(theoreticalPeak() < 0.3);
  assert.equal(MIX.maxMusicVoices, 2);
});

test("mute prevents voices and restores the master without rebuilding audio", () => {
  const { context, oscillators } = fakeContext();
  const synth = new ForgeAudio(context, { setTimeout: () => 1, clearTimeout() {} });
  synth.setVolume(0);
  synth.cue("coin");
  assert.equal(oscillators.length, 0);
  synth.setVolume(0.5);
  synth.cue("coin");
  assert.equal(oscillators.length, 4, "two audible FM carriers plus two inaudible modulators");
  assert.equal(synth.master.gain.values.at(-1)[1], 0.5 * MIX.master);
});

test("play scene schedules one 16-step FM theme and stops stale loops", () => {
  const { context, oscillators } = fakeContext();
  const callbacks = [];
  const cleared = [];
  const synth = new ForgeAudio(context, {
    setTimeout(callback, delay) { callbacks.push({ callback, delay }); return callbacks.length; },
    clearTimeout(id) { cleared.push(id); }
  });
  synth.setScene("play", 0.35);
  assert.equal(callbacks[0].delay, 350);
  callbacks[0].callback();
  assert.ok(oscillators.length >= THEME_STEPS, "theme creates carriers and FM modulators");
  synth.setScene("silent");
  assert.ok(cleared.length > 0);
  const count = oscillators.length;
  callbacks.at(-1).callback();
  assert.equal(oscillators.length, count, "a stale generation cannot schedule another phrase");
});
