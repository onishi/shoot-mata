# M3-03 Stage 1→2 app flow evidence

Date: 2026-10-31

## Implemented path

`title → Stage 1 intro → play → result → Stage 2 intro → play → result → title`

- Stage 1 result confirms into Stage 2; Escape can still end the voyage.
- Each stage grants one independent revision.
- Stage 2 restores either `crosswind-entry` at tick 0 or `compiler-gate` at tick 21600.
- A restore clears enemy fire, open trail/candidate/retrace state, sets health to 3 and gauge to 50.
- Pause, focus loss, result and continue overlays do not advance simulation.

## Verification

- Unit tests: 34 passed, including Stage 1 regression and both Stage 2 checkpoints.
- Deterministic autoplay reports: 4 passed without changed simulation values.
- Production build: passed.
- Chrome E2E: 5 passed, including the complete Stage 1→2 fast path and both Stage 2 checkpoint restores.
- Full command: `npm run verify` passed.

## Visual review

- `m3-03-stage-02-intro.png`: Stage number, chapter title, crosswind instruction and controls are readable at 1280×720.
- `m3-03-stage-02-result.png`: result title, score, metrics and return action are readable at 1280×720.
- Stage 2 still uses provisional Stage 1 background and procedural enemy/boss previews; these images validate app flow only and do not count as final Stage 2 art.
