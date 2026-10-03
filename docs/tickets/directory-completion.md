Implemented persisted team/player catalogs and per-tournament registration snapshots. UI supports creating and editing records, creating a draft tournament and registering teams/players. API rejects unauthorized access, invalid names/IDs, duplicate identities, duplicate player assignments and stale revisions. Historical registration names survive catalog edits and server restarts.

Validation: nine API tests and production build pass. Browser verified create/edit/register/reload, preservation of an unsaved roster during unrelated catalog edits, and mobile 390px layout without overflow. Independent Standards and Spec reviews identified draft loss and missing archive coverage; both resolved. Details: `docs/reviews/directory.md`.

Draft tournament creation is included here so registrations are usable before the builder slice. Format construction, grants and one-time locking follow in #4.
