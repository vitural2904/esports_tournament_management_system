# Local release review (#9)

Fixed point: `c6ac562`. Release changes: `ddb1260`. Review repairs: `ec800dd`.

## Standards

Independent review: no hard standard breaches, glossary/ADR conflicts, or P1/P2 findings. One P3 possible duplicated-code smell: backup and restore repeated integrity checks, exclusive destination reservation and SQLite copying. Extracted `scripts/database-copy.mjs`. Recheck: Standards pass, P3 resolved; no new P1/P2.

Additional self-check: distinct sibling keys for grants/registration fixed a React identity warning observed during QA. Account provisioning now reports confirmed creation before refreshing accounts, so a failed refresh does not imply the account was never created.

## Spec

Independent review: no actionable missing, wrong, or unrequested behavior. Atomic migration, legacy repair, unsupported-version refusal, WAL-aware backup, restoration into a new path with session revocation, and source-disjoint locking match the documented local scope. Integrated two-member operation reaches a champion and survives restart. Earlier independent reviews cover rights, revisions, results, progression, corrections and registration additions. Recheck of final repairs: Spec pass; no regressions.

Standards: 1 finding, worst P3, resolved. Spec: 0 findings.

## Final validation

- 44 passing public HTTP/domain/CLI tests; production build and typecheck pass.
- Eight-team preset: 24 group matches; 15 DE matches with reset; 58 confirmed games. Entry member submits; different operator confirms. Every non-champion has two DE losses; upper champion has one loss after reset. Two restarts retain exact matches, game actors, champion and standings.
- Positive upgrade from historical v1/v2 startup markers preserves accounts and catalog. Newer schema is rejected before an API is exposed. Migration is version-gated and transactional.
- Live SQLite backup includes WAL data. Restore retains tournaments, rejects overwrite, requires new login, and leaves the original database/session usable. Source and destination paths used in automated tests are owned temporary fixtures.
- Desktop/390 px browser QA: result entry/correction/forfeit, roster approval/history and entry-only access. Keyboard focus is a 2 px coral outline. Phone document width 375 px, no page overflow; background reports `still`. Reduced-motion behavior was audited in MotionConfig, AmbientWaves, AutoAnimate and CSS; browser API does not expose reduced-motion emulation.
- QA data lives in an ignored isolated database. Real database was backed up before v8 migration. One-command normal runtime restarted successfully; browser shows first-administrator setup. No default account or real password was created.

## Limits

Loopback local pilot. No public hosting or cross-device network access. Phone checks use browser viewport. Node 22.19's built-in SQLite is experimental. Draft input is browser-local until saved; closing/signing out discards unsaved input. Restored passwords are those from backup time. These limits are in README and the accepted spec.
