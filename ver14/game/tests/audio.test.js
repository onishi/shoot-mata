import test from "node:test";
import assert from "node:assert/strict";
import { AUDIO_PROFILES, audioProfile } from "../src/audio.js";

test("every campaign space has a distinct audible identity", () => {
  assert.equal(AUDIO_PROFILES.length, 6);
  assert.equal(new Set(AUDIO_PROFILES.map(profile => profile.id)).size, 6);
  assert.equal(new Set(AUDIO_PROFILES.map(profile => `${profile.tempo}:${profile.rhythm.join("/")}`)).size, 6);
  assert.equal(new Set(AUDIO_PROFILES.map(profile => `${profile.droneHz}:${profile.waterHz}`)).size, 6);
  for (const profile of AUDIO_PROFILES) {
    assert.ok(profile.notes.length >= 4);
    assert.equal(profile.notes.length >= profile.rhythm.length || profile.rhythm.length >= 4, true);
    assert.ok(profile.droneGain > 0);
  }
});

test("audio profiles clamp unknown sections to the campaign endpoints", () => {
  assert.equal(audioProfile(-1).id, "open-harbor");
  assert.equal(audioProfile(99).id, "leviathan");
  assert.equal(audioProfile(2).id, "underflow");
});
