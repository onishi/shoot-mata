import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_CUES, AUDIO_CUE_SIGNATURES, musicEnabledForState, volumeGain } from '../src/audio.js';

test('required play events have distinct synthesized cues', () => {
  for (const cue of ['coin', 'cast', 'turn', 'outboundHit', 'returnBreak', 'catch', 'bellHit', 'guardianStart', 'guardianPhase', 'guardianBreak', 'guardianClear']) {
    assert.ok(AUDIO_CUES.includes(cue), `${cue} cue is registered`);
  }
  assert.equal(new Set(AUDIO_CUES).size, AUDIO_CUES.length);
  assert.equal(new Set(Object.values(AUDIO_CUE_SIGNATURES)).size, AUDIO_CUES.length);
});

test('music runs only during unpaused active play', () => {
  assert.equal(musicEnabledForState('playing', false), true);
  assert.equal(musicEnabledForState('playing', true), false);
  for (const mode of ['title', 'waveBrief', 'guardianBrief', 'waveClear', 'gameOver', 'settings']) {
    assert.equal(musicEnabledForState(mode, false), false);
  }
});

test('volume gain is silent at zero, bounded, and perceptually curved', () => {
  assert.equal(volumeGain(0), 0);
  assert.equal(volumeGain(-5), 0);
  assert.equal(volumeGain(10), 1);
  assert.equal(volumeGain(50), 1);
  assert.ok(volumeGain(5) > 0 && volumeGain(5) < 0.5);
});
