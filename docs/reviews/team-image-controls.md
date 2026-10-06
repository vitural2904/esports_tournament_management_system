# Team image controls

Date: 2026-10-06. Issue: https://github.com/vitural2904/esports_tournament_management_system/issues/17

## Change

Directory team rows now expose an “Ảnh đội” action. Team profiles show logo and cover editors directly to users who can manage the directory. Text editing remains separate. Existing media storage, validation, revision checks and registration snapshots are reused.

## Review

Baseline: `07ba710`. Implementation: `78f0b14`.

- Standards: independent review, zero actionable findings.
- Spec: independent review, zero actionable findings. No new referee UI case; existing API route-permission tests cover that role and profile controls use the shared server permission.

## Validation

- Regression failed before implementation because the directory image action was absent.
- TypeScript and production build passed.
- All 75 API tests passed, including media validation, revisions, snapshots, restart, backup/restore and permissions.
- Full browser suite: all 11 tests passed, including the production HTTPS role flow and a complete tournament.
- Focused browser tests passed at 1280px and 390px: upload logo/cover, preview, reload, replacement, removal and no horizontal overflow.
- Operator controls are visible. Caster controls are absent.
- Mobile screenshot visually checked. Test data uses isolated temporary databases.

## Git state at start

Local `07ba710` was clean and included all current tracked project changes. The only GitHub branch, `codex/team-profiles-media-signals`, was at ancestor `e30cadb`, six commits behind local. No Git remote is configured. This change is committed locally; GitHub code publication and deployment are outside this delivery.
