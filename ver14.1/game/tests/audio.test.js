import test from "node:test";
import assert from "node:assert/strict";
import { AUDIO_PROFILES, audioProfile, motionFeedback } from "../src/audio.js";

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

test("steering feedback is immediate, directional, and surge-amplified", () => {
  const neutral = motionFeedback(0, 0, 0);
  const rightIntent = motionFeedback(0, 0, 1);
  const leftVelocity = motionFeedback(-1.4, 0, 0);
  const surged = motionFeedback(0.7, 0.4, 1);
  assert.deepEqual(neutral, { bank: 0, roll: 0, pan: 0, rush: 1 });
  assert.ok(rightIntent.bank > 0 && rightIntent.roll > 0 && rightIntent.pan > 0);
  assert.ok(leftVelocity.bank < 0 && leftVelocity.roll < 0 && leftVelocity.pan < 0);
  assert.ok(surged.rush > motionFeedback(0.7, 0, 1).rush);
  assert.ok(Math.abs(motionFeedback(99, 0, 99).bank) <= 0.032);
  assert.ok(Math.abs(motionFeedback(99, 0, 99).pan) <= 0.62);
});
