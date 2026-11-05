# M1 core loop evidence

## Automated checks

- Model tests: 9/9 passed.
- Syntax checks: `model.js` and `main.js` passed.
- Production build: passed; JS 11.32 kB, CSS 0.82 kB before final label-only adjustment.
- Google Chrome E2E: 3/3 passed.
- Console errors and warnings from the game: 0.

## Browser routes

- A real-key two-lap route changed GRAFT to BELL, CROWN to RETURN, then FORK to RAIN and CROWN to RECEIVER. It opened all three flowers and won in 22 beats.
- The untouched initial route entered BLIGHT, lost one life, reset blooms and the signal, and accepted R for an immediate fresh run.
- Escape held the signal at the same node for longer than one 800ms beat, then resumed.

## Visual review

- `m1-title.png`: title, premise, three controls, goal, and start prompt are readable without collision.
- `m1-two-flowers-return.png`: selected CROWN, active return branch, two open flowers, closed rain flower, signal, lives, and HUD are distinguishable.
- `m1-won.png`: final overlay has no clipped text and retains the completed garden as context.
- `m1-strike-reset.png`: lost life, reset flower count, selected FORK, active Moon branch, and signal restart are visible together.

The first visual pass exposed an internal `RETURNA` label in the HUD. The final implementation maps internal node IDs to player-facing names such as `RETURN ROOT`.
