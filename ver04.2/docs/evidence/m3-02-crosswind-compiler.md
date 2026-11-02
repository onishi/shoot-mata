# M3-02 CROSSWIND COMPILER Report

- Baseline defeat: 11367 ticks
- Stitch defeat: 3618 ticks
- Phase 1 / 2 / 3 durations: 1022 / 1154 / 1442 ticks
- Wind locks / locked ticks: 3 / 1424
- Weakpoint hits: 73
- Gust / lance / storm attacks: 6 / 9 / 6
- Gust / lance / storm damage: 2 / 0 / 0
- Max enemy bullets: 31
- Stitch / replay hashes: 4658442c7d7ab61c, 4658442c7d7ab61c

| Gate | Result |
| --- | --- |
| baselineDefeatsBoss | PASS |
| stitchDefeatsBoss | PASS |
| stitchAtLeastTwentyPercentFaster | PASS |
| allPhasesReached | PASS |
| pacedThirtyToSixtySeconds | PASS |
| everyPhaseAtLeastEightSeconds | PASS |
| vaneLockedInEveryPhase | PASS |
| exposedSeamHit | PASS |
| fallbackBodyRouteMeasured | PASS |
| allAttacksEmitted | PASS |
| attackDamageMeasured | PASS |
| bulletLimit | PASS |
| deterministicReplay | PASS |
