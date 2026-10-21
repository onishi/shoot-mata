# CORE-BLUE generation prompt

- Tool: OpenAI built-in image generation
- Date: 2026-10-21
- Use case: `stylized-concept`
- References:
  - `../../concept/stage-01-orbital-wreck-benchmark-v1.png` (palette, material, and game-world reference)
  - `../player/player-interceptor-v1.png` (finish quality and detail-density reference only)

```text
Asset type: production-ready isolated collectible sprite for an original browser horizontal-scrolling shooter

Primary request: create exactly one isolated BLUE reactor core collectible with a genuinely transparent background.

Subject: a compact glowing energy module whose unmistakable outer silhouette is a perfect circle with a thick segmented industrial frame. The face contains one large, simple, high-contrast plus sign "+", made from equal-length vertical and horizontal inset luminous channels, centered and legible without relying on blue color. Surround the energy center with a worn off-white and charcoal mechanical ring, four small cardinal clamps, and restrained blue emission.

Style/medium: polished hand-painted 2D game sprite, crisp silhouette, restrained hard-surface detail, original 1990s arcade-inspired industrial science fiction.

Composition/framing: straight-on orthographic game icon view, centered, full object visible, generous transparent padding, no perspective tilt that weakens the circular outline, no cropping.

Lighting/mood: bright blue internal glow with neutral pale rim light; keep the metal outline readable in grayscale.

Color palette: electric blue energy, off-white ceramic, charcoal and gunmetal frame.

Constraints: actual alpha transparency; exactly one collectible; circular outer silhouette; exactly one centered plus sign "+"; symbol must remain readable at 48x48 display size; no other letters or marks; no text label; no logo; no watermark; no UI; no stars; no debris; no shadow plane; no extra objects.

Avoid: diamond or triangular outer silhouette, vertical I symbol, concentric-circle symbol, flat geometric placeholder look, excessive bloom that erases edges, background rectangle, checkerboard baked into pixels, recognizable franchise design.
```

The generated source was copied without alpha-destructive conversion. It remains `final`, not `verified`, until it is rendered in the representative game scene and the release-time rights review is complete.
