# M3-26 ENDING / CAMPAIGN RESULT evidence

- Flow: Stage 6 RESULT -> ENDING -> CAMPAIGN RESULT -> TITLE.
- State: both ending screens stop the simulation tick; a fresh voyage resets the campaign summary.
- Campaign summary: six confirmed stage results accumulate score, COLLATE count, returned fire, damage, and revisions used. Completion becomes true only after Stage 6 is recorded.
- Audio: Stage 6 stems restart with a quieter dawn mix on ENDING, settle further on CAMPAIGN RESULT, and stop on TITLE. Existing UI confirmation/back cues cover explicit transitions.
- Chrome: the accelerated Stage 1-to-6 campaign flow reaches both ending screens and returns to TITLE; all 14 E2E cases pass.
- Visual review: `m3-26-ending.png` and `m3-26-campaign-result.png` are 1280x720 with no clipped or overlapping text. Six colored routes visibly converge on the dawn signature, and all six completion nodes plus aggregate values remain legible.
