# #8 — locked registrations and additions

Complete. Locked registrations cannot be edited directly. Event operators approve additions with a reason. Approval and history commit together. Old team/player snapshots and existing game lineups remain intact. Approved players can enter later game lineups.

UI shows locked rosters, filters already registered players, protects stale drafts, preserves input when switching teams, and separates registration history from result history. Entry members can read history but cannot approve.

Validation: 39 passing HTTP/domain tests; typecheck/build pass; desktop/phone browser workflow and entry-only UI checked with isolated QA data. Independent Standards and Spec reviews completed. One draft-loss finding fixed and rechecked. See [review](../reviews/rosters.md).

Commits: `b27832d`, `1dc23a3`.
