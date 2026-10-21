# PLAYER-01 generation prompt

- Tool: OpenAI built-in image generation
- Date: 2026-10-21
- Use case: `stylized-concept`
- Reference: `../../concept/stage-01-orbital-wreck-benchmark-v1.png` (style, palette, material, and ship-design reference only)

```text
Asset type: production-ready 2D raster game sprite for a browser horizontal-scrolling shooter

Primary request: create one isolated player spacecraft sprite, facing exactly right, with a genuinely transparent background.

Subject: a compact original interceptor with a sharp forward-pointing triangular silhouette, layered white and charcoal painted-metal armor, subtle red edge markings, exposed mechanical seams, and exactly three clearly separated cyan reactor cells across the rear body. The three cells must remain legible at small game scale. Add short cyan engine glow attached closely to the exhausts, but no long trail.

Style/medium: polished hand-painted 2D game art with crisp silhouette and restrained high-frequency detail, matching the benchmark's 1990s arcade-inspired industrial space aesthetic while remaining original.

Composition/framing: orthographic side/three-quarter game view, centered, full craft visible, nose pointing right, generous transparent padding, no cropping, no perspective background, no ground shadow.

Lighting/mood: cool cyan internal light with a restrained warm rim from orbital wreckage.

Color palette: off-white, gunmetal, charcoal, small red accents, cyan reactor glow.

Materials/textures: painted metal, scorched ceramic, exposed dark mechanisms.

Constraints: actual alpha transparency; exactly one ship; exactly three cyan reactor cells; strong readable silhouette at 160x96 display size; no text; no logo; no watermark; no UI; no stars; no debris; no weapon fire; no extra objects.

Avoid: flat geometric placeholder look, photorealistic model photo, top-down view, left-facing craft, background rectangle, checkerboard baked into pixels, excessive bloom, long exhaust trail, recognizable designs from existing franchises.
```

The generated source was copied without alpha-destructive conversion. It remains `final`, not `verified`, until it is rendered in the representative game scene and the release-time rights review is complete.
