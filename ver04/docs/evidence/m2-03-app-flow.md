# M2-03 Application Flow Evidence

## Implemented path

`TITLE → GUIDE → TITLE → STAGE INTRO → PLAY ↔ PAUSE → CONTINUE → STAGE INTRO → PLAY → RESULT → TITLE`

- Simulation only advances while `PLAY` is active.
- A focus loss or hidden document changes active play to `PAUSE` and clears held/pulse inputs.
- Health is clamped at zero; reaching zero stops simulation on `CONTINUE`.
- Stage 1 permits one continue. Restore uses health 3, gauge 50, no open trail or enemy bullets, and preserves the selected checkpoint snapshot.
- Checkpoints are recorded at harbor entry and when BLANK BAILIFF spawns.
- Boss defeat changes to `RESULT` without advancing another simulation tick.

## Automated evidence

- Unit tests: 26 passed, including four application-flow tests.
- Stage 1 and BLANK BAILIFF autoplay reports: passed after the health-zero clamp; deterministic replay hashes remain stable within each report.
- TypeScript, production build, and Chrome E2E: passed through `npm run verify`.
- Chrome E2E used real keyboard input for title, guide, intro, movement, fire, COLLATE, RETRACE, pause/resume, continue, result, and title return.

## Visual review

Reviewed at 1280×720 in Chrome:

- `m2-03-title.png`: title, primary action, guide shortcut, and build label are legible with a clear hierarchy.
- `m2-03-guide.png`: all four actions and their purpose fit without clipping or overlap.
- `m2-03-continue.png`: failure, checkpoint, restore values, and exit choice are distinct; the stopped encounter remains faintly visible behind the overlay.
- `m2-03-result.png`: completion, score, run metrics, and return action are legible without clipping.

The same flow screenshots were recaptured after M2-04 and now show the final Stage 1 background behind the overlays. Their application-flow assertions are unchanged; combat-art review is recorded separately in `m2-04-final-visuals.md`.
