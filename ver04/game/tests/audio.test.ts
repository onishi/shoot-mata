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

  it('maps Stage 2 wind and Compiler feedback to dedicated cues', () => {
    expect(cueForEvent({ type: 'wind-reversed', direction: -1 }, 'stage-02')?.cue).toBe('wind-left');
    expect(cueForEvent({ type: 'wind-reversed', direction: 1 }, 'stage-02')?.cue).toBe('wind-right');
    expect(cueForEvent({ type: 'compiler-wind-locked', direction: 1 }, 'stage-02')?.cue).toBe('wind-lock');
    expect(cueForEvent({ type: 'compiler-seam-exposed', side: -1 }, 'stage-02')?.cue).toBe('seam-exposed');
    expect(cueForEvent({ type: 'compiler-seam-hit' }, 'stage-02')?.cue).toBe('seam-hit');
    expect(cueForEvent({ type: 'boss-phase', phase: 2 }, 'stage-02')?.cue).toBe('compiler-phase');
    expect(cueForEvent({ type: 'boss-phase', phase: 2 }, 'stage-01')?.cue).toBe('warning');
  });

  it('maps Stage 3 wet-route and LACUNA EEL feedback to dedicated cues', () => {
    expect(cueForEvent({ type: 'trail-wetted' }, 'stage-03')?.cue).toBe('rain-wet');
    expect(cueForEvent({ type: 'basin-surge' }, 'stage-03')?.cue).toBe('basin-surge');
    expect(cueForEvent({ type: 'wet-annotation' }, 'stage-03')?.cue).toBe('wet-annotation');
    expect(cueForEvent({ type: 'eel-segment-marked', segment: 1 }, 'stage-03')?.cue).toBe('eel-marked');
    expect(cueForEvent({ type: 'eel-segment-hit', segment: 1 }, 'stage-03')?.cue).toBe('eel-hit');
    expect(cueForEvent({ type: 'boss-phase', phase: 3 }, 'stage-03')?.cue).toBe('eel-phase');
  });

  it('maps Stage 4 heat-route and CINDER ADVOCATE feedback to dedicated cues', () => {
    expect(cueForEvent({ type: 'heat-wave' }, 'stage-04')?.cue).toBe('heat-wave');
    expect(cueForEvent({ type: 'cooling-field-collated' }, 'stage-04')?.cue).toBe('cooling-field');
    expect(cueForEvent({ type: 'courier-converted' }, 'stage-04')?.cue).toBe('courier-convert');
    expect(cueForEvent({ type: 'advocate-ember-cooled' }, 'stage-04')?.cue).toBe('ember-cooled');
    expect(cueForEvent({ type: 'advocate-wall-blocked' }, 'stage-04')?.cue).toBe('wall-hit');
    expect(cueForEvent({ type: 'boss-phase', phase: 3 }, 'stage-04')?.cue).toBe('advocate-phase');
  });

  it('gives Stage 5 false writing and false volleys different audible signatures', () => {
    expect(cueForEvent({ type: 'false-trail-annotated' }, 'stage-05')).toEqual({ cue: 'annotation', rate: 1.42 });
    expect(cueForEvent({ type: 'false-volley' }, 'stage-05')).toEqual({ cue: 'collate-miss', rate: 0.72 });
  });
});
