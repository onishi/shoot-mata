# M4 final audit evidence

Date: 2026-11-06

## Viewports and visual review

- Automated containment and 16:9 checks passed at 1280×720 and 640×800.
- `m4-title-1280x720.png`, `m4-paused-1280x720.png`, `m4-title-640x800.png`, and `m4-paused-640x800.png` were visually inspected.
- The canvas, settings, title, pause copy, and control legend have no clipping, overlap, or ambiguous state.

## Keyboard and accessibility surface

- Initial focus: game canvas.
- Tab order: canvas → sound → motion.
- Enter activates both settings controls; `aria-label`, `aria-pressed`, and the polite live region update.
- The canvas accessible name reports garden, phase, seed node, flower count, lives, selected switch, linked/held state, tempo, and pending beat count where applicable.
- Start, branch selection, route change, pause, and Enter resume passed in Google Chrome automation.

## Performance

- Scenario: Garden 1 active play, full motion, 1280×720 viewport.
- Measurement: 170 `requestAnimationFrame` intervals after 10 warm-up frames.
- p95: 16.70ms (budget: less than 25ms).
- maximum: 16.80ms.

## Release artifact

- Path: `ver10/release/signal-garden-v10.0/`
- Files: 5.
- Total: 27,897 bytes (budget: 500,000 bytes).
- HTML uses local relative hashed JavaScript and CSS references and contains no remote dependency.
- `SHA256SUMS.txt` was regenerated and every listed file matched.

## Verification result

- Unit: 30/30.
- Syntax: passed.
- Production build: passed.
- Google Chrome E2E: 9/9, including the six-garden keyboard run.
- Release verification: passed.
