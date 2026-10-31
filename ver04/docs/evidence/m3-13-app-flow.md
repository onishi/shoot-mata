# M3-13 Stage 4 App Flow

- Stage 3 result now advances to the Stage 4 chapter intro instead of returning to title.
- Stage 4 entry checkpoint: `burnt-footnote-entry`, tick 0, one revision.
- Stage 4 boss checkpoint: `advocate-gate`, tick 23,400, one revision.
- Both checkpoints restore health 3, gauge 50, no unresolved trail, and no stale enemy fire.
- Pause and continue overlays hold the simulation tick until explicit input.
- The chapter intro teaches the moving cooling shadow; the boss checkpoint teaches cooled ember counterfire through the permanent heat wall.
- Stage 4 result returns to title; Stage 1 through Stage 3 campaign transitions remain covered.
- Chrome campaign flow: passed as part of 10 Playwright tests.
- Unit flow coverage: passed as part of 45 Vitest tests.
- Visual review: `m3-13-stage-04-intro.png` and `m3-13-stage-04-result.png` at 1280×720 have no clipped or overlapping text. The chapter, cooling lesson, result message, and next action remain legible over the Stage 4 preview.
