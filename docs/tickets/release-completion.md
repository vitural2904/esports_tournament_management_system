# #9 — local operations release

Complete. All eight implementation tickets are handled. Local app stores users, sessions, event grants, catalog, registrations, format, schedule, games and audit history in SQLite. It supports the agreed LoL workflow, one-time format locking, standings/ties, DE/reset, result correction, forfeits and roster additions.

Final validation: 44 passing tests and production build/typecheck. Two separate members operated the eight-team preset through 24 group matches and 15 DE matches with reset, 58 confirmed games and a champion. Two restarts preserved outcomes and actors. Live backup/restore, legacy migration, unsupported versions, revisions, role isolation and rollback checked. Desktop/phone browser QA checked controls, readable input, focus, static mobile background and history.

Independent Standards and Spec reviews passed. P3 duplicated recovery code was repaired and rechecked. All earlier review findings resolved. [Final report](../reviews/release.md).

Run `npm run dev:local`, then open `http://127.0.0.1:5173/?app=operations`. First real admin is created by the user with their own password. No default credentials. Existing real database was backed up before migration; QA data remains isolated. README covers roles, operations, backup and restore. No public deployment.

Completed children: #2 identity, #3 directory, #4 format/grants, #5 game operations, #6 progression, #7 corrections, #8 rosters, #9 verification/handover.

Commits for release slice: `ddb1260`, `ec800dd`, plus final unsupported-schema test and this verification record.
