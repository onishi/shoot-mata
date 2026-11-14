import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_CUES, AUDIO_CUE_SIGNATURES, MUSIC_VARIATIONS, musicEnabledForState, musicVariationForAct, volumeGain } from '../src/audio.js';

test('required play events have distinct synthesized cues', () => {
  for (const cue of ['coin', 'cast', 'turn', 'chorus', 'outboundHit', 'returnBreak', 'catch', 'bellHit', 'guardianStart', 'guardianPhase', 'guardianBreak', 'guardianClear']) {
    assert.ok(AUDIO_CUES.includes(cue), `${cue} cue is registered`);
  }
  assert.equal(new Set(AUDIO_CUES).size, AUDIO_CUES.length);
  assert.equal(new Set(Object.values(AUDIO_CUE_SIGNATURES)).size, AUDIO_CUES.length);
});

test('music runs only during unpaused active play', () => {
  assert.equal(musicEnabledForState('playing', false), true);
  assert.equal(musicEnabledForState('playing', true), false);
  for (const mode of ['title', 'waveBrief', 'guardianBrief', 'waveClear', 'continue', 'nameEntry', 'ranking', 'settings']) {
    assert.equal(musicEnabledForState(mode, false), false);
  }
});

test('six acts have distinct bounded music arrangements', () => {
  assert.equal(MUSIC_VARIATIONS.length, 6);
  const signatures = MUSIC_VARIATIONS.map(variation => JSON.stringify(variation));
  assert.equal(new Set(signatures).size, 6);
  for (const variation of MUSIC_VARIATIONS) {
    assert.equal(variation.bass.length, 8);
    assert.equal(variation.metal.length, 8);
    assert.ok(variation.step >= 0.15 && variation.step <= 0.23);
    assert.ok(variation.accents.every(index => index >= 0 && index < 8));
  }
  assert.equal(musicVariationForAct(-1), MUSIC_VARIATIONS[0]);
  assert.equal(musicVariationForAct(99), MUSIC_VARIATIONS[5]);
});

test('volume gain is silent at zero, bounded, and perceptually curved', () => {
  assert.equal(volumeGain(0), 0);
  assert.equal(volumeGain(-5), 0);
  assert.equal(volumeGain(10), 1);
  assert.equal(volumeGain(50), 1);
  assert.ok(volumeGain(5) > 0 && volumeGain(5) < 0.5);
});
