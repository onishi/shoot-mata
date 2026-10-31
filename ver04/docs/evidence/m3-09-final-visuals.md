# M3-09 Stage 3 Final Visuals

Date: 2026-10-31

## Production assets

- `rain-margin-far-v1.png`: 1672×941 opaque far layer
- `rain-margin-mid-v1.png`: 1672×941 transparent middle layer
- `rain-margin-fore-v1.png`: 1672×941 transparent foreground layer
- `stage-03-sprites-v1.png`: 1774×887 transparent atlas for four normal enemies, the LACUNA EEL head, an ordinary segment and a wet-seal segment
- `render.ts`: silver rain, mint wet wake, double-line wet annotation, sequential wet seals and three-layer Stage 3 parallax

All four raster files were produced with built-in image generation from project-original prompts recorded in `game/assets/manifest.json`. No past-version or external-IP asset was used. The source outputs were copied without pixel edits and their alpha channels were preserved.

## Chrome inspection

- `m3-09-stage-03-combat.png`: Drip Scribe, Gutter Frog and Basin Bell retain distinct diamond, spring-legged and open-bowl silhouettes against hollow coral enemy fire; the player, rain and wet trail remain readable over the dark central cloud band.
- `m3-09-stage-03-setpiece.png`: the large Basin Bell and narrow Reed Needle remain distinguishable during the water-gate crossfire; the upper and lower garden structures leave the play corridor open.
- `m3-09-lacuna-eel-phase-1.png`, `phase-2.png`, `phase-3.png`: the long eel head, three body segments, current sequential target and moving rain remain distinguishable in all phases. The wet seal differs from an ordinary segment through a droplet notch, double gold contour and dotted outer ring, not hue alone.
- Wet annotated fire uses a second parallel rail and a diamond droplet marker so its damage role is not conveyed by color alone.
- At 1280×720 there is no text clipping. Foreground gutters and wet leaves remain at the edges and do not cover the player, enemy fire, weak point or lower controls.

## Verification

`npm run verify` passed:

- 39 unit tests
- 6 deterministic autoplay/report tests
- asset audit: 23 required final entries, 0 provisional entries
- audio audit: 23 assets, Stage 2 worst pre-limiter peak -9.77 dBFS
- TypeScript check and production build
- 8 Chrome E2E tests, including the Stage 3 normal battle, water-gate set piece and all three LACUNA EEL phases
