import { describe, expect, it } from 'vitest';
import { cueForEvent } from '../src/audio/stage-01-audio';

describe('Stage 1 audio event map', () => {
  it('gives immediate and distinct cues to the core actions', () => {
    expect(cueForEvent({ type: 'shot-fired' })?.cue).toBe('shot');
    expect(cueForEvent({ type: 'shot-annotated' })?.cue).toBe('annotation');
    expect(cueForEvent({ type: 'loop-ready' })?.cue).toBe('candidate');
    expect(cueForEvent({ type: 'collate-missed' })?.cue).toBe('collate-miss');
    expect(cueForEvent({ type: 'retrace-started' })?.cue).toBe('retrace-start');
    expect(cueForEvent({ type: 'retrace-ended' })?.cue).toBe('retrace-end');
    expect(cueForEvent({ type: 'damage' })?.cue).toBe('damage');
  });

  it('expresses capture count with three chord registers instead of extra voices', () => {
    const low = cueForEvent({ type: 'loop-collated', captured: 1, area: 9000 });
    const middle = cueForEvent({ type: 'loop-collated', captured: 7, area: 9000 });
    const high = cueForEvent({ type: 'loop-collated', captured: 18, area: 9000 });
    expect([low?.cue, middle?.cue, high?.cue]).toEqual(['collate', 'collate', 'collate']);
    expect(low!.rate).toBeLessThan(middle!.rate);
    expect(middle!.rate).toBeLessThan(high!.rate);
  });
});
