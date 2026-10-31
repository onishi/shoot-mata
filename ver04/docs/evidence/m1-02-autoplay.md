# M1-02 Autoplay Report

- Duration: 21600 ticks (180 seconds)
- Seeds: 404, 501, 598, 695, 792, 889, 986, 1083, 1180, 1277
- Determinism hashes: 682b5bd373fcb29e, 682b5bd373fcb29e, 682b5bd373fcb29e, 682b5bd373fcb29e, 682b5bd373fcb29e

| Pilot | Median effective COLLATE | Median captured | Median damage | Median score | First hauler defeat tick | Haulers defeated |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 0 | 0 | 34.5 | 10000 | 3045 | 2 |
| safe | 16.5 | 19.5 | 43 | 20377 | 21600 | 0 |
| stitch | 13 | 26.5 | 64 | 37582.5 | 2159 | 2 |
| sweep | 11 | 26.5 | 53.5 | 37739.5 | 2271 | 1 |

| Gate | Result |
| --- | --- |
| allCompleted | PASS |
| deterministicFiveRuns | PASS |
| threeEffectiveCollates | PASS |
| mechanicTwentyPercentFaster | PASS |
| safeDamageNoHigherThanSweep | PASS |
| sweepScoreHighest | PASS |
