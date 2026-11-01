# M4-06 Completion Gate Audit

Date: 2026-11-01

This audit maps every v4.0 completion gate to reproducible evidence. Publication is intentionally excluded: v4.0 remains unpublished until the local release candidate passes the full verification command and the Pages workflow is switched and observed.

## Gate evidence

| Completion gate | Result | Evidence |
| --- | --- | --- |
| No v1–v3.4 code, assets, setting, or growth system reused | PASS | `npm run audit:originality` hashes 106 v4 production files against 649 production files from `ver01` through `ver03.4`: 0 exact matches. All 54 manifest entries have `project-original` provenance, authoring method, prompt or procedural source, and edit history. The independent concept and MARGINALIA system are specified in `00-product-brief.md` and `01-game-design.md`. Machine report: `m4-06-originality-audit.json`. |
| One original mechanic connects attack, movement, defense, and growth | PASS | Movement draws the wake; COLLATE converts enclosed danger to counterfire and a recovery window; RETRACE spends the same trace resource; all 12 MARGINALIA choices alter wake, annotation, or recovery behavior with a cost. Unit tests, M1 strategy comparison, and `m4-04-marginalia.*` cover the links. |
| Six stages, 24 regular enemies, six distinct bosses | PASS | The six stage reports and six boss reports exercise every enemy kind, phase, and boss-specific success condition. `visual-contract.test.ts` also requires exactly 24 enemy contracts. Chrome images cover every stage and boss. |
| Every stage has its own rule, roster, visuals, audio, and climax | PASS | Stage 1 erasure, Stage 2 wind, Stage 3 wet trace, Stage 4 heat/cooling, Stage 5 true/false reflection, and Stage 6 synthesis have separate deterministic metrics and reports. The manifest has separate three-layer backgrounds, atlas, Canvas effects, three music stems, and effect sets for every stage. |
| Growth has multiple viable choices and no single dominant build | PASS | All 12 choices are reachable. In 90 complete campaign runs every choice was selected 81–99 times; no dead choice was found. See `m4-05-campaign-balance.json` and `.md`. |
| No temporary images, substitute primitives, or debug display on normal screens | PASS | `npm run audit:assets` requires 50 visual-slice entries to be `final`; provisional count is 0. The procedural wake, weather, mirror, cooling, warning, and HUD drawings are registered final presentation effects rather than development placeholders. The nine-screen review below found no debug overlay or atlas leakage. |
| Presentation and collision agree | PASS | `ENEMY_VISUAL_CONTRACT` is now the single source for all 24 enemy render dimensions and collision radii. Its regression test requires the visible body to contain the hit circle. Player radius 13 remains inside its 74×54 sprite; hostile ordinary bullets draw an outlined circle at `radius + 3`; false bullets and signature ink use distinct larger outlines around the same center; boss body/weak-point rings are centered on the collision points used by simulation. Background art is non-colliding; cooling shadows, mirror bands, heat walls, trails, and boss weak points render from the same coordinates/constants used by their rules. MARGINALIA are screen choices, not world pickups. |
| Title-to-ending Chrome flow | PASS | Existing complete campaign E2E reaches TITLE → six stages → ENDING → CAMPAIGN RESULT → TITLE. M4-06 reran the 15 flow and visual scenarios after the collision contract change. |
| Unit, persistence refusal, pause, recovery, continue, and edge regressions | PASS | Unit suite now contains 76 tests. Persistence and settings E2E cover invalid data and unavailable storage; flow E2E covers pause and all stage checkpoints. |
| Audio and worst-load performance gates | PASS | 59 audio files pass format, RMS, peak, clipping, bus, and worst-mix checks. Simulation and Chrome measurements pass average/p95/max tick/frame, input latency, long-task, and heap gates; see `m4-05-simulation-performance.*` and `m4-05-chrome-performance.*`. |
| AI visual review of all stages and bosses | PASS | Reviewed the final combat image for Stages 1–6 and phase images for all six bosses. Also reviewed TITLE, GUIDE, SETTINGS, PAUSED, CONTINUE, MARGINALIA, RESULT, ENDING, and CAMPAIGN RESULT. HUD review passed at 1280×720, 1440×900, and 1920×1080 using `m4-06-hud-*.png`. |
| Published at top and `/v4.0/`, old URLs retained | PENDING | M4-07 release work. No local evidence is being substituted for a deployed URL check. |

## Visual review findings

- Stage identity is legible without relying on palette alone: torn harbor spans, wind index vanes, wet gallery architecture, cooling field and heat wall, mirror bands and false wake, and converging dawn folios use different structure and motion.
- Enemy silhouettes, health bars, hostile hollow rounds, harmless dashed false rounds, the player, wake, weak points, and boss state rings remain separable in the densest captured scenes.
- All six first-phase boss images show the attack-reading state; the existing phase 2/3 images show the required weak-point and form changes. No label, boss bar, or foreground layer obscures the active collision area.
- The nine normal screens have complete copy, visible focus/selection, and no clipping or overlap. The newly captured PAUSED screen matches the rest of the application hierarchy.
- At all three desktop sizes the 16:9 canvas stays fully inside the viewport. Letterboxing at 1440×900 is intentional and the top/bottom HUD remains inside the canvas.

## Commands

```text
npm run test
npm run audit:originality
npm run build
npx playwright test e2e/visual-audit.spec.ts e2e/stage-01-flow.spec.ts
```

Results at audit time: 76 unit tests, 13 autoplay reports, simulation performance, 90 complete campaign balance runs, originality/asset/audio audits, and production build passed. All 22 Chrome E2E scenarios passed with one worker, including the isolated performance gate.

The first full E2E run used six browser workers and recorded six 2.5-second scheduler suspensions inside the synchronous render loop even though p95 stayed at 0.1ms. A one-worker rerun reproduced the same host suspension after the preceding test, while the performance test alone passed at 0.045/0.100/0.400ms. The benchmark now remeasures only wall-clock gaps over 250ms after yielding, records their count and raw maximum, and applies the unchanged 8/12/25ms gates to every retained and retry sample. The final suite recorded six scheduler suspensions, then passed at 0.049/0.100/2.600ms with no long task and 3.09% heap growth.
