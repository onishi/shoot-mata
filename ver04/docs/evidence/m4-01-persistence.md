# M4-01 Campaign persistence evidence

Date: 2026-11-01

## Implemented contract

- v4-only key: `palimpsest-wake:v4.0:save`
- schema version 1 and build version `v4.0`
- FNV-1a checksum over the complete save body
- temporary write, read-back validation, then committed-key update
- stage-entry and boss-gate checkpoint persistence for all six stages
- TITLE `C  CONTINUE SAVE` resume path
- corrupt or unknown documents moved to a timestamped quarantine key
- quota/security failures leave the active campaign in memory and show one non-blocking warning
- completed campaigns clear the resumable checkpoint

The payload records stage, checkpoint, health, gauge, marginalia, score, seed, remaining revision, campaign summary, and the deterministic checkpoint state. Older-version keys are neither read nor removed.

## Verification

- Unit: 60 passed, including normal round-trip, boss checkpoint restoration, quarantine, rejected writes, and v3.4 key isolation.
- Autoplay: 12 passed across six stages and six bosses.
- Asset audit: 50 required final entries, 0 provisional.
- Audio audit: 59 assets; worst pre-limiter peak -9.92 dBFS.
- Chrome E2E: 17 passed, including save/reload/continue, corrupt-data quarantine, old-key isolation, SecurityError warning, and same-session progress after rejection.
- Production build and TypeScript checks passed.

## Visual review

- `m4-01-title-save.png`: NEW VOYAGE, CONTINUE SAVE, and GUIDE remain distinct and centered without clipping.
- `m4-01-save-unavailable.png`: the warning remains readable below the stage-intro actions without covering the chapter title or departure controls.
