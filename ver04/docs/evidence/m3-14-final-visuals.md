# M3-14 Stage 4 Final Visuals

Date: 2026-11-01

## Production assets

- `burnt-footnote-far-v1.png`: 1672×941 opaque far layer
- `burnt-footnote-mid-v1.png`: 1672×941 transparent middle layer
- `burnt-footnote-fore-v1.png`: 1672×941 transparent foreground layer
- `stage-04-sprites-v2.png`: 1536×1024 transparent atlas for four normal enemies, CINDER ADVOCATE, heat wall, ember and cooled countershot
- `render.ts`: heat distortion, moving cooling shadow, cooled wake, atlas-backed interactions and three-layer Stage 4 parallax

All raster files were produced with built-in image generation from project-original prompts recorded in `game/assets/manifest.json`. No past-version or external-IP asset was used. A background-extraction pass removed the atlas backdrop while preserving the isolated sprites and alpha glow.

## Chrome inspection

- `m3-14-stage-04-combat.png`: Ash Comma, Kiln Censor and Ember Courier retain curled, rooted-square and cyan-core diamond silhouettes; hollow coral enemy fire remains distinct from all three.
- `m3-14-stage-04-setpiece.png`: the two-platen Char Press is visibly larger than normal enemies, while the moving cyan cooling shadow leaves its collision body and health line readable.
- `m3-14-cinder-advocate-phase-1.png`, `phase-2.png`, `phase-3.png`: the tall asymmetric boss, diagonal-slashed permanent heat wall, hollow ember, cyan double-outline countershot and final verdict fan remain distinguishable across all phases.
- The heat wall uses a continuous filled core and diagonal slashes; the cooled countershot uses a sharp double diamond. Their gameplay roles do not rely on hue alone.
- At 1280×720 there is no text clipping. Foreground rails and burnt paper remain at the edges and do not cover the player, enemy fire, cooling target, boss or lower controls.

## Verification

`npm run verify` passed:

- 45 unit tests
- 8 deterministic autoplay/report tests
- asset audit: 32 required final entries, 0 provisional entries
- audio audit: 32 assets, Stage 3 worst pre-limiter peak -10.08 dBFS
- TypeScript check and production build
- 10 Chrome E2E tests, including the Stage 4 normal battle, cooling-shadow set piece and all three CINDER ADVOCATE phases
