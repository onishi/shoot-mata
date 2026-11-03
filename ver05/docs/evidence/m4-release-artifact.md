# M4 Release Artifact Audit

Date: 2026-11-03

## Artifact

- Current routes: `/`, `/v5/`
- Preserved routes: `/v4.2/`, `/v4.1/`, `/v4.0/`, `/v3.4/`, `/v3.3/`, `/v3.2/`, `/v3.1/`, `/v3/`
- v5 production payload: 35,677 bytes
- Payload budget: below 1 MB
- Runtime dependencies: none
- External runtime URLs: none
- External production assets: none; `THIRD_PARTY_NOTICES.md` is included at both current routes

## Cache-free Chrome

Google Chrome opened `/` and `/v5/` in separate contexts with the HTTP cache
disabled and service workers blocked. Each context started with a deliberately
invalid schema-version 0 save containing out-of-range room and setting values.

- Both documents returned HTTP 200 and identified `CHORUS SHIFT — v5.0`.
- Both saves fell back to room 1 and reached `playing` through keyboard input.
- External requests: 0
- Failed requests: 0
- Console errors: 0
- Page errors: 0

## Regression

- Unit: 43/43
- Typecheck: pass
- Production build: pass
- Google Chrome product E2E: 4/4
- Google Chrome release E2E: 1/1
- Twelve-room keyboard route: 282 nominal actions in 5,371.4 ms
- Dense-frame sample: 119 frames, p95 16.70 ms, over 34 ms 0%

The Pages workflow rebuilds preserved versions from locked dependency trees,
assembles this artifact, reruns its static and Chrome checks, and verifies all
ten live routes, release commit metadata, and JavaScript/CSS MIME types after
deployment. Publication itself remains pending because the local main branch
already contains an unpublished commit series.
