# M3-08 Stage 3 App Flow

- Stage 2 result now advances to the Stage 3 chapter intro instead of returning to title.
- Stage 3 entry checkpoint: `rain-gallery-entry`, tick 0, one revision.
- Stage 3 boss checkpoint: `eel-gate`, tick 23,400, one revision.
- Both checkpoints restore health 3, gauge 50, no unresolved trail, and no stale enemy fire.
- Pause and continue overlays hold the simulation tick until explicit input.
- Stage 3 result returns to title; Stage 1 and Stage 2 campaign transitions remain covered.
- Chrome campaign flow: passed as part of 8 Playwright tests.
- Unit flow coverage: passed as part of 39 Vitest tests.
- Visual review: `m3-08-stage-03-intro.png` and `m3-08-stage-03-result.png` at 1280×720 have no clipped or overlapping text. The chapter, rain lesson, result message, and next action remain legible over the Stage 3 preview.

