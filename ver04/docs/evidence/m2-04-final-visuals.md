# M2-04 Stage 1 Final Visual Evidence

## Production assets

- `erased-harbor-far-v1.png`: 1672×941 opaque far harbor.
- `erased-harbor-mid-v1.png`: 1983×793 transparent stitched-pier middle layer.
- `erased-harbor-fore-v1.png`: 1983×793 transparent torn-pier and binding-cable foreground.
- `stage-01-sprites-v1.png`: 1774×887 transparent atlas for TRACE SKIFF, four normal enemies, BLANK BAILIFF and returned fire.
- `stage-01-canvas-effects-v1`: three-layer wake, scanned loop candidate, double-ring hostile fire, return shard and boss telegraph compositing.

All five entries are `final`, `project-original` and registered in `game/assets/manifest.json`. The raster set was created with the built-in image generation workflow; the final normalized prompt for every output is preserved in the manifest. No v1–v3 asset or external IP reference was used. The original generated pixels and alpha were retained; runtime frame rectangles are defined in `game/src/render/visual-assets.ts`.

## Runtime integration

- Far, middle and foreground layers drift at different rates. Foreground is composited before the marginal HUD so controls and score remain unobstructed.
- Collision state remains simulation-owned. Sprite centers and displayed extents are anchored to the existing collision centers; the art does not create a second gameplay hitbox.
- The atlas retains role silhouettes: the Mite hook, Gull bracket, Skiff point, Hauler mass and rear amber binding, and Bailiff fan.
- Armor removal adds a cyan pulsing exposure ring without changing the boss collision center.
- Assets load relative to Vite's base path so the same build remains valid at the future top and `/v4.0/` locations.

## Automated evidence

- Unit tests: 26 passed.
- Stage 1 and BLANK BAILIFF autoplay reports: 2 passed with unchanged deterministic simulation results.
- Asset audit: 5 required entries exist, all are final, project-original and backed by files.
- TypeScript and production build: passed.
- Chrome E2E: 2 passed, including asset decode and fixed visual scenarios.

## Visual review

Reviewed at 1280×720 in Chrome:

- `m2-04-combat.png`: TRACE SKIFF, cyan three-layer wake, a normal enemy, player fire and marginal HUD remain distinct over the harbor.
- `m2-04-setpiece.png`: all four enemy silhouettes are separable; the Folio Hauler's amber rear binding is visible; hollow coral enemy fire remains legible over both ivory structures and dark cloud.
- `m2-04-boss-phase-1.png`: the Bailiff fan, three written-seal ribs, warning sector and boss meter are readable without obscuring the player.
- `m2-04-boss-phase-3.png`: the cyan exposed-core ring is distinct from coral danger and the cyan player wake by shape, scale and placement.

No text clipping, opaque foreground obstruction, simple character placeholder, or hitbox-scale mismatch was found. Background detail is intentionally dense at the edges but the central combat band remains dark enough for warm hollow hazards and the cyan wake.
