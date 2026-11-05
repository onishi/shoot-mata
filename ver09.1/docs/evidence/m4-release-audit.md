# v9.1 release audit

Date: 2026-11-05

## Automated checks

- Model and persistence: 24/24 Node tests passed, including the frozen briefing phase and wall-aware warden intent.
- Syntax: all three source modules passed `node --check`.
- Production build: Vite completed; JavaScript was 25.35 kB (9.46 kB gzip) and CSS was 0.53 kB (0.36 kB gzip).
- Google Chrome: 9/9 Playwright scenarios passed, including the save-free six-room playthrough.
- Layout: the complete 16:9 canvas remained inside 1280×720 and 640×800 viewports.
- Accessibility: Tab moved focus to the canvas; Enter, Space, movement, pause, and settings remained keyboard complete. The accessible name changed with phase, lamp state, pursuer, seeds, embers, and oil. The live region announced collection.
- Performance: 110 steady-state animation-frame intervals were sampled during bright-lamp rendering: 16.67 ms average and 16.80 ms p95. The audit requires an average below 35 ms and p95 below 50 ms.
- Release: the six-file `candlewick-v9.1` static package passed required-file, hashed-asset, title, and 500 kB budget checks at 27,510 bytes.

## Visual inspection

Inspected `v9.1-room-briefing.png`, `v9.1-prism-briefing.png`, `v9.1-finale-briefing.png`, `m1-bright-reveal.png`, `m4-title-1280x720.png`, `m4-paused-1280x720.png`, `m4-title-640x800.png`, and `m4-paused-640x800.png`. The briefing cards, state coach, full canvas, title, room HUD, pause overlay, and controls remain present without clipping or overlap. The narrow viewport intentionally letterboxes above and below to preserve the authored 16:9 composition.

## Limits

External first-time player comprehension, a physical screen reader, real speakers, and low-performance hardware remain unmeasured. These are not represented as passed.
