# Quản trị tài khoản — kiểm chứng

Spec: `docs/specs/admin-accounts.md`. Fixed point: `85f6e408e5b8e0a82a178bca4b5b1564ab790a1a`.

- HTTP integration suite: 53/53 pass. Build/typecheck pass.
- 5 role matrix tests: 11 protected reads + 20 writes per role; anonymous 401, forbidden 403, permitted invalid writes 400/409. Successful semantic writes covered by account/result/roster/correction/directory/format tests.
- Actual pilot accounts: 175 route checks on a disposable copy of the pilot DB. No live tournament result mutation. Details in ignored `.local/pilot-route-report.json`; no credentials/cookies in report.
- Pilot DB was empty. Provisioned one administrator and four test members via local API. Created an editable Community Cup 2026 with 8 teams/40 demo players; retained static sample page. An Nguyễn was a hardcoded sample persona; removed it, no real account deleted.
- Account mutation history has before/after metadata, actor, action and time. Passwords/hashes/tokens are excluded. Existing result/history references stay intact.
- Migration v9 adds account revisions, disabled state and account history. Existing migration/backup tests pass. Pre-change backup is ignored `data/backups/pre-account-admin-2026-10-04.sqlite`.

Independent Standards and Spec reviews pending. Browser verification pending.
