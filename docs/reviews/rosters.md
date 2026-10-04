# Review: locked roster additions (#8)

Fixed point: `95a49f2`. Implementation: `b27832d`; repair: `1dc23a3`.

## Standards

Independent reviewer: no hard standard breaches or material smell findings. One P2: selecting the current team or another team erased the unfinished approval. Fixed with same-team no-op and per-team draft storage, retaining the original registration revision. Explicit reload remains the discard path. Recheck: pass; no new P1/P2.

## Spec

Independent reviewer: no clear missing requirements, incorrect behavior, or scope creep. Operator checks, revision validation, atomic approval/history, roster snapshots and substitutions match the accepted spec.

Standards: 1 finding, worst P2, resolved. Spec: 0 findings.

## Validation

- Public HTTP tests use isolated SQLite files: approval, ordinary-edit rejection after lock, substitution, stale/replayed requests, role checks, missing/duplicate/archived/already-assigned players, unchanged earlier games and other seasons, current details for the new player, restart persistence.
- Full suite: 39 passing tests. Typecheck and production build passed.
- Browser: existing QA account and isolated database. Added a reserve, chose a locked team, checked the reserve and entered a reason. Same-team selection and switching away/back retained both. Phone viewport 390 px: document 375 px, form 301 px; no page overflow. Approval showed a success notice, six-player roster and an audit entry with actor/reason.
- Entry-only QA member has zero approval buttons, can read history. HTTP rejects approval by entry and outsiders; non-admin event operator can approve.
- User database and credentials were not used for fixture writes.
