# ENEMY-STG01-01 generation prompt

- Tool: OpenAI built-in image generation
- Date: 2026-10-21
- Use case: `stylized-concept`
- References:
  - `../../../concept/stage-01-orbital-wreck-benchmark-v1.png` (style, palette, material, and hostile-drone design reference only)
  - `../../player/player-interceptor-v1.png` (finish quality and detail-density reference only)

```text
Asset type: production-ready isolated 2D raster enemy sprite for an original browser horizontal-scrolling shooter

Primary request: create exactly one isolated Stage 1 salvage collector drone, traveling from right to left, with a genuinely transparent background.

Subject: an original compact hostile drone built around a round armored central body with a short cylindrical salvage mechanism. It has exactly one large circular orange-red sensor eye facing left. Four short asymmetric clamp fins and exposed dark mechanisms make a strong circular/radial silhouette. A small engine at the rear emits a short orange exhaust pointing right, clearly communicating leftward travel. Use worn charcoal and off-white painted metal with restrained hazard-orange markings. It must look like an autonomous machine that cuts and collects derelict spacecraft material.

Style/medium: polished hand-painted 2D game art, crisp readable silhouette, restrained high-frequency industrial detail, matching the benchmark's original 1990s arcade-inspired hard-surface aesthetic.

Composition/framing: orthographic side/three-quarter game view, centered, complete drone visible, sensor eye facing exactly left, generous transparent padding, no cropping, no background, no ground shadow.

Lighting/mood: hostile orange-red internal light with a restrained cold navy rim.

Color palette: charcoal, gunmetal, worn off-white armor, hazard orange-red eye and accents.

Materials/textures: scorched ceramic armor, worn painted metal, exposed joints and salvage clamps.

Constraints: actual alpha transparency; exactly one enemy drone; exactly one dominant orange-red circular eye; circular/radial silhouette legible at 96x96 display size; exhaust attached closely and pointing right; no text; no logo; no watermark; no UI; no stars; no debris; no projectiles; no extra objects.

Avoid: player-like triangular forward silhouette, wings shaped like the player craft, three cyan reactor cells, cyan as a dominant color, flat geometric placeholder look, photorealistic model photo, top-down view, right-facing eye, background rectangle, checkerboard baked into pixels, excessive bloom, long exhaust trail, recognizable designs from existing franchises.
```

The generated source was copied without alpha-destructive conversion. It remains `final`, not `verified`, until it is rendered in the representative game scene and the release-time rights review is complete.
