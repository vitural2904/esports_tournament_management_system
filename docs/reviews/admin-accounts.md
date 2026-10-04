# Quản trị tài khoản — kiểm chứng

Spec: `docs/specs/admin-accounts.md`. Fixed point: `85f6e408e5b8e0a82a178bca4b5b1564ab790a1a`.

- HTTP integration suite: 54/54 pass after review repairs. Build/typecheck pass. Account UI loads as a separate 11.48 KB JS chunk, main bundle 493.67 KB.
- 5 role matrix tests: 11 protected reads + 20 writes per role; anonymous 401, forbidden 403, permitted invalid writes 400/409. Successful semantic writes covered by account/result/roster/correction/directory/format tests.
- Actual pilot accounts: 175 route checks on a disposable copy of the pilot DB. No live tournament result mutation. Details in ignored `.local/pilot-route-report.json`; no credentials/cookies in report.
- Pilot DB was empty. Provisioned one administrator and four test members via local API. Created an editable Community Cup 2026 with 8 teams/40 demo players; retained static sample page. An Nguyễn was a hardcoded sample persona; removed it, no real account deleted.
- Account mutation history has before/after metadata, actor, action and time. Passwords/hashes/tokens are excluded. Existing result/history references stay intact.
- Migration v9 adds account revisions, disabled state and account history. Existing migration/backup tests pass. Pre-change backup is ignored `data/backups/pre-account-admin-2026-10-04.sqlite`.

## Standards

Independent review: no hard standard violations. Stale grant draft revision upgrade (P2) repaired; unrelated actions preserve the original grant base. Duplicate ready-admin safeguard (P3, judgment) extracted into `requireReplacement`. Re-review: Standards pass; no remaining actionable findings.

## Spec

Independent review identified three defects: stale grant rebase (P1), incomplete filters (P2), stale password audit before image during concurrent name change (P2). All repaired. Re-review: all findings resolved; no remaining actionable spec defects.

## Browser and live checks

- Real admin login accepted with the requested casing. Table shows all five accounts and correct tournament roles. Role filter shows admin + entry + combined member, excludes operator-only/unassigned.
- Disposable UI copy: edit grant draft; concurrent API grant change; save unrelated name edit; save old grant draft. Correctly shows `Quyền vừa thay đổi. Tải lại trước khi sửa.` No overwrite.
- Phone viewport 390px: document width 375px; table region ~301px with internal scroll width 650px. Header wraps; fields remain inside viewport. Desktop verified by screenshot/DOM. Browser viewport reset after QA.
- Live API after final restart: all five actual credentials login; role-based tournament visibility and admin-only account listing correct; logout invalidates its session. Community Cup remains draft with eight registrations.
- Temporary QA API/Vite stopped. Normal local runtime remains on 3001/5173. No public deployment.

Final findings: Standards 0 open (2 repaired); Spec 0 open (3 repaired).
