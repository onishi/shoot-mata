# M3-23 Stage 6 App Flow

- Stage 5 result now advances to the Stage 6 chapter intro instead of returning to title.
- Stage 6 entry checkpoint: `original-dawn-entry`, tick 0, one revision.
- Stage 6 boss checkpoint: `last-editor-gate`, tick 32,400, one revision.
- Both checkpoints restore health 3, gauge 50, no unresolved trail, and no stale enemy fire.
- Pause, continue, result, and the ending boundary hold the simulation tick until explicit input.
- The chapter intro teaches carrying one intention through the four returning rules; the boss checkpoint teaches rewriting every rule and completing the signature wake.
- Stage 6 result advances to an explicit `ending-boundary` screen. It records the transition contract without claiming the still-unimplemented illustrated ending is complete.
- Chrome campaign flow: passed as part of 14 Playwright tests, including Stage 1 through Stage 6 and independent restoration of both Stage 6 checkpoints.
- Unit flow coverage: passed as part of 54 Vitest tests.
- Visual review: `m3-23-stage-06-intro.png` and `m3-23-stage-06-result.png` at 1280×720 have no clipped or overlapping text. The chapter lesson, final result, score, and ending action remain legible over the Stage 6 preview.
