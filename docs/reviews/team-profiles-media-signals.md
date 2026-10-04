# Team profiles, media and match signals

Completed 2026-10-04. Spec: `docs/specs/team-profiles-media-signals.md`. GitHub spec #10; slices #11, #12 and #13.

## Result

Profile A now uses stored directory and tournament data. Rosters support more than five members, with atomic creation/addition and audited additions after locking. Team logos/covers and player portraits use validated, versioned media. Registration snapshots preserve historical identity. Match signals are shared across the profile, list, calendar, bracket and game screens.

Media and derivatives live in SQLite BLOBs so the existing single-file backup includes them. Removal detaches current references; historical registrations retain their assets.

## Review

Two independent reviews covered Standards and Spec from baseline `1596c3e`. Both have zero open findings after repair `11bc427`.

- Standards: fixed one P2. Saving an image now advances the matching form revision while preserving typed profile text.
- Spec: fixed two P2 findings. Profile signals use the full authorized tournament match set. Reopening a match uses a request nonce so a previously selected different match cannot remain active.

## Evidence

- Final suite: 69 tests passed; zero failures or skipped tests.
- TypeScript and production build passed. Build reports a bundle-size advisory; no build error.
- API tests cover roster revisions, eight members, locked additions, permissions, snapshots, restart, media validation, orientation, concurrent uploads, image reuse and backup/restore.
- Browser QA used a separate temporary database. Verified desktop and 390px mobile profile layouts with eight members, portrait loading and no horizontal overflow.
- Verified card hover border/tint and 1.025 image scale. Reduced-motion handling was inspected in code.
- Verified upload preview. Server upload persistence is covered by API tests.
- Verified an image save preserves typed team text; the following text save succeeds. Existing registration identity stays unchanged.
- Verified match A → match B → profile → match A returns to A.

## Local data

Production database backed up before migration to `data/backups/pre-team-profiles-2026-10-04.sqlite`. Credentials, databases, QA files and backups remain ignored by Git. This delivery remains local; network hosting is outside the spec.
